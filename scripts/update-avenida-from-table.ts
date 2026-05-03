/**
 * Deletes ALL Avenida evaluations for Conselho + Provedora, recreates from reference table.
 * Also creates CN (DQ) for Conselho + Provedora (Zélio already has it).
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const CRITERIA = [
  "cmoiixq500004q9motejukxez",
  "cmoiixqbv0008q9moslvovbnj",
  "cmoiixq090001q9mo1nxlhxy5",
  "cmoiixq500005q9mocma1cd4i",
  "cmoiixq090002q9movn629hxi",
  "cmoiixqbv0009q9mozpbk0ybp",
  "cmoiixq500006q9mour2jux9z",
  "cmoiixqbv000aq9mows76rufw",
];

const EVENT_ID = "cmo04lr510001cpl6bzb5bfhv";
const STATION_ID = "cmolqcq2a000004lb6k90vqav"; // Avenida
const CONSELHO = "cmoof581t000104l27lxgs36i";
const PROVEDORA = "cmopr07yc000004joto4ps0no";

// [courseId, conselho_score, provedora_score]
// Includes DQ courses CN + Mat.Aplic
const TABLE: [string, number, number][] = [
  ["cmo04lzds0017cpl60hrx15n8", 64.6, 72],    // Medicina Veterinária
  ["cmolq8nyj0009gymoz0rckmzy", 95,   80],    // Engenharia Zootécnica
  ["cmo04lzke0019cpl6bpuvh723", 32,   32],    // Gestão
  ["cmo04lzo6001acpl6r44u1fr6", 32,   45],    // Serviço Social
  ["cmo04lzqf001bcpl60eudlydo", 90,   75],    // Enfermagem
  ["cmo04lzsp001ccpl6mrlif6lv", 24,   17],    // Genética e Biotecnologia
  ["cmo04lzuz001dcpl69it7v6ty", 18,   17],    // Economia
  ["cmo04lzz0001ecpl6jknbpgu2", 43,   43],    // Ciências da Nutrição [DQ]
  ["cmo04m18v001vcpl63wtz9m8o", 25,   15],    // Ciências da Comunicação
  ["cmo04m1k2001zcpl60i9egrj0", 6.7,  15],    // Enologia
  ["cmo04m086001icpl69apdus0x", 73,   55],    // Animação Sociocultural
  ["cmo04m0cf001jcpl6kkg5ixfh", 10,   10],    // Ciências Biomédicas
  ["cmo04m16l001ucpl6ixpo2ndy", 46.7, 25],    // Matemática Aplicada / Eng. Civil [DQ]
  ["cmo04m11q001tcpl69swipduy", 18,   14.2],  // Comunicação e Multimédia
  ["cmo04m01c001fcpl6n3y6v2tu", 5,    10],    // Línguas
  ["cmo04m0gz001lcpl61hlb68wd", 5.1,  10],    // Design Sustentável
  ["cmo04m03m001gcpl6fopmawtz", 13,   17.8],  // Psicologia
  ["cmo04m05w001hcpl6at679r21", 14.2, 13],    // Biologia
  ["cmo04m1fp001ycpl6vcw3b4d9", 6.9,  8],     // Eng. Mecânica / Eng. Física
  ["cmo04m0ze001scpl6lv4cdnkp", 14.5, 10],    // Turismo
  ["cmo04m0ns001ocpl6t46sh9x0", 5,    10],    // Biologia e Geologia
  ["cmo04m0lk001ncpl649lfzint", 22,   9.6],   // Eng. e Gestão Industrial
  ["cmo04m0us001qcpl671av8epq", 16,   16.4],  // Eng. Biomédica
  ["cmo04m0x3001rcpl6zc0x1y7e", 16,   18],    // Eng. Informática
  ["cmolq8pve000cgymod1z29izv", 60,   27],    // Eng. Agronómica
  ["cmo04m1dg001xcpl6jllaycvm", 5,    16],    // Cultura e Transformação Digital
  ["cmo04m1b5001wcpl6u8qz7km9", 4.4,  8.2],  // Bioengenharia
  ["cmo04m0ep001kcpl61b3ygmwd", 80.5, 60],    // Educação Básica
  ["cmo04m0se001pcpl69cdw4b1o", 37,   34.7],  // Teatro e Artes Performativas
  ["cmo04m0jc001mcpl65f4t1hft", 23.2, 25],    // Bioquímica
  ["cmo04m1om0021cpl6fzreee2d", 0,    8.7],   // Eng. Eletrotécnica e Computadores
  ["cmoof4dgd000004l2w483it61", 100,  10],    // Imperialis
  ["cmopth869000004l2we204oko", 100,  82],    // Desporto
];

async function main() {
  // Delete all existing Avenida evals for Conselho + Provedora
  const del = await prisma.evaluation.deleteMany({
    where: { stationId: STATION_ID, jurorId: { in: [CONSELHO, PROVEDORA] } },
  });
  console.log(`Deleted ${del.count} existing Avenida evals for Conselho + Provedora`);

  let created = 0;
  for (const [courseId, cScore, pScore] of TABLE) {
    const course = await prisma.eventCourse.findUnique({ where: { id: courseId }, select: { name: true } });

    for (const [jurorId, score] of [[CONSELHO, cScore], [PROVEDORA, pScore]] as [string, number][]) {
      await prisma.evaluation.create({
        data: {
          eventId: EVENT_ID,
          courseId,
          stationId: STATION_ID,
          jurorId,
          scores: {
            createMany: { data: CRITERIA.map((criteriaId) => ({ criteriaId, score })) },
          },
        },
      });
      created++;
    }
    console.log(`✓ ${course?.name?.padEnd(50)} C:${cScore}% P:${pScore}%`);
  }

  console.log(`\nCreated ${created} evaluations (${TABLE.length} courses × 2 jurors)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
