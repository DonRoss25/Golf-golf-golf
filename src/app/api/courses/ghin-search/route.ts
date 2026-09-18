import { NextResponse } from "next/server";
import { searchGhinCourses } from "@/lib/ghin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);
  const results = await searchGhinCourses(q);
  return NextResponse.json(results);
}
