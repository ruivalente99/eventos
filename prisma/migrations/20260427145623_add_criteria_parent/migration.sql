-- AlterTable
ALTER TABLE "EvaluationCriteria" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "EvaluationCriteria" ADD CONSTRAINT "EvaluationCriteria_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EvaluationCriteria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
