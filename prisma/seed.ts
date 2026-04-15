import "dotenv/config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


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

  // Demo event: Cortejo
  const cortejo = await prisma.event.upsert({
    where: { slug: "cortejo-2026" },
    update: {},
    create: { name: "Cortejo 2026", slug: "cortejo", description: "Cortejo académico da UTAD", active: true },
  });
  console.log("✅ Event:", cortejo.name);

  // Stations
  const tribunal = await prisma.station.upsert({
    where: { eventId_name: { eventId: cortejo.id, name: "Tribunal" } },
    update: {},
    create: { eventId: cortejo.id, name: "Tribunal", weight: 1.0 },
  });
  const pioledo = await prisma.station.upsert({
    where: { eventId_name: { eventId: cortejo.id, name: "Pioledo" } },
    update: {},
    create: { eventId: cortejo.id, name: "Pioledo", weight: 1.0 },
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
      where: { eventId_code: { eventId: cortejo.id, code: c.code } },
      update: {},
      create: { ...c, eventId: cortejo.id },
    });
  }
  console.log("✅ Criteria: 4 categories + 1 bonus");

  // Global courses
  /**
   * 
   * Medicina Veterinária
Ciência Animal
Gestão
Serviço Social
Enfermagem
Genética e Biotecnologia 
Economia
Ciências da Nutrição
Línguas, Literaturas e Culturas / Línguas e Relações Empresariais
Psicologia
Biologia
Animação Sociocultural
Ciências Biomédicas
Educação Básica
Design Sustentável
Bioquímica
Eng. e Gestão Industrial
Biologia e Geologia
Teatro e Artes Performativas
Eng. Biomédica
Eng. Informática
Turismo
Comunicação e Multimédia
Matemática Aplicada e Ciências de Dados
Ciências da Comunicação
Bioengenharia
Cultura e Transformação Digital
Eng. Mecânica / Eng. Física
Enologia
Agronomia
Eng. Eletrotécnica e de Computadores
Desporto
Imperialis
Eng. Civil
Ciências do Ambiente
   */
  const courseNames = [
    "Medicina Veterinária",
    "Ciência Animal",
    "Gestão",
    "Serviço Social",
    "Enfermagem",
    "Genética e Biotecnologia",
    "Economia",
    "Ciências da Nutrição",
    "Línguas, Literaturas e Culturas / Línguas e Relações Empresariais",
    "Psicologia",
    "Biologia",
    "Animação Sociocultural",
    "Ciências Biomédicas",
    "Educação Básica",
    "Design Sustentável",
    "Bioquímica",
    "Eng. e Gestão Industrial",
    "Biologia e Geologia",
    "Teatro e Artes Performativas",
    "Eng. Biomédica",
    "Eng. Informática",
    "Turismo",
    "Comunicação e Multimédia",
    "Matemática Aplicada e Ciências de Dados",
    "Ciências da Comunicação",
    "Bioengenharia",
    "Cultura e Transformação Digital",
    "Eng. Mecânica / Eng. Física",
    "Enologia",
    "Agronomia",
    "Eng. Eletrotécnica e de Computadores",
    "Desporto",
    "Eng. Civil",
    "Ciências do Ambiente",
  ];
  for (const name of courseNames) {
    await prisma.globalCourse.upsert({ where: { name }, update: {}, create: { name } });
  }

  let order = 1;
  for (const name of courseNames) {
    const existing = await prisma.eventCourse.findFirst({ where: { eventId: cortejo.id, name } });
    if (!existing) {
      await prisma.eventCourse.create({ data: { eventId: cortejo.id, name, entryOrder: order } });
    }
    order++;
  }
  console.log("✅ Courses: 5 demo courses");

  console.log("\n🎉 Seed complete!\n");
  console.log("  Super Admin: admin@cvutad.pt / admin123");
  console.log("  Event URL:   http://localhost:3000/e/cortejo-2026");
}

main().catch(console.error).finally(() => prisma.$disconnect());
