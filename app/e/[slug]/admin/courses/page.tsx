import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EventCoursesManager } from "@/components/admin/event-courses-manager";

export default async function EventCoursesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const [courses, globalCourses] = await Promise.all([
    prisma.eventCourse.findMany({ where: { eventId: event.id }, orderBy: { entryOrder: "asc" } }),
    prisma.globalCourse.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <EventCoursesManager eventId={event.id} initialCourses={courses} globalCourses={globalCourses} />;
}
