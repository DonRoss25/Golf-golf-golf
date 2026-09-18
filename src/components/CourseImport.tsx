"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GhinResult {
  ghinCourseId: string;
  name: string;
  city: string;
  state: string;
}

const emptyHole = (number: number) => ({ number, par: 4, strokeIndex: number, yardage: 380 });

export function CourseImport() {
  const router = useRouter();
  const [tab, setTab] = useState<"GHIN" | "MANUAL">("GHIN");

  // GHIN search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GhinResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  // Manual entry state
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [teeName, setTeeName] = useState("Blue");
  const [courseRating, setCourseRating] = useState(72.0);
  const [slopeRating, setSlopeRating] = useState(113);
  const [holes, setHoles] = useState(Array.from({ length: 18 }, (_, i) => emptyHole(i + 1)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setSearching(true);
    const res = await fetch(`/api/courses/ghin-search?q=${encodeURIComponent(query)}`);
    setResults(await res.json());
    setSearching(false);
  }

  async function importCourse(ghinCourseId: string) {
    setImporting(ghinCourseId);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "GHIN", ghinCourseId }),
    });
    setImporting(null);
    if (res.ok) {
      const course = await res.json();
      router.push(`/courses/${course.id}`);
      router.refresh();
    }
  }

  function updateHole(idx: number, field: "par" | "strokeIndex" | "yardage", value: number) {
    setHoles((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const strokeIndexes = holes.map((h) => h.strokeIndex).sort((a, b) => a - b);
    const isValidStrokeIndex = strokeIndexes.every((v, i) => v === i + 1);
    if (!isValidStrokeIndex) {
      setError("Stroke indexes must be a permutation of 1–18 (each used exactly once).");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "MANUAL",
        name,
        city,
        state,
        tees: [{ name: teeName, gender: "ANY", courseRating, slopeRating, holes }],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(JSON.stringify(data.error ?? "Could not save course"));
      return;
    }
    const course = await res.json();
    router.push(`/courses/${course.id}`);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="mb-3 flex gap-2">
        <button
          className={tab === "GHIN" ? "btn" : "btn-secondary"}
          onClick={() => setTab("GHIN")}
          type="button"
        >
          Import from GHIN
        </button>
        <button
          className={tab === "MANUAL" ? "btn" : "btn-secondary"}
          onClick={() => setTab("MANUAL")}
          type="button"
        >
          Add manually
        </button>
      </div>

      {tab === "GHIN" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-fairway-600">
            Live GHIN course/scorecard data requires a USGA license (see .env.example). Until
            configured, this searches representative sample courses so you can try the full flow.
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Search course name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button className="btn" type="button" onClick={search} disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          <ul className="divide-y divide-fairway-100">
            {results.map((r) => (
              <li key={r.ghinCourseId} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-fairway-600">{r.city}, {r.state}</p>
                </div>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => importCourse(r.ghinCourseId)}
                  disabled={importing === r.ghinCourseId}
                >
                  {importing === r.ghinCourseId ? "Importing…" : "Import"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "MANUAL" && (
        <form onSubmit={saveManual} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className="input" placeholder="Course name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="input" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className="input" placeholder="Tee name (e.g. Blue)" value={teeName} onChange={(e) => setTeeName(e.target.value)} required />
            <label className="flex items-center gap-2 text-sm">
              Course rating
              <input
                className="input"
                type="number"
                step="0.1"
                value={courseRating}
                onChange={(e) => setCourseRating(parseFloat(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Slope rating
              <input
                className="input"
                type="number"
                value={slopeRating}
                onChange={(e) => setSlopeRating(parseInt(e.target.value, 10))}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Scorecard (par & stroke index per hole)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {holes.map((h, idx) => (
                <div key={h.number} className="rounded-lg border border-fairway-100 p-2 text-center text-xs">
                  <p className="mb-1 font-semibold">Hole {h.number}</p>
                  <label className="mb-1 block">
                    Par
                    <input
                      className="input mt-0.5"
                      type="number"
                      min={3}
                      max={6}
                      value={h.par}
                      onChange={(e) => updateHole(idx, "par", parseInt(e.target.value, 10))}
                    />
                  </label>
                  <label className="block">
                    S.I.
                    <input
                      className="input mt-0.5"
                      type="number"
                      min={1}
                      max={18}
                      value={h.strokeIndex}
                      onChange={(e) => updateHole(idx, "strokeIndex", parseInt(e.target.value, 10))}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-fit" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save course"}
          </button>
        </form>
      )}
    </div>
  );
}
