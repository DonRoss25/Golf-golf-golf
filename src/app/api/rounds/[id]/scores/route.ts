import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const scoreEntrySchema = z.object({
  roundPlayerId: z.string().min(1),
  holeId: z.string().min(1),
  strokes: z.number().int().min(1).max(20),
  putts: z.number().int().min(0).max(10).optional().nullable(),
  fairwayHit: z.boolean().optional().nullable(),
  greenInReg: z.boolean().optional().nullable(),
});

const bodySchema = z.object({ scores: z.array(scoreEntrySchema).min(1) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const roundPlayers = await prisma.roundPlayer.findMany({
    where: { roundId: params.id },
    select: { id: true },
  });
  const validPlayerIds = new Set(roundPlayers.map((p) => p.id));

  const ops = parsed.data.scores
    .filter((s) => validPlayerIds.has(s.roundPlayerId))
    .map((s) =>
      prisma.holeScore.upsert({
        where: { roundPlayerId_holeId: { roundPlayerId: s.roundPlayerId, holeId: s.holeId } },
        update: { strokes: s.strokes, putts: s.putts ?? undefined, fairwayHit: s.fairwayHit ?? undefined, greenInReg: s.greenInReg ?? undefined },
        create: {
          roundPlayerId: s.roundPlayerId,
          holeId: s.holeId,
          strokes: s.strokes,
          putts: s.putts ?? undefined,
          fairwayHit: s.fairwayHit ?? undefined,
          greenInReg: s.greenInReg ?? undefined,
        },
      }),
    );

  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true, updated: ops.length });
}
