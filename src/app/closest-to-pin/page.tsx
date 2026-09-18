import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ClosestToPinCapture } from "@/components/ClosestToPinCapture";
import { safeUserSelect } from "@/lib/userSelect";

export const dynamic = "force-dynamic";

export default async function ClosestToPinPage({
  searchParams,
}: {
  searchParams: { roundId?: string };
}) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const rounds = await prisma.round.findMany({
    where: { players: { some: { userId } } },
    include: { course: true },
    orderBy: { playedAt: "desc" },
    take: 20,
  });

  const roundId = searchParams.roundId ?? rounds[0]?.id;
  const round = roundId ? rounds.find((r) => r.id === roundId) : undefined;

  const entries = roundId
    ? await prisma.closestToPin.findMany({
        where: { roundId },
        include: { user: { select: safeUserSelect } },
        orderBy: [{ holeNumber: "asc" }, { distanceFeet: "asc" }],
      })
    : [];

  const byHole = new Map<number, typeof entries>();
  for (const e of entries) {
    byHole.set(e.holeNumber, [...(byHole.get(e.holeNumber) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Closest to the Pin</h1>
        <p className="text-sm text-fairway-600">
          Snap a photo on the tee shot's landing spot, calibrate against the flagstick, and we'll
          estimate the distance to the hole — or just type it in.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {rounds.map((r) => (
          <Link
            key={r.id}
            href={`/closest-to-pin?roundId=${r.id}`}
            className={roundId === r.id ? "btn" : "btn-secondary"}
          >
            {r.course.name} · {new Date(r.playedAt).toLocaleDateString()}
          </Link>
        ))}
      </div>

      {!round ? (
        <p className="text-sm text-fairway-600">Start a round first to log closest-to-pin shots.</p>
      ) : (
        <>
          <ClosestToPinCapture roundId={round.id} />

          <div>
            <h2 className="mb-2 text-lg font-semibold">Entries this round</h2>
            {byHole.size === 0 ? (
              <p className="text-sm text-fairway-600">No entries yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...byHole.entries()].map(([hole, holeEntries]) => (
                  <div key={hole} className="card">
                    <p className="mb-2 font-semibold">Hole {hole}</p>
                    <ul className="flex flex-col gap-2">
                      {holeEntries.map((e, idx) => (
                        <li key={e.id} className="flex items-center gap-2 text-sm">
                          {e.photoUrl && (
                            <div className="relative h-12 w-12 overflow-hidden rounded-md border border-fairway-100">
                              <Image src={e.photoUrl} alt="" fill className="object-cover" unoptimized />
                            </div>
                          )}
                          <div>
                            <p className={idx === 0 ? "font-semibold text-fairway-700" : ""}>
                              {idx === 0 && "🏆 "}
                              {e.user.name}
                            </p>
                            <p className="text-xs text-fairway-500">
                              {e.distanceFeet != null ? `${e.distanceFeet} ft` : "no distance"}{" "}
                              {e.distanceSource === "ESTIMATED" ? "(estimated)" : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
