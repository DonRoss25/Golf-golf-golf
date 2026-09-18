import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { tees: { include: { holes: { orderBy: { number: "asc" } } } } },
  });
  if (!course) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-sm text-fairway-600">
            {course.city ? `${course.city}, ${course.state}` : course.source}
          </p>
        </div>
        <Link href={`/rounds/new?courseId=${course.id}`} className="btn">
          Start a round here
        </Link>
      </div>

      {course.tees.map((tee) => (
        <div key={tee.id} className="card overflow-x-auto">
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-lg font-semibold">{tee.name} tees</h2>
            <span className="text-xs text-fairway-600">
              Rating {tee.courseRating.toFixed(1)} / Slope {tee.slopeRating} / Par {tee.parTotal}
            </span>
          </div>
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="text-left text-fairway-600">
                <th className="py-1 pr-2">Hole</th>
                {tee.holes.map((h) => (
                  <th key={h.id} className="px-1 text-center">{h.number}</th>
                ))}
                <th className="px-1 text-center font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 pr-2 font-medium">Par</td>
                {tee.holes.map((h) => (
                  <td key={h.id} className="px-1 text-center">{h.par}</td>
                ))}
                <td className="px-1 text-center font-bold">{tee.parTotal}</td>
              </tr>
              <tr>
                <td className="py-1 pr-2 font-medium">S.I.</td>
                {tee.holes.map((h) => (
                  <td key={h.id} className="px-1 text-center">{h.strokeIndex}</td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
