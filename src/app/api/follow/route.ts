import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const schema = z.object({ targetUserId: z.string().min(1) });

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.targetUserId === userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: userId, followingId: parsed.data.targetUserId } },
    update: {},
    create: { followerId: userId, followingId: parsed.data.targetUserId },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("targetUserId");
  if (!targetUserId) return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });

  await prisma.follow.deleteMany({ where: { followerId: userId, followingId: targetUserId } });
  return NextResponse.json({ ok: true });
}
