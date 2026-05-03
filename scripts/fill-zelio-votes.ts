import "dotenv/config";
import { prisma } from "@/lib/prisma";

// All 8 leaf criteria IDs for station Avenida / event Cortejo 2026
const CRITERIA = [
  "cmoiixq500004q9motejukxez", // CRIATIV_A
  "cmoiixqbv0008q9moslvovbnj", // SATIRA_A
  "cmoiixq090001q9mo1nxlhxy5", // COREO_A
  "cmoiixq500005q9mocma1cd4i", // CRIATIV_B
  "cmoiixq090002q9movn629hxi", // COREO_B
  "cmoiixqbv0009q9mozpbk0ybp", // SATIRA_B
  "cmoiixq500006q9mour2jux9z", // CRIATIV_C
  "cmoiixqbv000aq9mows76rufw", // SATIRA_C
];

const EVENT_ID = "cmo04lr510001cpl6bzb5bfhv";
const STATION_ID = "cmolqcq2a000004lb6k90vqav"; // Avenida
const JUROR_ID = "cmopqy36p000004l2lxue34up"; // Zélio fbranco@cv.pt

// courseId → target normalized score (all criteria set to this value)
// Scoring formula: if all criteria = V → normalized = V%
// Genética skipped — existing vote preserved
const VOTES: [string, number][] = [
  ["cmo04lzds0017cpl60hrx15n8", 70],   // Medicina Veterinária
  ["cmolq8nyj0009gymoz0rckmzy", 75],   // Engenharia Zootécnica
  ["cmo04lzke0019cpl6bpuvh723", 32],   // Gestão
  ["cmo04lzo6001acpl6r44u1fr6", 59],   // Serviço Social
  ["cmo04lzqf001bcpl60eudlydo", 71],   // Enfermagem
  ["cmo04lzuz001dcpl69it7v6ty", 19],   // Economia
  ["cmo04lzz0001ecpl6jknbpgu2", 43],   // Ciências da Nutrição
  ["cmo04m18v001vcpl63wtz9m8o", 20],   // Ciências da Comunicação
  ["cmo04m1k2001zcpl60i9egrj0", 15],   // Enologia
  ["cmo04m086001icpl69apdus0x", 60],   // Animação Sociocultural
  ["cmo04m0cf001jcpl6kkg5ixfh", 9.5],  // Ciências Biomédicas
  ["cmo04m16l001ucpl6ixpo2ndy", 30],   // Matemática Aplicada / Eng. Civil
  ["cmo04m11q001tcpl69swipduy", 15],   // Comunicação e Multimédia
  ["cmo04m01c001fcpl6n3y6v2tu", 10],   // Línguas e Relações Empresariais
  ["cmo04m0gz001lcpl61hlb68wd", 10],   // Design Sustentável
  ["cmo04m03m001gcpl6fopmawtz", 10],   // Psicologia
  ["cmo04m05w001hcpl6at679r21", 11],   // Biologia
  ["cmo04m1fp001ycpl6vcw3b4d9", 6],    // Eng. Mecânica / Eng. Física
  ["cmo04m0ze001scpl6lv4cdnkp", 11],   // Turismo
  ["cmo04m0ns001ocpl6t46sh9x0", 5],    // Biologia e Geologia
  ["cmo04m0lk001ncpl649lfzint", 10],   // Eng. e Gestão Industrial
  ["cmo04m0us001qcpl671av8epq", 15],   // Eng. Biomédica
  ["cmo04m0x3001rcpl6zc0x1y7e", 16],   // Eng. Informática
  ["cmolq8pve000cgymod1z29izv", 50],   // Eng. Agronómica
  ["cmo04m1dg001xcpl6jllaycvm", 5],    // Cultura e Transformação Digital
  ["cmo04m1b5001wcpl6u8qz7km9", 6],    // Bioengenharia
  ["cmo04m0ep001kcpl61b3ygmwd", 70],   // Educação Básica
  ["cmo04m0se001pcpl69cdw4b1o", 40],   // Teatro e Artes Performativas
  ["cmo04m0jc001mcpl65f4t1hft", 20],   // Bioquímica
  ["cmo04m1om0021cpl6fzreee2d", 5],    // Eng. Eletrotécnica e Computadores
  ["cmoof4dgd000004l2w483it61", 10],   // Imperialis
  ["cmopth869000004l2we204oko", 100],  // Desporto
];

async function main() {
  let created = 0;

  for (const [courseId, score] of VOTES) {
    const course = await prisma.eventCourse.findUnique({ where: { id: courseId }, select: { name: true } });

    await prisma.evaluation.create({
      data: {
        eventId: EVENT_ID,
        courseId,
        stationId: STATION_ID,
        jurorId: JUROR_ID,
        scores: {
          createMany: {
            data: CRITERIA.map((criteriaId) => ({ criteriaId, score })),
          },
        },
      },
    });

    console.log(`✓ ${course?.name} → ${score}%`);
    created++;
  }

  console.log(`\nCreated ${created} evaluations for Zélio.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
