import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/events/[id]/courses/reorder
// Body: { ids: string[] } — ordered list of course IDs, reassigns entryOrder 1..n
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const { ids } = await req.json() as { ids: string[] };

  // Assign all orders in a transaction using a temp offset to avoid unique conflicts
  await prisma.$transaction([
    // Shift all to a safe range first
    ...ids.map((courseId, i) =>
      prisma.eventCourse.update({
        where: { id: courseId },
        data: { entryOrder: 10000 + i + 1 },
      })
    ),
    // Then assign final values
    ...ids.map((courseId, i) =>
      prisma.eventCourse.update({
        where: { id: courseId },
        data: { entryOrder: i + 1 },
      })
    ),
  ]);

  const courses = await prisma.eventCourse.findMany({
    where: { eventId },
    orderBy: { entryOrder: "asc" },
  });
  return NextResponse.json(courses);
}
