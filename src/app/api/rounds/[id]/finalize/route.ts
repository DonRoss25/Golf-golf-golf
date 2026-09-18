import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSkins } from "@/lib/skins";
import { adjustedGrossScore, scoreDifferential, calculateHandicapIndex } from "@/lib/handicap";

// Recomputes skins for every hole and refreshes each player's handicap
// index from their full round history (including this round). Safe to
// call multiple times — it's idempotent.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const round = await prisma.round.findUnique({
    where: { id: params.id },
    include: {
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
      players: { include: { holeScores: { include: { hole: true } } } },
    },
  });
  if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ---- Skins ----
  const skinHoles = round.tee.holes.map((hole) => ({
    holeNumber: hole.number,
    par: hole.par,
    entries: round.players
      .map((p) => {
        const hs = p.holeScores.find((s) => s.holeId === hole.id);
        return hs ? { userId: p.userId, strokes: hs.strokes } : null;
      })
      .filter((e): e is { userId: string; strokes: number } => e !== null),
  }));
  const skinResults = calculateSkins(skinHoles);

  await prisma.$transaction(
    skinResults.map((r) =>
      prisma.skin.upsert({
        where: { roundId_holeNumber: { roundId: round.id, holeNumber: r.holeNumber } },
        update: {
          winnerUserId: r.winnerUserId,
          scoreToPar: r.scoreToPar,
          carriedOver: r.carriedOver,
          value: r.value,
        },
        create: {
          roundId: round.id,
          holeNumber: r.holeNumber,
          winnerUserId: r.winnerUserId,
          scoreToPar: r.scoreToPar,
          carriedOver: r.carriedOver,
          value: r.value,
        },
      }),
    ),
  );

  // ---- Handicap update (only for players who completed all 18 holes) ----
  for (const player of round.players) {
    if (player.holeScores.length < round.tee.holes.length) continue;

    const ch = player.courseHandicap ?? 0;
    const ags = adjustedGrossScore(
      player.holeScores.map((s) => ({ strokes: s.strokes, hole: { par: s.hole.par, strokeIndex: s.hole.strokeIndex } })),
      ch,
    );
    const differential = scoreDifferential(ags, round.tee.courseRating, round.tee.slopeRating);

    // HandicapRecord.index stores this round's score differential; the
    // rolling HandicapIndexSnapshot below is the actual published index.
    await prisma.handicapRecord.create({
      data: { userId: player.userId, index: differential, source: "CALCULATED" },
    });

    const history = await prisma.handicapRecord.findMany({
      where: { userId: player.userId, source: "CALCULATED" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const newIndex = calculateHandicapIndex(history.map((h) => h.index));
    if (newIndex != null) {
      await prisma.handicapIndexSnapshot.upsert({
        where: { userId: player.userId },
        update: { index: newIndex, source: "CALCULATED", roundsUsed: history.length },
        create: { userId: player.userId, index: newIndex, source: "CALCULATED", roundsUsed: history.length },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
