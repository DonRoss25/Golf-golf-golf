import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLiveHandicapIndex } from "@/lib/ghin";
import { safeUserSelect } from "@/lib/userSelect";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-bold text-fairway-800">Golf Golf Golf</h1>
        <p className="mt-3 text-fairway-600">
          Track rounds, skins, closest-to-pin, live handicaps, your golf social network, and PGA
          Tour scores & odds — all in one place.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register" className="btn">Get started</Link>
          <Link href="/login" className="btn-secondary">Sign in</Link>
        </div>
      </div>
    );
  }

  const [user, snapshot, recentRounds, records] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect }),
    prisma.handicapIndexSnapshot.findUnique({ where: { userId } }),
    prisma.round.findMany({
      where: { players: { some: { userId } } },
      include: { course: true, players: { include: { user: { select: safeUserSelect } } } },
      orderBy: { playedAt: "desc" },
      take: 5,
    }),
    prisma.handicapRecord.findMany({
      where: { userId, source: "CALCULATED" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const liveGhin = user?.ghinNumber ? await getLiveHandicapIndex(user.ghinNumber).catch(() => null) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-sm text-fairway-600">Here's where things stand.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase text-fairway-500">Calculated Index</p>
          <p className="text-3xl font-bold text-fairway-700">{snapshot ? snapshot.index.toFixed(1) : "—"}</p>
          <p className="text-xs text-fairway-500">{snapshot ? `From ${snapshot.roundsUsed} rounds` : "Finalize a round to start tracking"}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-fairway-500">GHIN Index</p>
          <p className="text-3xl font-bold text-fairway-700">{liveGhin ? liveGhin.index.toFixed(1) : "—"}</p>
          <p className="text-xs text-fairway-500">
            {user?.ghinNumber ? `As of ${liveGhin?.revisionDate}` : "Add a GHIN number in your profile"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-fairway-500">Rounds logged</p>
          <p className="text-3xl font-bold text-fairway-700">{records.length}</p>
          <p className="text-xs text-fairway-500">Last 10 differentials on file</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/rounds/new" className="btn">Start a round</Link>
        <Link href="/skins" className="btn-secondary">Skins</Link>
        <Link href="/closest-to-pin" className="btn-secondary">Closest to pin</Link>
        <Link href="/social" className="btn-secondary">Social</Link>
        <Link href="/pga-tour" className="btn-secondary">PGA Tour</Link>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recent rounds</h2>
        {recentRounds.length === 0 ? (
          <p className="text-sm text-fairway-600">No rounds yet — start one above.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentRounds.map((r) => (
              <li key={r.id} className="card flex items-center justify-between">
                <div>
                  <Link href={`/rounds/${r.id}`} className="font-medium text-fairway-700 hover:underline">
                    {r.course.name}
                  </Link>
                  <p className="text-xs text-fairway-600">
                    {new Date(r.playedAt).toLocaleDateString()} · {r.players.map((p) => p.user.name).join(", ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
