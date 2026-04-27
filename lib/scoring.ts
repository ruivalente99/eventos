export interface ScoringCriterion {
  id: string;
  weight: number;
  minScore: number;
  maxScore: number;
  parentId: string | null;
  children?: ScoringCriterion[];
}

export function computeNormalizedScore(
  evalScores: { criteriaId: string; score: number }[],
  criteria: ScoringCriterion[]
): number {
  const roots = criteria.filter((c) => c.parentId === null);
  let numerator = 0;
  let denominator = 0;

  for (const root of roots) {
    if (root.children && root.children.length > 0) {
      const childWeightSum = root.children.reduce((s, c) => s + c.weight, 0);
      const childScoreSum = root.children.reduce((s, c) => {
        const score = evalScores.find((es) => es.criteriaId === c.id)?.score ?? c.minScore;
        return s + score * c.weight;
      }, 0);
      const childAvg = childWeightSum > 0 ? childScoreSum / childWeightSum : root.minScore;
      numerator += childAvg * root.weight;
    } else {
      const score = evalScores.find((es) => es.criteriaId === root.id)?.score ?? root.minScore;
      numerator += score * root.weight;
    }
    denominator += root.maxScore * root.weight;
  }

  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}
