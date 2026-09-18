"use client";

import { useRef, useState } from "react";
import { estimateDistanceFeet, type PixelPoint } from "@/lib/distance";

type CalibrationStep = "FLAG_TOP" | "FLAG_BOTTOM" | "BALL" | "HOLE" | "DONE";

const STEP_LABELS: Record<CalibrationStep, string> = {
  FLAG_TOP: "Tap the TOP of the flagstick",
  FLAG_BOTTOM: "Tap the BOTTOM of the flagstick (where it meets the hole)",
  BALL: "Tap the BALL",
  HOLE: "Tap the HOLE",
  DONE: "All set — adjust below if needed",
};

export function ClosestToPinCapture({ roundId, defaultHole }: { roundId: string; defaultHole?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [holeNumber, setHoleNumber] = useState(defaultHole ?? 1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [step, setStep] = useState<CalibrationStep>("FLAG_TOP");
  const [points, setPoints] = useState<Partial<Record<CalibrationStep, PixelPoint>>>({});
  const [flagstickHeightInches, setFlagstickHeightInches] = useState(84);
  const [distanceFeet, setDistanceFeet] = useState<string>("");
  const [distanceSource, setDistanceSource] = useState<"MANUAL" | "ESTIMATED">("MANUAL");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onFile(file: File) {
    setPhotoFile(file);
    setPoints({});
    setStep("FLAG_TOP");

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxWidth = 480;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      // Canvas is a replaced element sitting in a flex-column container,
      // which stretches it to the container's full width by default and
      // (since it has an intrinsic aspect ratio) blows its height up to
      // match — pin the CSS size to the canvas's actual pixel size so it
      // renders at the intended scale instead.
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function drawMarkers(current: Partial<Record<CalibrationStep, PixelPoint>>) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const colors: Record<string, string> = {
      FLAG_TOP: "#facc15",
      FLAG_BOTTOM: "#facc15",
      BALL: "#ffffff",
      HOLE: "#ef4444",
    };
    for (const [key, pt] of Object.entries(current)) {
      if (!pt) continue;
      ctx.fillStyle = colors[key] ?? "#000";
      ctx.strokeStyle = "#000";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (current.FLAG_TOP && current.FLAG_BOTTOM) {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(current.FLAG_TOP.x, current.FLAG_TOP.y);
      ctx.lineTo(current.FLAG_BOTTOM.x, current.FLAG_BOTTOM.y);
      ctx.stroke();
    }
    if (current.BALL && current.HOLE) {
      ctx.strokeStyle = "#3d8c43";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(current.BALL.x, current.BALL.y);
      ctx.lineTo(current.HOLE.x, current.HOLE.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (step === "DONE") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point: PixelPoint = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };

    const next = { ...points, [step]: point };
    setPoints(next);
    drawMarkers(next);

    const order: CalibrationStep[] = ["FLAG_TOP", "FLAG_BOTTOM", "BALL", "HOLE", "DONE"];
    const nextStep = order[order.indexOf(step) + 1];
    setStep(nextStep);

    if (nextStep === "DONE" && next.FLAG_TOP && next.FLAG_BOTTOM && next.BALL && next.HOLE) {
      const feet = estimateDistanceFeet({
        flagstickTop: next.FLAG_TOP,
        flagstickBottom: next.FLAG_BOTTOM,
        flagstickHeightInches,
        ballPoint: next.BALL,
        holePoint: next.HOLE,
      });
      setDistanceFeet(String(feet));
      setDistanceSource("ESTIMATED");
    }
  }

  function reset() {
    setPoints({});
    setStep("FLAG_TOP");
    if (imgRef.current) drawMarkers({});
  }

  async function submit() {
    setSaving(true);
    setMessage(null);
    const form = new FormData();
    form.set("roundId", roundId);
    form.set("holeNumber", String(holeNumber));
    if (distanceFeet !== "") form.set("distanceFeet", distanceFeet);
    form.set("distanceSource", distanceSource);
    if (photoFile) form.set("photo", photoFile);

    const res = await fetch("/api/closest-to-pin", { method: "POST", body: form });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved!");
      setPhotoFile(null);
      setPoints({});
      setStep("FLAG_TOP");
      setDistanceFeet("");
    } else {
      setMessage("Could not save — try again.");
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          Hole
          <input
            className="input w-20"
            type="number"
            min={1}
            max={18}
            value={holeNumber}
            onChange={(e) => setHoleNumber(parseInt(e.target.value, 10) || 1)}
          />
        </label>
        <label className="flex flex-col text-sm">
          Flagstick height (in)
          <input
            className="input w-28"
            type="number"
            value={flagstickHeightInches}
            onChange={(e) => setFlagstickHeightInches(parseFloat(e.target.value) || 84)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Photo (include the flagstick, ball, and hole in frame for distance estimation)
        <input
          className="input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {photoFile && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-fairway-700">{STEP_LABELS[step]}</p>
          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className="max-w-full cursor-crosshair rounded-lg border border-fairway-200"
          />
          <button type="button" className="btn-secondary w-fit text-xs" onClick={reset}>
            Reset calibration points
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Distance to hole (feet) — auto-filled by calibration above, or enter manually
        <input
          className="input w-40"
          type="number"
          step="0.1"
          value={distanceFeet}
          onChange={(e) => {
            setDistanceFeet(e.target.value);
            setDistanceSource("MANUAL");
          }}
        />
      </label>
      <p className="text-xs text-fairway-500">
        Source: {distanceSource === "ESTIMATED" ? "Estimated from photo calibration" : "Manual entry"}
      </p>

      {message && <p className="text-sm text-fairway-700">{message}</p>}
      <button className="btn w-fit" type="button" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Save closest-to-pin entry"}
      </button>
    </div>
  );
}
