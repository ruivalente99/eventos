import { describe, it, expect } from "vitest";
import { slugify, codeFromName } from "@/lib/utils";

describe("slugify", () => {
  it("converts spaces to hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  it("lowercases input", () => {
    expect(slugify("Latada 2026")).toBe("latada-2026");
  });

  it("removes diacritics", () => {
    expect(slugify("Cortejo 2026")).toBe("cortejo-2026");
    expect(slugify("coreografia")).toBe("coreografia");
  });

  it("strips special characters", () => {
    expect(slugify("hello/world!")).toBe("helloworld");
  });

  it("collapses multiple spaces/hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles already-valid slug", () => {
    expect(slugify("latada-2026")).toBe("latada-2026");
  });
});

describe("codeFromName", () => {
  it("uppercases and replaces spaces with underscores", () => {
    expect(codeFromName("tema satira")).toBe("TEMA_SATIRA");
  });

  it("strips slashes and diacritics", () => {
    const result = codeFromName("Crítica/Sátira");
    expect(result).toBe("CRITICASATIRA");
  });

  it("collapses multiple separators", () => {
    const result = codeFromName("tema  /  sátira");
    expect(result).toBe("TEMA_SATIRA");
  });

  it("handles single word", () => {
    expect(codeFromName("coreografia")).toBe("COREOGRAFIA");
  });
});
