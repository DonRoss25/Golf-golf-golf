import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { courseHandicap } from "@/lib/handicap";
import { safeUserSelect } from "@/lib/userSelect";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rounds = await prisma.round.findMany({
    where: { players: { some: { userId } } },
    include: { course: true, tee: true, players: { include: { user: { select: safeUserSelect } } } },
    orderBy: { playedAt: "desc" },
  });
  return NextResponse.json(rounds);
}

const playerSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({ guestName: z.string().min(1).max(60) }),
]);

const createSchema = z.object({
  courseId: z.string().min(1),
  teeId: z.string().min(1),
  playedAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  players: z.array(playerSchema).min(1).max(8),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const tee = await prisma.tee.findUnique({ where: { id: data.teeId } });
  if (!tee || tee.courseId !== data.courseId) {
    return NextResponse.json({ error: "Tee does not match course" }, { status: 400 });
  }

  const resolvedPlayerIds: string[] = [];
  for (const p of data.players) {
    if ("userId" in p) {
      resolvedPlayerIds.push(p.userId);
    } else {
      const guest = await prisma.user.create({
        data: {
          name: p.guestName,
          email: `guest-${randomBytes(6).toString("hex")}@guests.golfgolfgolf.local`,
          passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 4),
          isGuest: true,
        },
      });
      resolvedPlayerIds.push(guest.id);
    }
  }
  if (!resolvedPlayerIds.includes(userId)) resolvedPlayerIds.unshift(userId);

  const snapshots = await prisma.handicapIndexSnapshot.findMany({
    where: { userId: { in: resolvedPlayerIds } },
  });
  const snapshotByUser = new Map(snapshots.map((s) => [s.userId, s.index]));

  const round = await prisma.round.create({
    data: {
      courseId: data.courseId,
      teeId: data.teeId,
      playedAt: data.playedAt ? new Date(data.playedAt) : new Date(),
      notes: data.notes,
      createdById: userId,
      players: {
        create: resolvedPlayerIds.map((pid) => {
          const index = snapshotByUser.get(pid) ?? null;
          return {
            userId: pid,
            handicapIndex: index,
            courseHandicap:
              index != null ? courseHandicap(index, tee.slopeRating, tee.courseRating, tee.parTotal) : null,
          };
        }),
      },
    },
    include: { players: { include: { user: { select: safeUserSelect } } }, course: true, tee: true },
  });

  return NextResponse.json(round, { status: 201 });
}
