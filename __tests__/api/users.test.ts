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
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-pw") } }));
vi.mock("@/lib/token", () => ({ generateLoginToken: vi.fn().mockReturnValue("abc".repeat(21) + "a") }));

import { auth } from "@/lib/auth";
import { GET as getUsers, POST as postUser } from "@/app/api/users/route";

const mockAuth = vi.mocked(auth);

const mockUser = {
  id: "u1", name: "Test User", email: "test@test.com",
  globalRole: "USER", createdAt: new Date().toISOString(), loginToken: "token-abc",
  eventRoles: [],
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users", () => {
  it("returns 403 for non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const res = await getUsers();
    expect(res.status).toBe(403);
  });

  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(noSession() as any);
    const res = await getUsers();
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN gets all users", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.findMany.mockResolvedValue([mockUser] as any);
    const res = await getUsers();
    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test User");
  });
});

describe("POST /api/users", () => {
  it("returns 403 for non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue(jurySession() as any);
    const res = await postUser(POST("http://localhost/api/users", { name: "A", email: "a@a.com", password: "pass" }));
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN creates user with hashed password", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.create.mockResolvedValue(mockUser as any);
    const res = await postUser(
      POST("http://localhost/api/users", { name: "New User", email: "new@test.com", password: "secret123" })
    );
    expect(res.status).toBe(201);
    const call = prismaInstance.user.create.mock.calls[0][0] as any;
    expect(call.data.password).toBe("hashed-pw");
    expect(call.data.email).toBe("new@test.com");
  });

  it("user gets loginToken on creation", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.create.mockResolvedValue(mockUser as any);
    await postUser(
      POST("http://localhost/api/users", { name: "U", email: "u@u.com", password: "pw" })
    );
    const call = prismaInstance.user.create.mock.calls[0][0] as any;
    expect(call.data.loginToken).toBeDefined();
    expect(typeof call.data.loginToken).toBe("string");
  });

  it("defaults globalRole to USER when not provided", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.create.mockResolvedValue(mockUser as any);
    await postUser(
      POST("http://localhost/api/users", { name: "U", email: "u@u.com", password: "pw" })
    );
    const call = prismaInstance.user.create.mock.calls[0][0] as any;
    expect(call.data.globalRole).toBe("USER");
  });

  it("respects explicitly set globalRole", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.create.mockResolvedValue({ ...mockUser, globalRole: "SUPER_ADMIN" } as any);
    await postUser(
      POST("http://localhost/api/users", { name: "Admin", email: "admin@test.com", password: "pw", globalRole: "SUPER_ADMIN" })
    );
    const call = prismaInstance.user.create.mock.calls[0][0] as any;
    expect(call.data.globalRole).toBe("SUPER_ADMIN");
  });

  it("does not include password in response (select)", async () => {
    mockAuth.mockResolvedValue(superAdminSession() as any);
    prismaInstance.user.create.mockResolvedValue(mockUser as any);
    const call_check = prismaInstance.user.create.mock;
    await postUser(POST("http://localhost/api/users", { name: "U", email: "u@u.com", password: "pw" }));
    const call = prismaInstance.user.create.mock.calls[0][0] as any;
    expect(call.select.password).toBeUndefined();
  });
});
