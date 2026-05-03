import "dotenv/config";
import { prisma } from "@/lib/prisma";

const RENAMES: Record<string, string> = {
  "Ciência Animal": "Engenharia Zootécnica",
  "Línguas, Literaturas e Culturas / Línguas e Relações Empresariais": "Línguas e Relações Empresariais",
  "Matemática Aplicada e Ciências de Dados": "Matemática Aplicada a Ciências de Dados",
  "Eng. Mecânica / Eng. Física": "Eng. Mecânica",
  "Agronomia": "Eng. Agronómica",
  "Eng. Eletrotécnica e de Computadores": "Eng. Eletrotécnica e Computadores",
};

const NEW_LIST = [
  "Medicina Veterinária",
  "Engenharia Zootécnica",
  "Gestão",
  "Serviço Social",
  "Enfermagem",
  "Genética e Biotecnologia",
  "Economia",
  "Ciências da Nutrição",
  "Línguas e Relações Empresariais",
  "Línguas, Literaturas e Culturas",
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
  "Matemática Aplicada a Ciências de Dados",
  "Ciências da Comunicação",
  "Bioengenharia",
  "Cultura e Transformação Digital",
  "Eng. Mecânica",
  "Eng. Física",
  "Enologia",
  "Eng. Agronómica",
  "Eng. Eletrotécnica e Computadores",
  "Desporto",
  "Eng. Civil",
  "Ciências do Ambiente",
  "Engenharia e Biotecnologia Florestal",
];

async function main() {
  const event = await prisma.event.findUnique({ where: { slug: "cortejo" } });
  if (!event) throw new Error("Event 'cortejo' not found");
  console.log(`✅ Found event: ${event.name} (${event.id})`);

  const existing = await prisma.eventCourse.findMany({ where: { eventId: event.id } });
  console.log(`📋 Existing courses: ${existing.length}`);
  console.log("   Names:", existing.map((c) => `"${c.name}"`).join(", "));

  // Step 1: upsert GlobalCourse (outside transaction — no strict atomicity needed)
  for (const name of NEW_LIST) {
    await prisma.globalCourse.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("✅ GlobalCourses upserted");

  // Step 2: main update in transaction with extended timeout
  await prisma.$transaction(
    async (tx) => {
      // Shift all entryOrders to negative to free unique constraint slots
      for (let i = 0; i < existing.length; i++) {
        await tx.eventCourse.update({
          where: { id: existing[i].id },
          data: { entryOrder: -(i + 1) },
        });
      }

      // Apply renames
      for (const [oldName, newName] of Object.entries(RENAMES)) {
        const course = await tx.eventCourse.findFirst({ where: { eventId: event.id, name: oldName } });
        if (course) {
          await tx.eventCourse.update({ where: { id: course.id }, data: { name: newName } });
          console.log(`✏️  Renamed: "${oldName}" → "${newName}"`);
        } else {
          console.log(`⚠️  Not found (skipped): "${oldName}"`);
        }
      }

      // Set final entryOrders, create missing courses
      for (let i = 0; i < NEW_LIST.length; i++) {
        const name = NEW_LIST[i];
        const order = i + 1;
        const course = await tx.eventCourse.findFirst({ where: { eventId: event.id, name } });
        if (course) {
          await tx.eventCourse.update({ where: { id: course.id }, data: { entryOrder: order } });
        } else {
          await tx.eventCourse.create({ data: { eventId: event.id, name, entryOrder: order } });
          console.log(`➕ Created: "${name}" (order ${order})`);
        }
      }
    },
    { timeout: 30000 }
  );

  // Verify
  const final = await prisma.eventCourse.findMany({
    where: { eventId: event.id },
    orderBy: { entryOrder: "asc" },
  });
  console.log(`\n🎉 Done! ${final.length} courses:\n`);
  for (const c of final) {
    console.log(`  ${String(c.entryOrder).padStart(2)}. ${c.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
