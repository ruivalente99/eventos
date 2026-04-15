import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const courses = await prisma.globalCourse.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json();
  const course = await prisma.globalCourse.create({ data: { name } });
  return NextResponse.json(course, { status: 201 });
}
