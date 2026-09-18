import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { safeUserSelect } from "@/lib/userSelect";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "ctp");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roundId = searchParams.get("roundId");
  if (!roundId) return NextResponse.json({ error: "roundId is required" }, { status: 400 });

  const entries = await prisma.closestToPin.findMany({
    where: { roundId },
    include: { user: { select: safeUserSelect } },
    orderBy: { holeNumber: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const roundId = form.get("roundId");
  const holeNumberRaw = form.get("holeNumber");
  const distanceFeetRaw = form.get("distanceFeet");
  const distanceSource = form.get("distanceSource");
  const photo = form.get("photo");

  if (typeof roundId !== "string" || typeof holeNumberRaw !== "string") {
    return NextResponse.json({ error: "roundId and holeNumber are required" }, { status: 400 });
  }
  const holeNumber = parseInt(holeNumberRaw, 10);
  if (!Number.isFinite(holeNumber) || holeNumber < 1 || holeNumber > 18) {
    return NextResponse.json({ error: "holeNumber must be 1-18" }, { status: 400 });
  }

  let photoUrl: string | undefined;
  if (photo instanceof File) {
    if (!ALLOWED_TYPES.has(photo.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }
    if (photo.size > MAX_BYTES) {
      return NextResponse.json({ error: "Photo too large (max 8MB)" }, { status: 400 });
    }
    await mkdir(UPLOAD_ROOT, { recursive: true });
    const ext = photo.type.split("/")[1] === "jpeg" ? "jpg" : photo.type.split("/")[1];
    const filename = `${randomBytes(8).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(path.join(UPLOAD_ROOT, filename), buffer);
    photoUrl = `/uploads/ctp/${filename}`;
  }

  const distanceFeet = typeof distanceFeetRaw === "string" && distanceFeetRaw !== "" ? parseFloat(distanceFeetRaw) : undefined;

  const entry = await prisma.closestToPin.create({
    data: {
      roundId,
      holeNumber,
      userId,
      photoUrl,
      distanceFeet,
      distanceSource: typeof distanceSource === "string" ? distanceSource : undefined,
    },
    include: { user: { select: safeUserSelect } },
  });

  return NextResponse.json(entry, { status: 201 });
}
