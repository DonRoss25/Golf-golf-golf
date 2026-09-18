import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NewRoundForm } from "@/components/NewRoundForm";

export const dynamic = "force-dynamic";

export default async function NewRoundPage({
  searchParams,
}: {
  searchParams: { courseId?: string };
}) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const [courses, users] = await Promise.all([
    prisma.course.findMany({ include: { tees: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isGuest: false },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Start a round</h1>
      {courses.length === 0 ? (
        <p className="text-sm text-fairway-600">
          Add a course first from the <a className="underline" href="/courses">Courses</a> page.
        </p>
      ) : (
        <NewRoundForm courses={courses} users={users} currentUserId={userId} defaultCourseId={searchParams.courseId} />
      )}
    </div>
  );
}
