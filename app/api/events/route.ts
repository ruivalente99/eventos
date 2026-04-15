import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.globalRole === "SUPER_ADMIN") {
    const events = await prisma.event.findMany({
      include: {
        _count: { select: { users: true, courses: true, stations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  }

  const eventRoles = await prisma.eventUser.findMany({
    where: { userId: session.user.id },
    include: { event: true },
  });
  return NextResponse.json(eventRoles.map((r) => r.event));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description, slug: rawSlug } = body;
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);

  const event = await prisma.event.create({
    data: { name, description, slug },
  });
  return NextResponse.json(event, { status: 201 });
}
