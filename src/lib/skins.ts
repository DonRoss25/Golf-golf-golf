// Skins are awarded per-hole to the single player with the strictly lowest
// gross score-to-par on that hole. Ties push (carry over) to the next hole,
// stacking value until a hole has a single outright winner.

export interface SkinHoleEntry {
  userId: string;
  strokes: number;
}

export interface SkinHoleInput {
  holeNumber: number;
  par: number;
  entries: SkinHoleEntry[];
}

export interface SkinResult {
  holeNumber: number;
  winnerUserId: string | null;
  scoreToPar: number | null;
  carriedOver: boolean;
  value: number;
}

export function calculateSkins(holes: SkinHoleInput[]): SkinResult[] {
  const sorted = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const results: SkinResult[] = [];
  let carry = 1;

  for (const hole of sorted) {
    const withScores = hole.entries.filter((e) => Number.isFinite(e.strokes));
    if (withScores.length === 0) {
      results.push({
        holeNumber: hole.holeNumber,
        winnerUserId: null,
        scoreToPar: null,
        carriedOver: true,
        value: carry,
      });
      carry += 1;
      continue;
    }

    const lowest = Math.min(...withScores.map((e) => e.strokes));
    const lowestPlayers = withScores.filter((e) => e.strokes === lowest);

    if (lowestPlayers.length === 1) {
      results.push({
        holeNumber: hole.holeNumber,
        winnerUserId: lowestPlayers[0].userId,
        scoreToPar: lowest - hole.par,
        carriedOver: false,
        value: carry,
      });
      carry = 1;
    } else {
      // tie for lowest score on the hole -> push, carry value forward
      results.push({
        holeNumber: hole.holeNumber,
        winnerUserId: null,
        scoreToPar: lowest - hole.par,
        carriedOver: true,
        value: carry,
      });
      carry += 1;
    }
  }

  return results;
}

export interface SkinsTally {
  userId: string;
  skinsWon: number;
  unitsWon: number;
}

export function tallySkins(results: SkinResult[]): SkinsTally[] {
  const byUser = new Map<string, SkinsTally>();
  for (const r of results) {
    if (!r.winnerUserId) continue;
    const existing = byUser.get(r.winnerUserId) ?? {
      userId: r.winnerUserId,
      skinsWon: 0,
      unitsWon: 0,
    };
    existing.skinsWon += 1;
    existing.unitsWon += r.value;
    byUser.set(r.winnerUserId, existing);
  }
  return [...byUser.values()].sort((a, b) => b.unitsWon - a.unitsWon);
}
