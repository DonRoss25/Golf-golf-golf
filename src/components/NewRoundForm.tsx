"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Tee {
  id: string;
  name: string;
  courseRating: number;
  slopeRating: number;
}
interface Course {
  id: string;
  name: string;
  tees: Tee[];
}
interface AppUser {
  id: string;
  name: string;
  email: string;
}

export function NewRoundForm({
  courses,
  users,
  currentUserId,
  defaultCourseId,
}: {
  courses: Course[];
  users: AppUser[];
  currentUserId: string;
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(defaultCourseId ?? courses[0]?.id ?? "");
  const course = courses.find((c) => c.id === courseId) ?? courses[0];
  const [teeId, setTeeId] = useState(course?.tees[0]?.id ?? "");
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([currentUserId]);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleUser(id: string) {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  function addGuest() {
    if (!guestInput.trim()) return;
    setGuestNames((prev) => [...prev, guestInput.trim()]);
    setGuestInput("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const activeTeeId = teeId || course?.tees[0]?.id;
    if (!courseId || !activeTeeId) {
      setError("Pick a course and tee.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        teeId: activeTeeId,
        playedAt: new Date(playedAt).toISOString(),
        players: [
          ...selectedUserIds.map((userId) => ({ userId })),
          ...guestNames.map((guestName) => ({ guestName })),
        ],
      }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("Could not create round.");
      return;
    }
    const round = await res.json();
    router.push(`/rounds/${round.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Course
        <select
          className="input"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            const next = courses.find((c) => c.id === e.target.value);
            setTeeId(next?.tees[0]?.id ?? "");
          }}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Tees
        <select className="input" value={teeId} onChange={(e) => setTeeId(e.target.value)}>
          {course?.tees.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.courseRating.toFixed(1)}/{t.slopeRating})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Date
        <input className="input" type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
      </label>

      <div>
        <p className="mb-1 text-sm font-medium">Players</p>
        <div className="flex flex-col gap-1">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedUserIds.includes(u.id)}
                onChange={() => toggleUser(u.id)}
                disabled={u.id === currentUserId}
              />
              {u.name} {u.id === currentUserId && "(you)"}
            </label>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder="Guest player name"
            value={guestInput}
            onChange={(e) => setGuestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGuest();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addGuest}>
            Add guest
          </button>
        </div>
        {guestNames.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {guestNames.map((g, i) => (
              <li key={i} className="rounded-full bg-fairway-100 px-2 py-1">
                {g}{" "}
                <button
                  type="button"
                  className="ml-1 font-bold text-fairway-600"
                  onClick={() => setGuestNames((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-fit" type="submit" disabled={saving}>
        {saving ? "Creating…" : "Start round"}
      </button>
    </form>
  );
}
