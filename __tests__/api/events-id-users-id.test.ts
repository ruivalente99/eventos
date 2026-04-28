import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, PATCH, DELETE, parseJson } from "./helpers";

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
import { PATCH as patchUser, DELETE as deleteUser } from "@/app/api/events/[id]/users/[userId]/route";

const mockAuth = vi.mocked(auth);
const params = (id = "event-1", userId = "eu-1") => ({ params: Promise.resolve({ id, userId }) });

const mockEventUser = {
  id: "eu-1", role: "JURY", emoji: "😎",
  user: { id: "jury-1", name: "Jury", email: "jury@test.com", loginToken: "abc" },
  station: { id: "station-1", name: "Station A" },
};

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/events/[id]/users/[userId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await patchUser(PATCH("http://localhost/api/events/event-1/users/eu-1", {}), params());
    expect(res.status).toBe(401);
  });

  it("updates emoji only (no stationId/role sent)", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.update.mockResolvedValue({ ...mockEventUser, emoji: "🤖" } as any);
    const res = await patchUser(
      PATCH("http://localhost/api/events/event-1/users/eu-1", { emoji: "🤖" }),
      params()
    );
    expect(res.status).toBe(200);
    const call = prismaInstance.eventUser.update.mock.calls[0][0] as any;
    expect(call.data).toEqual({ emoji: "🤖" });
    // stationId and role should NOT be in data (partial update fix)
    expect(call.data.stationId).toBeUndefined();
    expect(call.data.role).toBeUndefined();
  });

  it("updates stationId and role together", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventUser.update.mockResolvedValue(mockEventUser as any);
    await patchUser(
      PATCH("http://localhost/api/events/event-1/users/eu-1", { stationId: "station-2", role: "ADMIN" }),
      params()
    );
    const call = prismaInstance.eventUser.update.mock.calls[0][0] as any;
    expect(call.data.stationId).toBe("station-2");
    expect(call.data.role).toBe("ADMIN");
  });

  it("sets stationId to null when explicitly passed null", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventUser.update.mockResolvedValue({ ...mockEventUser, station: null } as any);
    await patchUser(
      PATCH("http://localhost/api/events/event-1/users/eu-1", { stationId: null }),
      params()
    );
    const call = prismaInstance.eventUser.update.mock.calls[0][0] as any;
    expect(call.data.stationId).toBeNull();
  });

  it("returns updated eventUser with user + station includes", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.update.mockResolvedValue(mockEventUser as any);
    const res = await patchUser(
      PATCH("http://localhost/api/events/event-1/users/eu-1", { emoji: "🦊" }),
      params()
    );
    const data = await parseJson(res);
    expect(data.user.name).toBe("Jury");
    expect(data.station.name).toBe("Station A");
  });
});

describe("DELETE /api/events/[id]/users/[userId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await deleteUser(DELETE("http://localhost/api/events/event-1/users/eu-1"), params());
    expect(res.status).toBe(401);
  });

  it("removes user from event", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventUser.delete.mockResolvedValue({ id: "eu-1" } as any);
    const res = await deleteUser(DELETE("http://localhost/api/events/event-1/users/eu-1"), params());
    expect(res.status).toBe(200);
    expect(prismaInstance.eventUser.delete).toHaveBeenCalledWith({ where: { id: "eu-1" } });
  });
});
