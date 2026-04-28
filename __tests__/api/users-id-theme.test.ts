import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, PATCH, parseJson } from "./helpers";

var prismaInstance: any;
vi.mock("@/lib/prisma", () => {
  prismaInstance = {
    event: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    eventUser: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    appSetting: { findMany: vi.fn(), upsert: vi.fn() },
  };
  return { prisma: prismaInstance };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { PATCH as patchTheme } from "@/app/api/users/[id]/theme/route";

const mockAuth = auth as any;
const params = (id = "u-1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/users/[id]/theme", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme: "dark" }), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when patching another user's theme", async () => {
    mockAuth.mockResolvedValue(jurySession("other-user") as any);
    const res = await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme: "dark" }), params());
    expect(res.status).toBe(403);
  });

  it("user can update own theme", async () => {
    mockAuth.mockResolvedValue(jurySession("u-1") as any);
    prismaInstance.user.update.mockResolvedValue({ id: "u-1", theme: "dark" } as any);
    const res = await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme: "dark" }), params());
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data.theme).toBe("dark");
  });

  it("SUPER_ADMIN can update any user theme", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.update.mockResolvedValue({ id: "u-1", theme: "midnight-blue" } as any);
    const res = await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme: "midnight-blue" }), params());
    expect(res.status).toBe(200);
  });

  it("rejects invalid theme", async () => {
    mockAuth.mockResolvedValue(jurySession("u-1") as any);
    const res = await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme: "rainbow" }), params());
    expect(res.status).toBe(400);
  });

  it("accepts all valid themes", async () => {
    for (const theme of ["light", "dark", "midnight-blue"]) {
      mockAuth.mockResolvedValue(jurySession("u-1") as any);
      prismaInstance.user.update.mockResolvedValue({ theme } as any);
      const res = await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme }), params());
      expect(res.status).toBe(200);
    }
  });

  it("saves theme to DB", async () => {
    mockAuth.mockResolvedValue(jurySession("u-1") as any);
    prismaInstance.user.update.mockResolvedValue({ theme: "dark" } as any);
    await patchTheme(PATCH("http://localhost/api/users/u-1/theme", { theme: "dark" }), params());
    expect(prismaInstance.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { theme: "dark" },
    });
  });
});
