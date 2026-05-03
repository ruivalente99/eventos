import "dotenv/config";
import { prisma } from "@/lib/prisma";

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

// Each entry: [jurorId, jurorName, courseId, courseName, targetScore]
const MISSING: [string, string, string, string, number][] = [
  // --- Conselho de Veteranos ---
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmolq8nyj0009gymoz0rckmzy", "Engenharia Zootécnica", 95],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04lzqf001bcpl60eudlydo", "Enfermagem", 90],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04lzsp001ccpl6mrlif6lv", "Genética e Biotecnologia", 24],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m03m001gcpl6fopmawtz", "Psicologia", 13],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m05w001hcpl6at679r21", "Biologia", 14.2],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m0cf001jcpl6kkg5ixfh", "Ciências Biomédicas", 10],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m0jc001mcpl65f4t1hft", "Bioquímica", 23.2],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m0lk001ncpl649lfzint", "Eng. e Gestão Industrial", 22],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m0us001qcpl671av8epq", "Eng. Biomédica", 16],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m11q001tcpl69swipduy", "Comunicação e Multimédia", 18],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m1fp001ycpl6vcw3b4d9", "Eng. Mecânica / Eng. Física", 6.9],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmolq8pve000cgymod1z29izv", "Eng. Agronómica", 60],
  ["cmoof581t000104l27lxgs36i", "Conselho", "cmo04m1om0021cpl6fzreee2d", "Eng. Eletrotécnica e Computadores", 0],

  // --- Provedora do Estudante ---
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04lzds0017cpl60hrx15n8", "Medicina Veterinária", 72],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04lzke0019cpl6bpuvh723", "Gestão", 32],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04lzo6001acpl6r44u1fr6", "Serviço Social", 45],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04lzsp001ccpl6mrlif6lv", "Genética e Biotecnologia", 17],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04lzuz001dcpl69it7v6ty", "Economia", 17],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m01c001fcpl6n3y6v2tu", "Línguas e Relações Empresariais", 10],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m086001icpl69apdus0x", "Animação Sociocultural", 55],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m0ep001kcpl61b3ygmwd", "Educação Básica", 60],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m0gz001lcpl61hlb68wd", "Design Sustentável", 10],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m0ns001ocpl6t46sh9x0", "Biologia e Geologia", 10],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m0se001pcpl69cdw4b1o", "Teatro e Artes Performativas", 34.7],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m0x3001rcpl6zc0x1y7e", "Eng. Informática", 18],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m0ze001scpl6lv4cdnkp", "Turismo", 10],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m18v001vcpl63wtz9m8o", "Ciências da Comunicação", 15],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m1b5001wcpl6u8qz7km9", "Bioengenharia", 8.2],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m1dg001xcpl6jllaycvm", "Cultura e Transformação Digital", 16],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmo04m1k2001zcpl60i9egrj0", "Enologia", 15],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmoof4dgd000004l2w483it61", "Imperialis", 10],
  ["cmopr07yc000004joto4ps0no", "Provedora", "cmopth869000004l2we204oko", "Desporto", 82],
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [jurorId, jurorName, courseId, courseName, score] of MISSING) {
    // Check not already exists (safety guard)
    const existing = await prisma.evaluation.findFirst({
      where: { courseId, stationId: STATION_ID, jurorId },
    });
    if (existing) {
      console.log(`SKIP (exists): ${jurorName} | ${courseName}`);
      skipped++;
      continue;
    }

    await prisma.evaluation.create({
      data: {
        eventId: EVENT_ID,
        courseId,
        stationId: STATION_ID,
        jurorId,
        scores: {
          createMany: {
            data: CRITERIA.map((criteriaId) => ({ criteriaId, score })),
          },
        },
      },
    });

    console.log(`✓ ${jurorName.padEnd(12)} | ${courseName.padEnd(50)} → ${score}%`);
    created++;
  }

  console.log(`\nCreated: ${created} | Skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
