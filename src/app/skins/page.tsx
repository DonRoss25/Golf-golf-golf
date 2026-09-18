import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { safeUserSelect } from "@/lib/userSelect";

export const dynamic = "force-dynamic";

export default async function SkinsPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const rounds = await prisma.round.findMany({
    where: { players: { some: { userId } }, skins: { some: {} } },
    include: {
      course: true,
      skins: { orderBy: { holeNumber: "asc" } },
      players: { include: { user: { select: safeUserSelect } } },
    },
    orderBy: { playedAt: "desc" },
  });

  const overallTally = new Map<string, { name: string; skins: number; units: number }>();
  for (const round of rounds) {
    const userById = new Map(round.players.map((p) => [p.userId, p.user.name]));
    for (const skin of round.skins) {
      if (!skin.winnerUserId) continue;
      const key = skin.winnerUserId;
      const existing = overallTally.get(key) ?? { name: userById.get(key) ?? "Unknown", skins: 0, units: 0 };
      existing.skins += 1;
      existing.units += skin.value;
      overallTally.set(key, existing);
    }
  }
  const overall = [...overallTally.values()].sort((a, b) => b.units - a.units);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Skins</h1>
        <p className="text-sm text-fairway-600">
          A skin goes to the single lowest score-to-par on a hole; ties carry the skin (and its
          value) over to the next hole.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-2 text-lg font-semibold">All-time tally</h2>
        {overall.length === 0 ? (
          <p className="text-sm text-fairway-600">
            No finalized rounds yet. Enter scores on a round and hit "Finalize round" to see skins
            here.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {overall.map((o) => (
              <li key={o.name} className="flex justify-between border-b border-fairway-50 py-1">
                <span>{o.name}</span>
                <span className="font-semibold">{o.units} skin{o.units !== 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {rounds.map((round) => (
          <div key={round.id} className="card">
            <div className="mb-2 flex items-center justify-between">
              <Link href={`/rounds/${round.id}`} className="font-semibold text-fairway-700 hover:underline">
                {round.course.name} — {new Date(round.playedAt).toLocaleDateString()}
              </Link>
            </div>
            <div className="grid grid-cols-6 gap-2 text-xs sm:grid-cols-9">
              {round.skins.map((s) => {
                const winner = round.players.find((p) => p.userId === s.winnerUserId)?.user.name;
                return (
                  <div
                    key={s.holeNumber}
                    className={`rounded-md border p-2 text-center ${
                      s.winnerUserId ? "border-fairway-300 bg-fairway-50" : "border-dashed border-fairway-200"
                    }`}
                  >
                    <p className="font-semibold">H{s.holeNumber}</p>
                    {s.winnerUserId ? (
                      <>
                        <p className="truncate">{winner}</p>
                        <p className="text-fairway-500">
                          {s.scoreToPar! > 0 ? `+${s.scoreToPar}` : s.scoreToPar} · {s.value}u
                        </p>
                      </>
                    ) : (
                      <p className="text-fairway-400">push</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
