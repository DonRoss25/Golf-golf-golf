// Live PGA Tour stats/scores adapter.
//
// There is no official free public PGA Tour API. Plug a licensed provider
// in here (e.g. SportRadar Golf API, a RapidAPI PGA Tour feed, or a direct
// PGA Tour data partnership) by setting PGA_STATS_API_BASE_URL/API_KEY.
// Until then this returns realistic mock leaderboard data so the /pga-tour
// page is fully functional to build and demo against.

export interface PgaLeaderboardPlayer {
  position: string; // e.g. "1", "T2"
  name: string;
  countryCode?: string;
  scoreToPar: number; // negative = under par
  today: number;
  thru: string; // "F" or hole number
  roundScores: number[];
}

export interface PgaTournament {
  id: string;
  name: string;
  course: string;
  round: number;
  status: "PRE" | "IN_PROGRESS" | "FINAL";
  leaderboard: PgaLeaderboardPlayer[];
  updatedAt: string;
}

const isConfigured = () => Boolean(process.env.PGA_STATS_API_BASE_URL && process.env.PGA_STATS_API_KEY);

export async function getCurrentTournament(): Promise<PgaTournament> {
  if (isConfigured()) {
    const res = await fetch(`${process.env.PGA_STATS_API_BASE_URL}/leaderboard`, {
      headers: { Authorization: `Bearer ${process.env.PGA_STATS_API_KEY}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`PGA stats fetch failed: ${res.status}`);
    return res.json();
  }

  return MOCK_TOURNAMENT;
}

const MOCK_TOURNAMENT: PgaTournament = {
  id: "mock-2026-tour-championship",
  name: "TOUR Championship (demo data)",
  course: "East Lake Golf Club",
  round: 3,
  status: "IN_PROGRESS",
  updatedAt: new Date().toISOString(),
  leaderboard: [
    { position: "1", name: "Scottie Scheffler", countryCode: "US", scoreToPar: -14, today: -4, thru: "F", roundScores: [67, 65, 68] },
    { position: "2", name: "Rory McIlroy", countryCode: "NI", scoreToPar: -12, today: -3, thru: "F", roundScores: [68, 66, 69] },
    { position: "T3", name: "Xander Schauffele", countryCode: "US", scoreToPar: -10, today: -2, thru: "F", roundScores: [69, 67, 70] },
    { position: "T3", name: "Viktor Hovland", countryCode: "NO", scoreToPar: -10, today: -1, thru: "F", roundScores: [70, 66, 70] },
    { position: "5", name: "Patrick Cantlay", countryCode: "US", scoreToPar: -8, today: -3, thru: "14", roundScores: [70, 68, 71] },
  ],
};
