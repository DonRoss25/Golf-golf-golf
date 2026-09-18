// GHIN (Golf Handicap and Information Network) adapter.
//
// USGA/GHIN does not offer open self-serve API signup — access requires a
// license agreement (typically via your state/regional golf association).
// This module defines the shape of the integration and falls back to
// realistic mock data so the rest of the app (course import, live handicap
// pull) can be built and demoed against it today. Once GHIN_API_BASE_URL /
// GHIN_API_KEY (and a member login) are configured in the environment,
// flip USE_LIVE_GHIN on and implement the fetch calls below against your
// license's actual endpoints.

export interface GhinCourseSummary {
  ghinCourseId: string;
  name: string;
  city: string;
  state: string;
}

export interface GhinTeeSet {
  name: string;
  gender: "MEN" | "WOMEN" | "ANY";
  courseRating: number;
  slopeRating: number;
  parTotal: number;
  holes: Array<{ number: number; par: number; strokeIndex: number; yardage?: number }>;
}

export interface GhinScorecard {
  course: GhinCourseSummary;
  tees: GhinTeeSet[];
}

export interface GhinHandicapIndex {
  ghinNumber: string;
  index: number;
  revisionDate: string;
}

const isConfigured = () => Boolean(process.env.GHIN_API_BASE_URL && process.env.GHIN_API_KEY);

export async function searchGhinCourses(query: string): Promise<GhinCourseSummary[]> {
  if (isConfigured()) {
    const res = await fetch(
      `${process.env.GHIN_API_BASE_URL}/courses/search?name=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${process.env.GHIN_API_KEY}` } },
    );
    if (!res.ok) throw new Error(`GHIN course search failed: ${res.status}`);
    return res.json();
  }

  // Mock fallback for local dev / no license configured yet.
  return MOCK_COURSES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
}

export async function getGhinScorecard(ghinCourseId: string): Promise<GhinScorecard> {
  if (isConfigured()) {
    const res = await fetch(`${process.env.GHIN_API_BASE_URL}/courses/${ghinCourseId}/scorecard`, {
      headers: { Authorization: `Bearer ${process.env.GHIN_API_KEY}` },
    });
    if (!res.ok) throw new Error(`GHIN scorecard fetch failed: ${res.status}`);
    return res.json();
  }

  const course = MOCK_COURSES.find((c) => c.ghinCourseId === ghinCourseId) ?? MOCK_COURSES[0];
  return { course, tees: MOCK_TEES };
}

export async function getLiveHandicapIndex(ghinNumber: string): Promise<GhinHandicapIndex> {
  if (isConfigured()) {
    const res = await fetch(`${process.env.GHIN_API_BASE_URL}/golfers/${ghinNumber}/handicap`, {
      headers: { Authorization: `Bearer ${process.env.GHIN_API_KEY}` },
    });
    if (!res.ok) throw new Error(`GHIN handicap fetch failed: ${res.status}`);
    return res.json();
  }

  return {
    ghinNumber,
    index: 14.2,
    revisionDate: new Date().toISOString().slice(0, 10),
  };
}

const MOCK_COURSES: GhinCourseSummary[] = [
  { ghinCourseId: "mock-pebble", name: "Pebble Beach Golf Links", city: "Pebble Beach", state: "CA" },
  { ghinCourseId: "mock-bandon", name: "Bandon Dunes", city: "Bandon", state: "OR" },
  { ghinCourseId: "mock-pinehurst2", name: "Pinehurst No. 2", city: "Pinehurst", state: "NC" },
];

const MOCK_TEES: GhinTeeSet[] = [
  {
    name: "Blue",
    gender: "ANY",
    courseRating: 72.8,
    slopeRating: 133,
    parTotal: 72,
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: [4, 5, 3, 4, 4, 5, 3, 4, 4, 4, 4, 3, 4, 5, 4, 3, 4, 5][i],
      strokeIndex: ((i * 7) % 18) + 1,
      yardage: 350 + ((i * 37) % 200),
    })),
  },
];
