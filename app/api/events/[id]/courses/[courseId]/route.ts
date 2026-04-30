import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.entryOrder !== undefined) data.entryOrder = body.entryOrder;
  if (body.disqualified !== undefined) data.disqualified = body.disqualified;
  if (body.hidden !== undefined) data.hidden = Boolean(body.hidden);
  if ("globalCourseId" in body) data.globalCourseId = body.globalCourseId;
  const { id: eventId } = await params;
  const course = await prisma.eventCourse.update({ where: { id: courseId }, data });
  revalidateTag(`courses:${eventId}`, {});
  revalidateTag(`leaderboard:${eventId}`, {});
  return NextResponse.json(course);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  await prisma.eventCourse.delete({ where: { id: courseId } });
  return NextResponse.json({ ok: true });
}
