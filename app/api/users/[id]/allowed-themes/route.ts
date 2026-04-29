import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_THEMES } from "@/lib/themes";

const VALID_IDS = ALL_THEMES.map((t) => t.id);

async function canRead(sessionUserId: string, globalRole: string, targetId: string) {
  if (globalRole === "SUPER_ADMIN") return true;
  if (sessionUserId === targetId) return true;
  const isEventAdmin = await prisma.eventUser.findFirst({
    where: { userId: sessionUserId, role: "ADMIN", event: { users: { some: { userId: targetId } } } },
  });
  return !!isEventAdmin;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canRead(session.user.id, session.user.globalRole, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id }, select: { allowedThemes: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ allowedThemes: user.allowedThemes });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.globalRole !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { allowedThemes } = await req.json();

  if (!Array.isArray(allowedThemes) || allowedThemes.some((t) => !VALID_IDS.includes(t)))
    return NextResponse.json({ error: "Invalid themes" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: { allowedThemes },
    select: { id: true, allowedThemes: true },
  });
  return NextResponse.json(user);
}
