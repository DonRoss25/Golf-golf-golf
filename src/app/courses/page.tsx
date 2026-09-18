import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CourseImport } from "@/components/CourseImport";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: { tees: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-sm text-fairway-600">
          Import a scorecard from GHIN or add one manually — both feed the same round/skins/handicap
          engine.
        </p>
      </div>

      <CourseImport />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Your courses</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-fairway-600">No courses yet — add one above.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <li key={c.id} className="card">
                <Link href={`/courses/${c.id}`} className="font-semibold text-fairway-700 hover:underline">
                  {c.name}
                </Link>
                <p className="text-xs text-fairway-600">
                  {c.city ? `${c.city}, ${c.state}` : c.source}
                </p>
                <p className="mt-1 text-xs text-fairway-500">
                  {c.tees.length} tee{c.tees.length !== 1 ? "s" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
