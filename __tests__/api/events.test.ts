import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, GET, POST, parseJson } from "./helpers";

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
import { GET as getEvents, POST as postEvent } from "@/app/api/events/route";

const mockAuth = vi.mocked(auth);

beforeEach(() => vi.clearAllMocks());

describe("GET /api/events", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getEvents();
    expect(res.status).toBe(401);
  });

  it("SUPER_ADMIN gets all events with counts", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    const mockEvents = [
      { id: "e1", name: "Event 1", slug: "event-1", _count: { users: 5, courses: 10, stations: 3 } },
    ];
    prismaInstance.event.findMany.mockResolvedValue(mockEvents as any);
    const res = await getEvents();
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toEqual(mockEvents);
    expect(prismaInstance.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ _count: expect.any(Object) }) })
    );
  });

  it("JURY user gets only their assigned events", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const mockRoles = [
      { event: { id: "e1", name: "Event 1", slug: "event-1" } },
    ];
    prismaInstance.eventUser.findMany.mockResolvedValue(mockRoles as any);
    const res = await getEvents();
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toEqual([{ id: "e1", name: "Event 1", slug: "event-1" }]);
    expect(prismaInstance.eventUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "jury-1" } })
    );
  });
});

describe("POST /api/events", () => {
  it("returns 403 when authenticated as non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const res = await postEvent(POST("http://localhost/api/events", { name: "Test", slug: "test" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postEvent(POST("http://localhost/api/events", { name: "Test", slug: "test" }));
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN creates event with slugified name", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    const mockEvent = {
      id: "e1", name: "Latada 2026", slug: "latada-2026",
      _count: { users: 0, courses: 0, stations: 0 },
    };
    prismaInstance.event.create.mockResolvedValue(mockEvent as any);
    const res = await postEvent(POST("http://localhost/api/events", { name: "Latada 2026", slug: "Latada 2026" }));
    expect(res.status).toBe(201);
    const data = await parseJson(res);
    expect(data.slug).toBe("latada-2026");
  });

  it("auto-generates slug from name when no slug provided", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    const mockEvent = { id: "e1", name: "Cortejo 2026", slug: "cortejo-2026", _count: { users: 0, courses: 0, stations: 0 } };
    prismaInstance.event.create.mockResolvedValue(mockEvent as any);
    await postEvent(POST("http://localhost/api/events", { name: "Cortejo 2026" }));
    expect(prismaInstance.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "cortejo-2026" }),
      })
    );
  });
});
