import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLoginToken } from "@/lib/token";
import QRCode from "qrcode";

function getQrBaseUrl(): string {
  return (
    process.env.QR_LOGIN_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

async function buildQrDataUrl(token: string): Promise<string> {
  const url = `${getQrBaseUrl()}/qr-login?token=${token}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

type SessionUser = { id?: string; globalRole?: string } | undefined;

async function canAccess(sessionUser: SessionUser, targetUserId: string): Promise<boolean> {
  if (!sessionUser?.id) return false;
  if (sessionUser.globalRole === "SUPER_ADMIN") return true;
  const isEventAdmin = await prisma.eventUser.findFirst({
    where: {
      userId: sessionUser.id,
      role: "ADMIN",
      event: { users: { some: { userId: targetUserId } } },
    },
  });
  return !!isEventAdmin;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  if (!(await canAccess(session?.user, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { loginToken: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.loginToken)
    return NextResponse.json({ error: "No token" }, { status: 404 });

  const dataUrl = await buildQrDataUrl(user.loginToken);
  return NextResponse.json({ dataUrl });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  if (!(await canAccess(session?.user, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newToken = generateLoginToken();
  await prisma.user.update({ where: { id }, data: { loginToken: newToken } });

  const dataUrl = await buildQrDataUrl(newToken);
  return NextResponse.json({ dataUrl });
}
