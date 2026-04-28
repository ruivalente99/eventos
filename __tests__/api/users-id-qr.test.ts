import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, GET, POST, parseJson } from "./helpers";

var prismaInstance: any;
vi.mock("@/lib/prisma", () => {
  prismaInstance = {
    eventUser: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { prisma: prismaInstance };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/token", () => ({ generateLoginToken: vi.fn().mockReturnValue("new-token-xyz") }));
vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK") },
}));

import { auth } from "@/lib/auth";
import { GET as getQr, POST as postQr } from "@/app/api/users/[id]/qr/route";

const mockAuth = auth as any;
const params = (id = "u-1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users/[id]/qr", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getQr(GET("http://localhost/api/users/u-1/qr"), params());
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin jury (not same event admin)", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null);
    const res = await getQr(GET("http://localhost/api/users/u-1/qr"), params());
    expect(res.status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.findUnique.mockResolvedValue(null);
    const res = await getQr(GET("http://localhost/api/users/u-1/qr"), params());
    expect(res.status).toBe(404);
  });

  it("returns 404 when user has no loginToken", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.findUnique.mockResolvedValue({ loginToken: null } as any);
    const res = await getQr(GET("http://localhost/api/users/u-1/qr"), params());
    expect(res.status).toBe(404);
  });

  it("SUPER_ADMIN gets QR data URL", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.findUnique.mockResolvedValue({ loginToken: "some-token" } as any);
    const res = await getQr(GET("http://localhost/api/users/u-1/qr"), params());
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data.dataUrl).toMatch(/^data:image/);
  });
});

describe("POST /api/users/[id]/qr", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postQr(POST("http://localhost/api/users/u-1/qr", {}), params());
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN regenerates token and returns new QR", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.update.mockResolvedValue({ id: "u-1", loginToken: "new-token-xyz" } as any);
    const res = await postQr(POST("http://localhost/api/users/u-1/qr", {}), params());
    expect(res.status).toBe(200);
    expect(prismaInstance.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { loginToken: "new-token-xyz" },
    });
    const data = await parseJson(res);
    expect(data.dataUrl).toMatch(/^data:image/);
  });
});
