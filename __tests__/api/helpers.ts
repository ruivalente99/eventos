import { NextRequest } from "next/server";
import { vi } from "vitest";

// ─── Session factories ────────────────────────────────────────────────────────

export const superAdminSession = () => ({
  user: { id: "super-1", name: "Super Admin", email: "super@test.com", globalRole: "SUPER_ADMIN" },
  expires: "2099-01-01",
});

export const jurySession = (id = "jury-1") => ({
  user: { id, name: "Jury User", email: "jury@test.com", globalRole: "USER" },
  expires: "2099-01-01",
});

export const noSession = () => null;

// ─── Request factories ────────────────────────────────────────────────────────

export function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

export const GET = (url: string) => makeRequest("GET", url);
export const POST = (url: string, body: unknown) => makeRequest("POST", url, body);
export const PATCH = (url: string, body: unknown) => makeRequest("PATCH", url, body);
export const DELETE = (url: string) => makeRequest("DELETE", url);

// ─── Prisma mock builder ──────────────────────────────────────────────────────

export function mockPrisma() {
  return {
    event: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    eventUser: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    eventCourse: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    evaluationCriteria: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    evaluation: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    evaluationScore: { deleteMany: vi.fn() },
    station: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    appSetting: { findMany: vi.fn(), upsert: vi.fn() },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function parseJson(res: Response) {
  return res.json();
}
