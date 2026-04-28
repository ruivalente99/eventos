import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_THEMES = ["light", "dark", "midnight-blue"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (session.user.id !== id && session.user.globalRole !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { theme } = await req.json();
  if (!ALLOWED_THEMES.includes(theme))
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });

  await prisma.user.update({ where: { id }, data: { theme } });
  return NextResponse.json({ theme });
}
