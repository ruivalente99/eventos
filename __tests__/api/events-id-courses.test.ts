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
import { GET as getCourses, POST as postCourse } from "@/app/api/events/[id]/courses/route";

const mockAuth = vi.mocked(auth);
const params = (id = "event-1") => ({ params: Promise.resolve({ id }) });

const mockCourse = {
  id: "course-1",
  eventId: "event-1",
  name: "Course A",
  entryOrder: 1,
  disqualified: false,
  globalCourseId: null,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/events/[id]/courses", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getCourses(GET("http://localhost/api/events/event-1/courses"), params());
    expect(res.status).toBe(401);
  });

  it("returns courses ordered by entryOrder", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventCourse.findMany.mockResolvedValue([mockCourse] as any);
    const res = await getCourses(GET("http://localhost/api/events/event-1/courses"), params());
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Course A");
  });
});

describe("POST /api/events/[id]/courses", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postCourse(
      POST("http://localhost/api/events/event-1/courses", { name: "New" }),
      params()
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null);
    const res = await postCourse(
      POST("http://localhost/api/events/event-1/courses", { name: "New" }),
      params()
    );
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN creates course", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventCourse.findMany.mockResolvedValue([]);
    prismaInstance.eventCourse.create.mockResolvedValue(mockCourse as any);
    const res = await postCourse(
      POST("http://localhost/api/events/event-1/courses", { name: "Course A" }),
      params()
    );
    expect(res.status).toBe(201);
    const data = await parseJson(res);
    expect(data.name).toBe("Course A");
  });

  it("auto-assigns entryOrder when not provided", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventCourse.findFirst.mockResolvedValue({ entryOrder: 3 } as any);
    prismaInstance.eventCourse.create.mockResolvedValue({ ...mockCourse, entryOrder: 4 } as any);
    await postCourse(
      POST("http://localhost/api/events/event-1/courses", { name: "New" }),
      params()
    );
    const createCall = prismaInstance.eventCourse.create.mock.calls[0][0] as any;
    expect(createCall.data.entryOrder).toBe(4);
  });

  it("first course gets entryOrder 1", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventCourse.findFirst.mockResolvedValue(null);
    prismaInstance.eventCourse.create.mockResolvedValue({ ...mockCourse, entryOrder: 1 } as any);
    await postCourse(
      POST("http://localhost/api/events/event-1/courses", { name: "First" }),
      params()
    );
    const createCall = prismaInstance.eventCourse.create.mock.calls[0][0] as any;
    expect(createCall.data.entryOrder).toBe(1);
  });

  it("respects explicitly provided entryOrder", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventCourse.create.mockResolvedValue({ ...mockCourse, entryOrder: 99 } as any);
    await postCourse(
      POST("http://localhost/api/events/event-1/courses", { name: "X", entryOrder: 99 }),
      params()
    );
    const createCall = prismaInstance.eventCourse.create.mock.calls[0][0] as any;
    expect(createCall.data.entryOrder).toBe(99);
  });
});
