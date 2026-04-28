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
import { GET as getEvaluations, POST as postEvaluation } from "@/app/api/evaluations/route";

const mockAuth = vi.mocked(auth);

const mockEvaluation = {
  id: "eval-1",
  courseId: "course-1",
  stationId: "station-1",
  eventId: "event-1",
  jurorId: "jury-1",
  notes: null,
  scores: [{ criteriaId: "c1", score: 80 }],
  course: { id: "course-1", name: "Course A" },
  station: { id: "station-1", name: "Station A" },
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/evaluations", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postEvaluation(POST("http://localhost/api/evaluations", {}));
    expect(res.status).toBe(401);
  });

  it("returns 403 when jury not a member of event", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null);
    const res = await postEvaluation(
      POST("http://localhost/api/evaluations", {
        eventId: "event-1",
        courseId: "course-1",
        stationId: "station-1",
        scores: [{ criteriaId: "c1", score: 80 }],
      })
    );
    expect(res.status).toBe(403);
    const body = await parseJson(res);
    expect(body.error).toMatch(/not a member/i);
  });

  it("creates evaluation for valid jury member", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue({ id: "eu-1", role: "JURY" } as any);
    prismaInstance.evaluation.upsert.mockResolvedValue(mockEvaluation as any);
    const res = await postEvaluation(
      POST("http://localhost/api/evaluations", {
        eventId: "event-1",
        courseId: "course-1",
        stationId: "station-1",
        scores: [{ criteriaId: "c1", score: 80 }],
      })
    );
    expect(res.status).toBe(201);
    const data = await parseJson(res);
    expect(data.id).toBe("eval-1");
  });

  it("upserts (update) when evaluation already exists", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue({ id: "eu-1" } as any);
    prismaInstance.evaluation.upsert.mockResolvedValue({ ...mockEvaluation, scores: [{ criteriaId: "c1", score: 90 }] } as any);
    const res = await postEvaluation(
      POST("http://localhost/api/evaluations", {
        eventId: "event-1",
        courseId: "course-1",
        stationId: "station-1",
        scores: [{ criteriaId: "c1", score: 90 }],
      })
    );
    expect(res.status).toBe(201);
    expect(prismaInstance.evaluation.upsert).toHaveBeenCalled();
    const data = await parseJson(res);
    expect(data.scores[0].score).toBe(90);
  });

  it("sets jurorId to current user id", async () => {
    mockAuth.mockResolvedValue(jurySession("jury-42") as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue({ id: "eu-1" } as any);
    prismaInstance.evaluation.upsert.mockResolvedValue(mockEvaluation as any);
    await postEvaluation(
      POST("http://localhost/api/evaluations", {
        eventId: "event-1", courseId: "course-1", stationId: "station-1",
        scores: [{ criteriaId: "c1", score: 50 }],
      })
    );
    const upsertCall = prismaInstance.evaluation.upsert.mock.calls[0][0] as any;
    expect(upsertCall.create.jurorId).toBe("jury-42");
  });
});

describe("GET /api/evaluations", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getEvaluations(GET("http://localhost/api/evaluations"));
    expect(res.status).toBe(401);
  });

  it("jury can only see own evaluations (no admin role)", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null); // not admin
    prismaInstance.evaluation.findMany.mockResolvedValue([mockEvaluation] as any);
    await getEvaluations(GET("http://localhost/api/evaluations?eventId=event-1"));
    const call = prismaInstance.evaluation.findMany.mock.calls[0][0] as any;
    expect(call.where.jurorId).toBe("jury-1");
  });

  it("SUPER_ADMIN can see all evaluations", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluation.findMany.mockResolvedValue([mockEvaluation] as any);
    await getEvaluations(GET("http://localhost/api/evaluations?eventId=event-1"));
    const call = prismaInstance.evaluation.findMany.mock.calls[0][0] as any;
    expect(call.where.jurorId).toBeUndefined();
  });

  it("filters by query params", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.evaluation.findMany.mockResolvedValue([] as any);
    await getEvaluations(GET("http://localhost/api/evaluations?eventId=ev1&courseId=c1&stationId=s1"));
    const call = prismaInstance.evaluation.findMany.mock.calls[0][0] as any;
    expect(call.where.eventId).toBe("ev1");
    expect(call.where.courseId).toBe("c1");
    expect(call.where.stationId).toBe("s1");
  });

  it("event admin can see all evaluations for their event", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue({ role: "ADMIN" } as any); // is admin
    prismaInstance.evaluation.findMany.mockResolvedValue([mockEvaluation] as any);
    await getEvaluations(GET("http://localhost/api/evaluations?eventId=event-1"));
    const call = prismaInstance.evaluation.findMany.mock.calls[0][0] as any;
    expect(call.where.jurorId).toBeUndefined();
  });
});
