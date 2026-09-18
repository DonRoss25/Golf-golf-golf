import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeUserSelect } from "@/lib/userSelect";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const round = await prisma.round.findUnique({
    where: { id: params.id },
    include: {
      course: true,
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
      players: {
        include: { user: { select: safeUserSelect }, holeScores: { include: { hole: true } } },
      },
      skins: true,
      closestToPins: { include: { user: { select: safeUserSelect } } },
    },
  });
  if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(round);
}
