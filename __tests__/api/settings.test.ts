import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, GET, PATCH, parseJson } from "./helpers";

const prismaInstance = vi.hoisted(() => ({
  event: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  eventUser: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  eventCourse: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  evaluationCriteria: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  evaluation: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), count: vi.fn() },
  evaluationScore: { deleteMany: vi.fn() },
  station: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  user: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  appSetting: { findMany: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaInstance }));

import { auth } from "@/lib/auth";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";

const mockAuth = vi.mocked(auth);

beforeEach(() => vi.clearAllMocks());

describe("GET /api/settings", () => {
  it("returns settings as key-value object (public endpoint)", async () => {
    prismaInstance.appSetting.findMany.mockResolvedValue([
      { key: "themesEnabled", value: "true" },
      { key: "anotherSetting", value: "false" },
    ] as any);
    const res = await getSettings();
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toEqual({ themesEnabled: "true", anotherSetting: "false" });
  });

  it("returns empty object when no settings exist", async () => {
    prismaInstance.appSetting.findMany.mockResolvedValue([] as any);
    const res = await getSettings();
    const data = await parseJson(res);
    expect(data).toEqual({});
  });
});

describe("PATCH /api/settings", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await patchSettings(PATCH("http://localhost/api/settings", { key: "themesEnabled", value: "true" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const res = await patchSettings(PATCH("http://localhost/api/settings", { key: "themesEnabled", value: "true" }));
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN can upsert a setting", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.appSetting.upsert.mockResolvedValue({ key: "themesEnabled", value: "true" } as any);
    const res = await patchSettings(
      PATCH("http://localhost/api/settings", { key: "themesEnabled", value: "true" })
    );
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toEqual({ key: "themesEnabled", value: "true" });
  });

  it("upsert uses correct key/value", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.appSetting.upsert.mockResolvedValue({ key: "myKey", value: "myVal" } as any);
    await patchSettings(PATCH("http://localhost/api/settings", { key: "myKey", value: "myVal" }));
    expect(prismaInstance.appSetting.upsert).toHaveBeenCalledWith({
      where: { key: "myKey" },
      create: { key: "myKey", value: "myVal" },
      update: { value: "myVal" },
    });
  });
});
