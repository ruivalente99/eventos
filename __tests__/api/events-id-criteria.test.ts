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
import { GET as getCriteria, POST as postCriterion } from "@/app/api/events/[id]/criteria/route";

const mockAuth = vi.mocked(auth);
const params = (id = "event-1") => ({ params: Promise.resolve({ id }) });

const mockCriterion = {
  id: "c-1",
  eventId: "event-1",
  parentId: null,
  name: "Technical",
  code: "TEC",
  weight: 0.5,
  minScore: 0,
  maxScore: 100,
  displayOrder: 0,
  type: "CATEGORY",
  active: true,
  children: [],
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/events/[id]/criteria", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getCriteria(GET("http://localhost/api/events/event-1/criteria"), params());
    expect(res.status).toBe(401);
  });

  it("returns criteria list ordered by displayOrder", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.evaluationCriteria.findMany.mockResolvedValue([mockCriterion] as any);
    const res = await getCriteria(GET("http://localhost/api/events/event-1/criteria"), params());
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toHaveLength(1);
    expect(data[0].code).toBe("TEC");
  });

  it("includes children in response", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const withChildren = {
      ...mockCriterion,
      children: [{ id: "c-2", name: "Sub", code: "SUB", weight: 1, displayOrder: 0 }],
    };
    prismaInstance.evaluationCriteria.findMany.mockResolvedValue([withChildren] as any);
    const res = await getCriteria(GET("http://localhost/api/events/event-1/criteria"), params());
    const data = await parseJson(res);
    expect(data[0].children).toHaveLength(1);
  });
});

describe("POST /api/events/[id]/criteria", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "Tech", code: "TEC" }),
      params()
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null);
    const res = await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "Tech", code: "TEC" }),
      params()
    );
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN creates criterion", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluationCriteria.findFirst.mockResolvedValue(null);
    prismaInstance.evaluationCriteria.create.mockResolvedValue(mockCriterion as any);
    const res = await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "Technical", code: "TEC", weight: 0.5 }),
      params()
    );
    expect(res.status).toBe(201);
    const data = await parseJson(res);
    expect(data.code).toBe("TEC");
  });

  it("auto-increments displayOrder", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluationCriteria.findFirst.mockResolvedValue({ displayOrder: 2 } as any);
    prismaInstance.evaluationCriteria.create.mockResolvedValue({ ...mockCriterion, displayOrder: 3 } as any);
    await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "New", code: "NEW" }),
      params()
    );
    const createCall = prismaInstance.evaluationCriteria.create.mock.calls[0][0] as any;
    expect(createCall.data.displayOrder).toBe(3);
  });

  it("first criterion gets displayOrder 0", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluationCriteria.findFirst.mockResolvedValue(null);
    prismaInstance.evaluationCriteria.create.mockResolvedValue({ ...mockCriterion, displayOrder: 0 } as any);
    await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "First", code: "FST" }),
      params()
    );
    const createCall = prismaInstance.evaluationCriteria.create.mock.calls[0][0] as any;
    expect(createCall.data.displayOrder).toBe(0);
  });

  it("accepts parentId for subcriteria", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluationCriteria.findFirst.mockResolvedValue(null);
    prismaInstance.evaluationCriteria.create.mockResolvedValue({ ...mockCriterion, parentId: "c-parent" } as any);
    await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "Sub", code: "SUB", parentId: "c-parent" }),
      params()
    );
    const createCall = prismaInstance.evaluationCriteria.create.mock.calls[0][0] as any;
    expect(createCall.data.parentId).toBe("c-parent");
  });

  it("defaults weight to 1.0 when not provided", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluationCriteria.findFirst.mockResolvedValue(null);
    prismaInstance.evaluationCriteria.create.mockResolvedValue(mockCriterion as any);
    await postCriterion(
      POST("http://localhost/api/events/event-1/criteria", { name: "X", code: "X" }),
      params()
    );
    const createCall = prismaInstance.evaluationCriteria.create.mock.calls[0][0] as any;
    expect(createCall.data.weight).toBe(1.0);
  });
});
