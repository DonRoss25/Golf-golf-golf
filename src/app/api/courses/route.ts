import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getGhinScorecard } from "@/lib/ghin";

export async function GET() {
  const courses = await prisma.course.findMany({
    include: { tees: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(courses);
}

const holeSchema = z.object({
  number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  strokeIndex: z.number().int().min(1).max(18),
  yardage: z.number().int().positive().optional(),
});

const teeSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["MEN", "WOMEN", "ANY"]).default("ANY"),
  courseRating: z.number().positive(),
  slopeRating: z.number().int().min(55).max(155),
  holes: z.array(holeSchema).length(18),
});

const manualSchema = z.object({
  mode: z.literal("MANUAL"),
  name: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  tees: z.array(teeSchema).min(1),
});

const ghinSchema = z.object({
  mode: z.literal("GHIN"),
  ghinCourseId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const manual = manualSchema.safeParse(body);
  if (manual.success) {
    const data = manual.data;
    const course = await prisma.course.create({
      data: {
        name: data.name,
        city: data.city,
        state: data.state,
        source: "MANUAL",
        tees: {
          create: data.tees.map((tee) => ({
            name: tee.name,
            gender: tee.gender,
            courseRating: tee.courseRating,
            slopeRating: tee.slopeRating,
            parTotal: tee.holes.reduce((sum, h) => sum + h.par, 0),
            holes: { create: tee.holes },
          })),
        },
      },
      include: { tees: { include: { holes: true } } },
    });
    return NextResponse.json(course, { status: 201 });
  }

  const ghin = ghinSchema.safeParse(body);
  if (ghin.success) {
    const existing = await prisma.course.findUnique({ where: { ghinCourseId: ghin.data.ghinCourseId } });
    if (existing) return NextResponse.json(existing);

    const scorecard = await getGhinScorecard(ghin.data.ghinCourseId);
    const course = await prisma.course.create({
      data: {
        name: scorecard.course.name,
        city: scorecard.course.city,
        state: scorecard.course.state,
        ghinCourseId: scorecard.course.ghinCourseId,
        source: "GHIN",
        tees: {
          create: scorecard.tees.map((tee) => ({
            name: tee.name,
            gender: tee.gender,
            courseRating: tee.courseRating,
            slopeRating: tee.slopeRating,
            parTotal: tee.parTotal,
            holes: { create: tee.holes },
          })),
        },
      },
      include: { tees: { include: { holes: true } } },
    });
    return NextResponse.json(course, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid course payload" }, { status: 400 });
}
