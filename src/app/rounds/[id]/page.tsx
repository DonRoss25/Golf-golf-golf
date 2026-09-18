import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { safeUserSelect } from "@/lib/userSelect";
import { RoundScorecard } from "@/components/RoundScorecard";

export const dynamic = "force-dynamic";

export default async function RoundPage({ params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const round = await prisma.round.findUnique({
    where: { id: params.id },
    include: {
      course: true,
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
      players: { include: { user: { select: safeUserSelect }, holeScores: true } },
    },
  });
  if (!round) notFound();

  return <RoundScorecard round={round} />;
}
