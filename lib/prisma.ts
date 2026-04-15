import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  // For relative file: URLs, resolve to absolute path for libsql
  let url = rawUrl;
  if (rawUrl.startsWith("file:./") || rawUrl.startsWith("file:../")) {
    const absPath = path.resolve(process.cwd(), rawUrl.replace("file:", ""));
    url = `file:${absPath}`;
  }
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
