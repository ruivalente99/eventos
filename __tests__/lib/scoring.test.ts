import { describe, it, expect } from "vitest";
import { computeNormalizedScore, type ScoringCriterion } from "@/lib/scoring";

// Flat criteria (no children)
const flatCriteria: ScoringCriterion[] = [
  { id: "c1", weight: 1, minScore: 0, maxScore: 100, parentId: null },
  { id: "c2", weight: 2, minScore: 0, maxScore: 100, parentId: null },
];

// Hierarchical criteria (parent + children)
const hierarchicalCriteria: ScoringCriterion[] = [
  {
    id: "p1", weight: 35, minScore: 0, maxScore: 100, parentId: null,
    children: [
      { id: "p1c1", weight: 1, minScore: 0, maxScore: 100, parentId: "p1" },
      { id: "p1c2", weight: 1, minScore: 0, maxScore: 100, parentId: "p1" },
    ],
  },
  {
    id: "p2", weight: 50, minScore: 0, maxScore: 100, parentId: null,
    children: [
      { id: "p2c1", weight: 1, minScore: 0, maxScore: 100, parentId: "p2" },
      { id: "p2c2", weight: 2, minScore: 0, maxScore: 100, parentId: "p2" },
    ],
  },
  {
    id: "p3", weight: 15, minScore: 0, maxScore: 100, parentId: null,
    children: [
      { id: "p3c1", weight: 1, minScore: 0, maxScore: 100, parentId: "p3" },
    ],
  },
];

describe("computeNormalizedScore", () => {
  describe("flat criteria", () => {
    it("returns 0 when all scores at minimum", () => {
      const result = computeNormalizedScore(
        [{ criteriaId: "c1", score: 0 }, { criteriaId: "c2", score: 0 }],
        flatCriteria
      );
      expect(result).toBe(0);
    });

    it("returns 100 when all scores at maximum", () => {
      const result = computeNormalizedScore(
        [{ criteriaId: "c1", score: 100 }, { criteriaId: "c2", score: 100 }],
        flatCriteria
      );
      expect(result).toBe(100);
    });

    it("computes weighted average correctly", () => {
      // c1 weight=1, score=50 → 50; c2 weight=2, score=100 → 200
      // numerator = 50*1 + 100*2 = 250; denominator = 100*1 + 100*2 = 300
      // result = 250/300 * 100 ≈ 83.33
      const result = computeNormalizedScore(
        [{ criteriaId: "c1", score: 50 }, { criteriaId: "c2", score: 100 }],
        flatCriteria
      );
      expect(result).toBeCloseTo(83.33, 1);
    });

    it("uses minScore as default for missing scores", () => {
      // Only c1 provided, c2 defaults to minScore (0)
      // numerator = 100*1 + 0*2 = 100; denominator = 100*3 = 300
      const result = computeNormalizedScore(
        [{ criteriaId: "c1", score: 100 }],
        flatCriteria
      );
      expect(result).toBeCloseTo(33.33, 1);
    });

    it("returns 50 when all scores at midpoint", () => {
      const result = computeNormalizedScore(
        [{ criteriaId: "c1", score: 50 }, { criteriaId: "c2", score: 50 }],
        flatCriteria
      );
      expect(result).toBe(50);
    });
  });

  describe("hierarchical criteria", () => {
    it("returns 100 when all children at max", () => {
      const scores = [
        { criteriaId: "p1c1", score: 100 }, { criteriaId: "p1c2", score: 100 },
        { criteriaId: "p2c1", score: 100 }, { criteriaId: "p2c2", score: 100 },
        { criteriaId: "p3c1", score: 100 },
      ];
      expect(computeNormalizedScore(scores, hierarchicalCriteria)).toBe(100);
    });

    it("returns 0 when all children at min", () => {
      const scores = [
        { criteriaId: "p1c1", score: 0 }, { criteriaId: "p1c2", score: 0 },
        { criteriaId: "p2c1", score: 0 }, { criteriaId: "p2c2", score: 0 },
        { criteriaId: "p3c1", score: 0 },
      ];
      expect(computeNormalizedScore(scores, hierarchicalCriteria)).toBe(0);
    });

    it("respects child weights within a parent group", () => {
      // p2: child1 weight=1 score=0, child2 weight=2 score=100
      // p2 avg = (0*1 + 100*2)/(1+2) = 200/3 ≈ 66.67
      // p1: all 0 → avg = 0; p3: all 0 → avg = 0
      // total = (0*35 + 66.67*50 + 0*15) / (100*35 + 100*50 + 100*15)
      //       = 3333.3 / 10000 = 33.33
      const scores = [
        { criteriaId: "p1c1", score: 0 }, { criteriaId: "p1c2", score: 0 },
        { criteriaId: "p2c1", score: 0 }, { criteriaId: "p2c2", score: 100 },
        { criteriaId: "p3c1", score: 0 },
      ];
      const result = computeNormalizedScore(scores, hierarchicalCriteria);
      expect(result).toBeCloseTo(33.33, 1);
    });

    it("weights parent groups correctly (35/50/15 distribution)", () => {
      // All p1 children = 100, everything else = 0
      // p1 avg = 100, p2 avg = 0, p3 avg = 0
      // total = (100*35 + 0 + 0) / 10000 = 3500/10000 = 35%
      const scores = [
        { criteriaId: "p1c1", score: 100 }, { criteriaId: "p1c2", score: 100 },
        { criteriaId: "p2c1", score: 0 }, { criteriaId: "p2c2", score: 0 },
        { criteriaId: "p3c1", score: 0 },
      ];
      expect(computeNormalizedScore(scores, hierarchicalCriteria)).toBeCloseTo(35, 1);
    });
  });

  describe("edge cases", () => {
    it("returns 0 for empty criteria array", () => {
      expect(computeNormalizedScore([], [])).toBe(0);
    });

    it("handles single criterion", () => {
      const single: ScoringCriterion[] = [
        { id: "x", weight: 1, minScore: 0, maxScore: 10, parentId: null },
      ];
      expect(computeNormalizedScore([{ criteriaId: "x", score: 7 }], single)).toBe(70);
    });

    it("handles non-zero minScore in normalization", () => {
      const criteria: ScoringCriterion[] = [
        { id: "x", weight: 1, minScore: 0, maxScore: 10, parentId: null },
      ];
      const result = computeNormalizedScore([{ criteriaId: "x", score: 5 }], criteria);
      expect(result).toBe(50);
    });
  });
});
