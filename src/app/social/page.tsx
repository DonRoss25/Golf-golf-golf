import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { FollowButton } from "@/components/FollowButton";
import { safeUserSelect } from "@/lib/userSelect";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const [allUsers, following, handicaps] = await Promise.all([
    prisma.user.findMany({
      where: { isGuest: false, id: { not: userId } },
      orderBy: { name: "asc" },
      select: safeUserSelect,
    }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    prisma.handicapIndexSnapshot.findMany(),
  ]);

  const followingIds = new Set(following.map((f) => f.followingId));
  const handicapByUser = new Map(handicaps.map((h) => [h.userId, h]));

  const feedRounds = await prisma.round.findMany({
    where: { players: { some: { userId: { in: [...followingIds] } } } },
    include: { course: true, players: { include: { user: { select: safeUserSelect } } } },
    orderBy: { playedAt: "desc" },
    take: 15,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Social</h1>
        <p className="text-sm text-fairway-600">Follow golfers in your network to see their rounds and handicap trend.</p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Golfers</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allUsers.map((u) => {
            const hc = handicapByUser.get(u.id);
            return (
              <li key={u.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-fairway-600">
                    {hc ? `Handicap Index: ${hc.index.toFixed(1)} (${hc.source === "GHIN" ? "GHIN" : "calculated"})` : "No handicap yet"}
                  </p>
                </div>
                <FollowButton targetUserId={u.id} initiallyFollowing={followingIds.has(u.id)} />
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Feed</h2>
        {followingIds.size === 0 ? (
          <p className="text-sm text-fairway-600">Follow someone above to see their recent rounds here.</p>
        ) : feedRounds.length === 0 ? (
          <p className="text-sm text-fairway-600">No recent rounds from people you follow yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedRounds.map((r) => (
              <li key={r.id} className="card">
                <Link href={`/rounds/${r.id}`} className="font-semibold text-fairway-700 hover:underline">
                  {r.course.name}
                </Link>
                <p className="text-xs text-fairway-600">{new Date(r.playedAt).toLocaleDateString()}</p>
                <p className="mt-1 text-sm">
                  {r.players.map((p) => p.user.name).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
