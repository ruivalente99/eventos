import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canManage(userId: string, globalRole: string, eventId: string) {
  if (globalRole === "SUPER_ADMIN") return true;
  const r = await prisma.eventUser.findFirst({ where: { userId, eventId, role: "ADMIN" } });
  return !!r;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await prisma.eventCourse.findMany({
    where: { eventId: id },
    orderBy: { entryOrder: "asc" },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;
  if (!(await canManage(session.user.id, session.user.globalRole, eventId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, globalCourseId, entryOrder } = await req.json();

  // auto-assign entry order if not provided
  let order = entryOrder;
  if (!order) {
    const max = await prisma.eventCourse.findFirst({ where: { eventId }, orderBy: { entryOrder: "desc" } });
    order = (max?.entryOrder ?? 0) + 1;
  }

  const course = await prisma.eventCourse.create({
    data: { eventId, name, globalCourseId: globalCourseId ?? null, entryOrder: order },
  });
  return NextResponse.json(course, { status: 201 });
}
