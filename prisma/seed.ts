import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "..", "prisma", "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("🌱 Seeding database...");

  // Super admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@cvutad.pt" },
    update: {},
    create: { name: "Super Admin", email: "admin@cvutad.pt", password: adminPassword, globalRole: "SUPER_ADMIN" },
  });
  console.log("✅ Super admin:", admin.email);

  // Demo event: Latada
  const latada = await prisma.event.upsert({
    where: { slug: "latada" },
    update: {},
    create: { name: "Latada 2026", slug: "latada", description: "Cortejo académico da UTAD", active: true },
  });
  console.log("✅ Event:", latada.name);

  // Stations
  const tribunal = await prisma.station.upsert({
    where: { eventId_name: { eventId: latada.id, name: "Tribunal" } },
    update: {},
    create: { eventId: latada.id, name: "Tribunal", weight: 1.0 },
  });
  const pioledo = await prisma.station.upsert({
    where: { eventId_name: { eventId: latada.id, name: "Pioledo" } },
    update: {},
    create: { eventId: latada.id, name: "Pioledo", weight: 1.0 },
  });
  console.log("✅ Stations: Tribunal, Pioledo");

  // Criteria
  const criteriaData = [
    { name: "Tema / Sátira", code: "TEMA", weight: 1.0, minScore: 0, maxScore: 100, displayOrder: 0, type: "CATEGORY" as const },
    { name: "Letra", code: "LETRA", weight: 1.0, minScore: 0, maxScore: 100, displayOrder: 1, type: "CATEGORY" as const },
    { name: "Fato", code: "FATO", weight: 1.0, minScore: 0, maxScore: 100, displayOrder: 2, type: "CATEGORY" as const },
    { name: "Coreografia", code: "COREO", weight: 1.0, minScore: 0, maxScore: 100, displayOrder: 3, type: "CATEGORY" as const },
    { name: "Saudação", code: "SAUDA", weight: 0.5, minScore: 0, maxScore: 5, displayOrder: 4, type: "BONUS" as const },
  ];

  for (const c of criteriaData) {
    await prisma.evaluationCriteria.upsert({
      where: { eventId_code: { eventId: latada.id, code: c.code } },
      update: {},
      create: { ...c, eventId: latada.id },
    });
  }
  console.log("✅ Criteria: 4 categories + 1 bonus");

  // Demo jury users
  const juryPassword = await bcrypt.hash("jury123", 12);
  const jury1 = await prisma.user.upsert({
    where: { email: "tribunal@cvutad.pt" },
    update: {},
    create: { name: "Júri Tribunal", email: "tribunal@cvutad.pt", password: juryPassword },
  });
  const jury2 = await prisma.user.upsert({
    where: { email: "pioledo@cvutad.pt" },
    update: {},
    create: { name: "Júri Pioledo", email: "pioledo@cvutad.pt", password: juryPassword },
  });

  await prisma.eventUser.upsert({
    where: { userId_eventId: { userId: jury1.id, eventId: latada.id } },
    update: {},
    create: { userId: jury1.id, eventId: latada.id, role: "JURY", stationId: tribunal.id },
  });
  await prisma.eventUser.upsert({
    where: { userId_eventId: { userId: jury2.id, eventId: latada.id } },
    update: {},
    create: { userId: jury2.id, eventId: latada.id, role: "JURY", stationId: pioledo.id },
  });
  console.log("✅ Demo jury: tribunal@cvutad.pt / pioledo@cvutad.pt");

  // Global courses
  const courseNames = ["Engenharia Informática", "Medicina Veterinária", "Agronomia", "Ciências Biológicas", "Enfermagem"];
  for (const name of courseNames) {
    await prisma.globalCourse.upsert({ where: { name }, update: {}, create: { name } });
  }

  let order = 1;
  for (const name of courseNames) {
    const existing = await prisma.eventCourse.findFirst({ where: { eventId: latada.id, name } });
    if (!existing) {
      await prisma.eventCourse.create({ data: { eventId: latada.id, name, entryOrder: order } });
    }
    order++;
  }
  console.log("✅ Courses: 5 demo courses");

  console.log("\n🎉 Seed complete!\n");
  console.log("  Super Admin: admin@cvutad.pt / admin123");
  console.log("  Jury 1:      tribunal@cvutad.pt / jury123  (Tribunal)");
  console.log("  Jury 2:      pioledo@cvutad.pt / jury123   (Pioledo)");
  console.log("  Event URL:   http://localhost:3000/e/latada");
}

main().catch(console.error).finally(() => prisma.$disconnect());
