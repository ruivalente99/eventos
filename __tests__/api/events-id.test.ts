import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, GET, PATCH, DELETE, parseJson } from "./helpers";

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
import { PATCH as patchEvent, DELETE as deleteEvent } from "@/app/api/events/[id]/route";

const mockAuth = vi.mocked(auth);
const params = (id = "event-1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/events/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await patchEvent(PATCH("http://localhost/api/events/event-1", {}), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not event admin or SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null); // no admin role
    const res = await patchEvent(PATCH("http://localhost/api/events/event-1", { name: "New" }), params());
    expect(res.status).toBe(403);
  });

  it("event ADMIN can update event metadata", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue({ role: "ADMIN" } as any);
    prismaInstance.event.update.mockResolvedValue({ id: "event-1", name: "New Name", slug: "new-name" } as any);
    const res = await patchEvent(PATCH("http://localhost/api/events/event-1", { name: "New Name" }), params());
    expect(res.status).toBe(200);
  });

  it("SUPER_ADMIN can update any event", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.update.mockResolvedValue({ id: "event-1", name: "Updated", slug: "updated" } as any);
    const res = await patchEvent(PATCH("http://localhost/api/events/event-1", { active: false }), params());
    expect(res.status).toBe(200);
    expect(prismaInstance.event.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ active: false }) })
    );
  });

  it("slugifies slug field on update", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.update.mockResolvedValue({ id: "event-1", slug: "new-slug" } as any);
    await patchEvent(PATCH("http://localhost/api/events/event-1", { slug: "New Slug!" }), params());
    const call = prismaInstance.event.update.mock.calls[0][0] as any;
    expect(call.data.slug).toBe("new-slug");
  });

  it("only updates provided fields", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.update.mockResolvedValue({} as any);
    await patchEvent(PATCH("http://localhost/api/events/event-1", { active: true }), params());
    const call = prismaInstance.event.update.mock.calls[0][0] as any;
    expect(call.data).toEqual({ active: true });
  });
});

describe("DELETE /api/events/[id]", () => {
  it("returns 403 for non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const res = await deleteEvent(DELETE("http://localhost/api/events/event-1"), params());
    expect(res.status).toBe(403);
  });

  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await deleteEvent(DELETE("http://localhost/api/events/event-1"), params());
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN can delete event", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.event.delete.mockResolvedValue({ id: "event-1" } as any);
    const res = await deleteEvent(DELETE("http://localhost/api/events/event-1"), params());
    expect(res.status).toBe(200);
    expect(prismaInstance.event.delete).toHaveBeenCalledWith({ where: { id: "event-1" } });
  });
});
