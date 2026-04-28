// Mock next/cache to avoid Next.js runtime requirements in tests
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));
