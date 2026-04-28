import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, GET, POST, parseJson } from "./helpers";

var prismaInstance: any;
vi.mock("@/lib/prisma", () => {
  prismaInstance = {
    event: { findMany: vi.fn(), create: vi.fn() },
    eventUser: { findMany: vi.fn() },
  };
  return { prisma: prismaInstance };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { GET as getEvents, POST as postEvent } from "@/app/api/events/route";

const mockAuth = auth as any;

const mockEvent = {
  id: "event-1",
  name: "Latada 2026",
  slug: "latada-2026",
  active: true,
  emoji: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/events", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getEvents(GET("http://localhost/api/events"));
    expect(res.status).toBe(401);
  });

  it("SUPER_ADMIN gets all events", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.findMany.mockResolvedValue([mockEvent] as any);
    const res = await getEvents(GET("http://localhost/api/events"));
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Latada 2026");
  });

  it("jury user gets only assigned events", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findMany.mockResolvedValue([{ event: mockEvent }] as any);
    const res = await getEvents(GET("http://localhost/api/events"));
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toHaveLength(1);
  });
});

describe("POST /api/events", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postEvent(POST("http://localhost/api/events", { name: "New", slug: "new" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const res = await postEvent(POST("http://localhost/api/events", { name: "New", slug: "new" }));
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN creates event", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.create.mockResolvedValue(mockEvent as any);
    const res = await postEvent(POST("http://localhost/api/events", { name: "Latada 2026", slug: "latada-2026" }));
    expect(res.status).toBe(201);
    const data = await parseJson(res);
    expect(data.slug).toBe("latada-2026");
  });

  it("auto-slugifies name if slug not provided", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.create.mockResolvedValue(mockEvent as any);
    await postEvent(POST("http://localhost/api/events", { name: "Latada 2026" }));
    const createCall = prismaInstance.event.create.mock.calls[0][0] as any;
    expect(createCall.data.slug).toBe("latada-2026");
  });
});
