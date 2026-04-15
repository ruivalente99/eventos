import { prisma } from "@/lib/prisma";
import { GlobalCoursesManager } from "@/components/admin/global-courses-manager";

export default async function AdminCoursesPage() {
  const courses = await prisma.globalCourse.findMany({ orderBy: { name: "asc" } });
  return <GlobalCoursesManager initialCourses={courses} />;
}
