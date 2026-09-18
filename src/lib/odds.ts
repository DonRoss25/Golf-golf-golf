// Betting odds aggregation.
//
// FanDuel does not publish a public odds API of its own. The supported
// path is a licensed odds aggregator that re-broadcasts sportsbook lines
// (The Odds API, SportsDataIO, etc.) — this module targets The Odds API's
// golf-outrights market and filters the response down to the "fanduel"
// bookmaker, alongside a couple of others for comparison. Set
// ODDS_API_KEY to go live; otherwise mock odds are returned.

export interface OutrightOdds {
  bookmaker: string;
  player: string;
  price: number; // American odds, e.g. +1400, -110
}

export interface OddsMarket {
  event: string;
  lastUpdate: string;
  odds: OutrightOdds[];
}

const isConfigured = () => Boolean(process.env.ODDS_API_KEY);

export async function getTournamentOutrightOdds(): Promise<OddsMarket> {
  if (isConfigured()) {
    const url = new URL(`${process.env.ODDS_API_BASE_URL}/sports/golf_pga_championship_winner/odds`);
    url.searchParams.set("apiKey", process.env.ODDS_API_KEY!);
    url.searchParams.set("regions", "us");
    url.searchParams.set("bookmakers", "fanduel,draftkings,betmgm");
    url.searchParams.set("markets", "outrights");

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Odds API fetch failed: ${res.status}`);
    const data = await res.json();
    return normalizeOddsApiResponse(data);
  }

  return MOCK_ODDS;
}

// Reshapes The Odds API's nested event/bookmaker/market/outcome payload
// into a flat list of {bookmaker, player, price} for easy rendering.
function normalizeOddsApiResponse(data: unknown): OddsMarket {
  const events = Array.isArray(data) ? data : [];
  const first = events[0];
  if (!first) return { event: "No upcoming tournament odds", lastUpdate: new Date().toISOString(), odds: [] };

  const odds: OutrightOdds[] = [];
  for (const bookmaker of first.bookmakers ?? []) {
    const outrights = bookmaker.markets?.find((m: { key: string }) => m.key === "outrights");
    for (const outcome of outrights?.outcomes ?? []) {
      odds.push({ bookmaker: bookmaker.title, player: outcome.name, price: outcome.price });
    }
  }

  return { event: first.home_team ?? first.sport_title ?? "Tournament", lastUpdate: new Date().toISOString(), odds };
}

const MOCK_ODDS: OddsMarket = {
  event: "TOUR Championship — Winner (demo data)",
  lastUpdate: new Date().toISOString(),
  odds: [
    { bookmaker: "FanDuel", player: "Scottie Scheffler", price: -140 },
    { bookmaker: "FanDuel", player: "Rory McIlroy", price: 550 },
    { bookmaker: "FanDuel", player: "Xander Schauffele", price: 900 },
    { bookmaker: "FanDuel", player: "Viktor Hovland", price: 1100 },
    { bookmaker: "DraftKings", player: "Scottie Scheffler", price: -135 },
    { bookmaker: "DraftKings", player: "Rory McIlroy", price: 600 },
    { bookmaker: "BetMGM", player: "Scottie Scheffler", price: -130 },
    { bookmaker: "BetMGM", player: "Rory McIlroy", price: 580 },
  ],
};
