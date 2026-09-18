"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateSkins, tallySkins } from "@/lib/skins";
import { buildRoundShareText, buildSmsShareLink } from "@/lib/share";

interface Hole {
  id: string;
  number: number;
  par: number;
  strokeIndex: number;
}
interface HoleScore {
  holeId: string;
  strokes: number;
}
interface Player {
  id: string; // roundPlayerId
  userId: string;
  user: { id: string; name: string };
  courseHandicap: number | null;
  holeScores: HoleScore[];
}
interface RoundData {
  id: string;
  playedAt: string | Date;
  shareToken: string;
  course: { name: string };
  tee: { name: string; parTotal: number; holes: Hole[] };
  players: Player[];
}

export function RoundScorecard({ round }: { round: RoundData }) {
  const router = useRouter();
  const holes = round.tee.holes;

  const [scores, setScores] = useState<Record<string, number | "">>(() => {
    const initial: Record<string, number | ""> = {};
    for (const p of round.players) {
      for (const h of holes) {
        const existing = p.holeScores.find((s) => s.holeId === h.id);
        initial[`${p.id}_${h.id}`] = existing ? existing.strokes : "";
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function setScore(playerId: string, holeId: string, value: string) {
    const num = value === "" ? "" : Math.max(1, Math.min(20, parseInt(value, 10) || 1));
    setScores((prev) => ({ ...prev, [`${playerId}_${holeId}`]: num }));
  }

  const totals = useMemo(() => {
    return round.players.map((p) => {
      const total = holes.reduce((sum, h) => {
        const v = scores[`${p.id}_${h.id}`];
        return sum + (typeof v === "number" ? v : 0);
      }, 0);
      const holesEntered = holes.filter((h) => typeof scores[`${p.id}_${h.id}`] === "number").length;
      return { player: p, total, holesEntered, toPar: total - round.tee.parTotal };
    });
  }, [scores, holes, round.players, round.tee.parTotal]);

  const skinsPreview = useMemo(() => {
    const skinHoles = holes.map((h) => ({
      holeNumber: h.number,
      par: h.par,
      entries: round.players
        .map((p) => {
          const v = scores[`${p.id}_${h.id}`];
          return typeof v === "number" ? { userId: p.userId, strokes: v } : null;
        })
        .filter((e): e is { userId: string; strokes: number } => e !== null),
    }));
    return tallySkins(calculateSkins(skinHoles));
  }, [scores, holes, round.players]);

  async function save() {
    setSaving(true);
    const payload = round.players.flatMap((p) =>
      holes
        .map((h) => ({ roundPlayerId: p.id, holeId: h.id, strokes: scores[`${p.id}_${h.id}`] }))
        .filter((s): s is { roundPlayerId: string; holeId: string; strokes: number } => typeof s.strokes === "number"),
    );
    if (payload.length > 0) {
      await fetch(`/api/rounds/${round.id}/scores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: payload }),
      });
    }
    setSaving(false);
    setSavedAt(new Date());
  }

  async function finalize() {
    setFinalizing(true);
    await save();
    await fetch(`/api/rounds/${round.id}/finalize`, { method: "POST" });
    setFinalizing(false);
    router.refresh();
  }

  function share() {
    const shareUrl = `${window.location.origin}/rounds/${round.id}`;
    const text = buildRoundShareText({
      courseName: round.course.name,
      playedAt: new Date(round.playedAt),
      players: totals.map((t) => ({ name: t.player.user.name, total: t.total, toPar: t.toPar })),
      shareUrl,
    });

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text, title: `${round.course.name} round` }).catch(() => {
        window.location.href = buildSmsShareLink(text);
      });
    } else {
      window.location.href = buildSmsShareLink(text);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{round.course.name}</h1>
          <p className="text-sm text-fairway-600">
            {round.tee.name} tees · {new Date(round.playedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/closest-to-pin?roundId=${round.id}`} className="btn-secondary">
            Closest to pin
          </Link>
          <button className="btn-secondary" onClick={share} type="button">
            Share via text
          </button>
          <Link href="/skins" className="btn-secondary">
            Skins tab
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-fairway-600">
              <th className="py-1 pr-2">Player</th>
              {holes.map((h) => (
                <th key={h.id} className="px-1 text-center">
                  {h.number}
                  <div className="text-[10px] font-normal text-fairway-400">Par {h.par}</div>
                </th>
              ))}
              <th className="px-1 text-center font-bold">Total</th>
              <th className="px-1 text-center font-bold">±Par</th>
            </tr>
          </thead>
          <tbody>
            {round.players.map((p) => {
              const t = totals.find((x) => x.player.id === p.id)!;
              return (
                <tr key={p.id} className="border-t border-fairway-50">
                  <td className="py-1 pr-2 font-medium">{p.user.name}</td>
                  {holes.map((h) => (
                    <td key={h.id} className="px-1 py-1 text-center">
                      <input
                        className="w-10 rounded border border-fairway-200 py-1 text-center text-sm focus:border-fairway-500 focus:outline-none"
                        inputMode="numeric"
                        value={scores[`${p.id}_${h.id}`]}
                        onChange={(e) => setScore(p.id, h.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-1 text-center font-bold">{t.holesEntered > 0 ? t.total : "—"}</td>
                  <td className="px-1 text-center font-bold">
                    {t.holesEntered > 0 ? (t.toPar > 0 ? `+${t.toPar}` : t.toPar) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={save} type="button" disabled={saving}>
          {saving ? "Saving…" : "Save scores"}
        </button>
        <button className="btn-secondary" onClick={finalize} type="button" disabled={finalizing}>
          {finalizing ? "Finalizing…" : "Finalize round (skins + handicap)"}
        </button>
        {savedAt && <span className="text-xs text-fairway-500">Saved {savedAt.toLocaleTimeString()}</span>}
      </div>

      <div className="card">
        <h2 className="mb-2 text-lg font-semibold">Live skins preview</h2>
        <p className="mb-3 text-xs text-fairway-600">
          Lowest score-to-par on a hole wins the skin; ties push to the next hole. Click "Finalize
          round" to save these permanently to the Skins tab.
        </p>
        {skinsPreview.length === 0 ? (
          <p className="text-sm text-fairway-600">No skins decided yet — enter more scores.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {skinsPreview.map((s) => {
              const player = round.players.find((p) => p.userId === s.userId);
              return (
                <li key={s.userId} className="flex justify-between">
                  <span>{player?.user.name ?? "Unknown"}</span>
                  <span className="font-semibold">{s.unitsWon} skin{s.unitsWon !== 1 ? "s" : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
