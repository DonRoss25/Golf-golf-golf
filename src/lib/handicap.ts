// Simplified World Handicap System (WHS) implementation.
// This mirrors the publicly documented USGA WHS formulas closely enough for
// a self-tracked handicap, but is NOT an official/certified handicap. Users
// who want an official index should link their GHIN number (see ghin.ts) —
// when GHIN credentials are configured, that live index is preferred
// wherever it is available.

export interface HoleForCalc {
  par: number;
  strokeIndex: number; // 1-18, 1 = hardest
}

export interface HoleScoreForCalc {
  strokes: number;
  hole: HoleForCalc;
}

/**
 * Net double bogey cap per hole (max score counted toward a differential):
 * par + 2 + any handicap strokes the player receives on that hole.
 */
export function netDoubleBogeyCap(hole: HoleForCalc, courseHandicap: number): number {
  const strokesReceived =
    Math.floor(courseHandicap / 18) + (hole.strokeIndex <= courseHandicap % 18 ? 1 : 0);
  return hole.par + 2 + strokesReceived;
}

export function adjustedGrossScore(scores: HoleScoreForCalc[], courseHandicap: number): number {
  return scores.reduce((total, s) => {
    const cap = netDoubleBogeyCap(s.hole, courseHandicap);
    return total + Math.min(s.strokes, cap);
  }, 0);
}

/** Score differential = (113 / Slope) * (AGS - Course Rating) */
export function scoreDifferential(
  adjustedGross: number,
  courseRating: number,
  slopeRating: number,
): number {
  return Math.round(((113 / slopeRating) * (adjustedGross - courseRating)) * 10) / 10;
}

/**
 * Course Handicap = HandicapIndex * (Slope / 113) + (CourseRating - Par)
 */
export function courseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  parTotal: number,
): number {
  return Math.round(handicapIndex * (slopeRating / 113) + (courseRating - parTotal));
}

// USGA WHS low-round-count table: [roundsUsed, numberOfDifferentialsAveraged, adjustment]
const WHS_TABLE: Array<{ rounds: number; use: number; adjustment: number }> = [
  { rounds: 1, use: 1, adjustment: -2.0 },
  { rounds: 2, use: 1, adjustment: -2.0 },
  { rounds: 3, use: 1, adjustment: -2.0 },
  { rounds: 4, use: 1, adjustment: -1.0 },
  { rounds: 5, use: 1, adjustment: 0 },
  { rounds: 6, use: 2, adjustment: -1.0 },
  { rounds: 7, use: 2, adjustment: -1.0 },
  { rounds: 8, use: 2, adjustment: -1.0 },
  { rounds: 9, use: 3, adjustment: -0.5 },
  { rounds: 10, use: 3, adjustment: -0.5 },
  { rounds: 11, use: 3, adjustment: -0.5 },
  { rounds: 12, use: 4, adjustment: 0 },
  { rounds: 13, use: 4, adjustment: 0 },
  { rounds: 14, use: 4, adjustment: 0 },
  { rounds: 15, use: 5, adjustment: 0 },
  { rounds: 16, use: 5, adjustment: 0 },
  { rounds: 17, use: 6, adjustment: 0 },
  { rounds: 18, use: 6, adjustment: 0 },
  { rounds: 19, use: 7, adjustment: 0 },
  { rounds: 20, use: 8, adjustment: 0 },
];

/**
 * Handicap Index from a list of score differentials, most-recent-first or
 * in any order (only the values matter). Uses the most recent 20 rounds.
 */
export function calculateHandicapIndex(differentials: number[]): number | null {
  if (differentials.length === 0) return null;

  const recent = differentials.slice(0, 20);
  const rule = WHS_TABLE[Math.min(recent.length, 20) - 1];

  const sorted = [...recent].sort((a, b) => a - b);
  const best = sorted.slice(0, rule.use);
  const avg = best.reduce((a, b) => a + b, 0) / best.length;

  const index = avg + rule.adjustment;
  return Math.round(index * 10) / 10;
}
