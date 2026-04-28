import { describe, it, expect, vi, beforeEach } from "vitest";
import { superAdminSession, jurySession, noSession, GET, POST, parseJson } from "./helpers";

var prismaInstance: any;
vi.mock("@/lib/prisma", () => {
  prismaInstance = {
    eventUser: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    user: { upsert: vi.fn() },
  };
  return { prisma: prismaInstance };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-pw") } }));
vi.mock("@/lib/token", () => ({ generateLoginToken: vi.fn().mockReturnValue("tok-abc") }));

import { auth } from "@/lib/auth";
import { GET as getUsers, POST as postUser } from "@/app/api/events/[id]/users/route";

const mockAuth = auth as any;
const params = (id = "event-1") => ({ params: Promise.resolve({ id }) });

const mockEventUser = {
  id: "eu-1",
  userId: "u-1",
  eventId: "event-1",
  role: "JURY",
  stationId: null,
  user: { id: "u-1", name: "Test Jury", email: "jury@test.com", loginToken: "tok-abc" },
  station: null,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/events/[id]/users", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getUsers(GET("http://localhost/api/events/event-1/users"), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin jury", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null);
    const res = await getUsers(GET("http://localhost/api/events/event-1/users"), params());
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN gets all users", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventUser.findMany.mockResolvedValue([mockEventUser] as any);
    const res = await getUsers(GET("http://localhost/api/events/event-1/users"), params());
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toHaveLength(1);
  });

  it("event ADMIN gets users", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue({ role: "ADMIN" } as any);
    prismaInstance.eventUser.findMany.mockResolvedValue([mockEventUser] as any);
    const res = await getUsers(GET("http://localhost/api/events/event-1/users"), params());
    expect(res.status).toBe(200);
  });
});

describe("POST /api/events/[id]/users", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await postUser(
      POST("http://localhost/api/events/event-1/users", { name: "X", email: "x@x.com", password: "pw", role: "JURY" }),
      params()
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    prismaInstance.eventUser.findFirst.mockResolvedValue(null);
    const res = await postUser(
      POST("http://localhost/api/events/event-1/users", { name: "X", email: "x@x.com", password: "pw", role: "JURY" }),
      params()
    );
    expect(res.status).toBe(403);
  });

  it("creates new user and event role", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.upsert.mockResolvedValue({ id: "u-new" } as any);
    prismaInstance.eventUser.create.mockResolvedValue(mockEventUser as any);
    const res = await postUser(
      POST("http://localhost/api/events/event-1/users", { name: "New", email: "new@test.com", password: "pw", role: "JURY" }),
      params()
    );
    expect(res.status).toBe(201);
    expect(prismaInstance.user.upsert).toHaveBeenCalled();
    expect(prismaInstance.eventUser.create).toHaveBeenCalled();
  });

  it("new user upsert includes loginToken", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.upsert.mockResolvedValue({ id: "u-new" } as any);
    prismaInstance.eventUser.create.mockResolvedValue(mockEventUser as any);
    await postUser(
      POST("http://localhost/api/events/event-1/users", { name: "New", email: "new@test.com", password: "pw", role: "JURY" }),
      params()
    );
    const upsertCall = prismaInstance.user.upsert.mock.calls[0][0] as any;
    expect(upsertCall.create.loginToken).toBeDefined();
    expect(upsertCall.update).toEqual({});
  });

  it("existing user skips user creation", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.eventUser.create.mockResolvedValue(mockEventUser as any);
    await postUser(
      POST("http://localhost/api/events/event-1/users", { existingUserId: "u-existing", role: "ADMIN" }),
      params()
    );
    expect(prismaInstance.user.upsert).not.toHaveBeenCalled();
    const createCall = prismaInstance.eventUser.create.mock.calls[0][0] as any;
    expect(createCall.data.userId).toBe("u-existing");
  });

  it("assigns stationId when provided", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.upsert.mockResolvedValue({ id: "u-new" } as any);
    prismaInstance.eventUser.create.mockResolvedValue({ ...mockEventUser, stationId: "s-1" } as any);
    await postUser(
      POST("http://localhost/api/events/event-1/users", { name: "X", email: "x@x.com", password: "pw", role: "JURY", stationId: "s-1" }),
      params()
    );
    const createCall = prismaInstance.eventUser.create.mock.calls[0][0] as any;
    expect(createCall.data.stationId).toBe("s-1");
  });

  it("response includes user loginToken", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.upsert.mockResolvedValue({ id: "u-new" } as any);
    prismaInstance.eventUser.create.mockResolvedValue(mockEventUser as any);
    const res = await postUser(
      POST("http://localhost/api/events/event-1/users", { name: "New", email: "new@test.com", password: "pw", role: "JURY" }),
      params()
    );
    const data = await parseJson(res);
    expect(data.user.loginToken).toBeDefined();
  });
});
