import { getCurrentTournament } from "@/lib/pga";
import { getTournamentOutrightOdds } from "@/lib/odds";

export const dynamic = "force-dynamic";

function formatAmericanOdds(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

export default async function PgaTourPage() {
  const [tournament, odds] = await Promise.all([getCurrentTournament(), getTournamentOutrightOdds()]);
  const isLiveStats = Boolean(process.env.PGA_STATS_API_KEY);
  const isLiveOdds = Boolean(process.env.ODDS_API_KEY);

  const byPlayer = new Map<string, { bookmaker: string; price: number }[]>();
  for (const o of odds.odds) {
    byPlayer.set(o.player, [...(byPlayer.get(o.player) ?? []), { bookmaker: o.bookmaker, price: o.price }]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">PGA Tour</h1>
        <p className="text-sm text-fairway-600">Live leaderboard and outright winner odds (aggregated across sportsbooks, including FanDuel).</p>
      </div>

      <div className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{tournament.name}</h2>
            <p className="text-xs text-fairway-600">
              {tournament.course} · Round {tournament.round} · {tournament.status.replace("_", " ")}
            </p>
          </div>
          {!isLiveStats && (
            <span className="rounded-full bg-sand-200 px-2 py-1 text-xs text-fairway-800">
              Demo data — set PGA_STATS_API_KEY for live scores
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="text-left text-fairway-600">
                <th className="py-1 pr-2">Pos</th>
                <th className="py-1 pr-2">Player</th>
                <th className="px-1 text-center">To Par</th>
                <th className="px-1 text-center">Today</th>
                <th className="px-1 text-center">Thru</th>
              </tr>
            </thead>
            <tbody>
              {tournament.leaderboard.map((p) => (
                <tr key={p.name} className="border-t border-fairway-50">
                  <td className="py-1 pr-2 font-medium">{p.position}</td>
                  <td className="py-1 pr-2">{p.name}</td>
                  <td className="px-1 text-center">{p.scoreToPar > 0 ? `+${p.scoreToPar}` : p.scoreToPar}</td>
                  <td className="px-1 text-center">{p.today > 0 ? `+${p.today}` : p.today}</td>
                  <td className="px-1 text-center">{p.thru}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Outright winner odds</h2>
            <p className="text-xs text-fairway-600">{odds.event}</p>
          </div>
          {!isLiveOdds && (
            <span className="rounded-full bg-sand-200 px-2 py-1 text-xs text-fairway-800">
              Demo data — set ODDS_API_KEY for live FanDuel odds
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="text-left text-fairway-600">
                <th className="py-1 pr-2">Player</th>
                {[...new Set(odds.odds.map((o) => o.bookmaker))].map((b) => (
                  <th key={b} className="px-2 text-center">{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...byPlayer.entries()].map(([player, books]) => (
                <tr key={player} className="border-t border-fairway-50">
                  <td className="py-1 pr-2 font-medium">{player}</td>
                  {[...new Set(odds.odds.map((o) => o.bookmaker))].map((b) => {
                    const entry = books.find((x) => x.bookmaker === b);
                    return (
                      <td key={b} className="px-2 text-center">
                        {entry ? formatAmericanOdds(entry.price) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-fairway-500">
          Odds via a licensed aggregator (e.g. The Odds API) re-broadcasting sportsbook lines,
          filtered to FanDuel plus comparison books. FanDuel does not publish a public odds API
          directly.
        </p>
      </div>
    </div>
  );
}
