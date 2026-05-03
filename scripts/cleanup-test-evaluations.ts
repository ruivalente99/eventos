import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const evaluations = await prisma.evaluation.findMany({
    include: {
      scores: {
        include: { criteria: true },
      },
      course: true,
      juror: { select: { email: true, name: true } },
    },
  });

  const toDelete: string[] = [];

  for (const evaluation of evaluations) {
    const allMax = evaluation.scores.every(
      (s) => s.score === s.criteria.maxScore
    );
    if (!allMax) continue;

    const isDesportoC2CV =
      evaluation.course.name === "Desporto" &&
      evaluation.juror.email === "cv@cv.pt";

    if (isDesportoC2CV) {
      console.log(
        `Keeping: ${evaluation.course.name} by ${evaluation.juror.name} (${evaluation.juror.email})`
      );
      continue;
    }

    toDelete.push(evaluation.id);
    console.log(
      `Deleting: ${evaluation.course.name} by ${evaluation.juror.name} (${evaluation.juror.email})`
    );
  }

  if (toDelete.length === 0) {
    console.log("No 100% test evaluations found.");
    return;
  }

  const { count } = await prisma.evaluation.deleteMany({
    where: { id: { in: toDelete } },
  });

  console.log(`\nDeleted ${count} test evaluations.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
