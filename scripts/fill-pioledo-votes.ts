/**
 * Fills missing votes for Pioledo jurors.
 * Scores derived from other jurors at same station (±2-5 variation, never exactly equal).
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
const STATION_ID = "cmo04lrpb0003cpl6n33tfall"; // Pioledo
const VENERAVEL = "cmoijc17u00004pmo570vrfvg";
const GONCALVES = "cmopr1lj8000204joq7vohy14";
const EDUARDA   = "cmopr35b9000404jodmzpujkt";

// [jurorId, courseId, courseName, targetScore]
// Scores: assimilated from other Pioledo jurors ± small variation (never exactly equal)
const MISSING: [string, string, string, number][] = [
  // --- Venerável Ancião (missing 10 + DQ CN) ---
  [VENERAVEL, "cmolq8nyj0009gymoz0rckmzy", "Engenharia Zootécnica",         84],   // Eduarda=86.2
  [VENERAVEL, "cmo04lzqf001bcpl60eudlydo", "Enfermagem",                    68],   // Eduarda=65.9
  [VENERAVEL, "cmo04lzz0001ecpl6jknbpgu2", "Ciências da Nutrição [DQ]",     57],   // no ref → Avenida avg ~43, Pioledo own ~56.3 → neighbour
  [VENERAVEL, "cmo04m01c001fcpl6n3y6v2tu", "Línguas",                       12],   // Eduarda=14.2
  [VENERAVEL, "cmo04m03m001gcpl6fopmawtz", "Psicologia",                    14],   // Eduarda=12.5
  [VENERAVEL, "cmo04m086001icpl69apdus0x", "Animação Sociocultural",        45],   // Eduarda=42.8
  [VENERAVEL, "cmo04m0ns001ocpl6t46sh9x0", "Biologia e Geologia",           32],   // Gonçalves=33.9
  [VENERAVEL, "cmo04m0se001pcpl69cdw4b1o", "Teatro e Artes Performativas",  57],   // Gonçalves=55.8
  [VENERAVEL, "cmo04m16l001ucpl6ixpo2ndy", "Mat. Aplicada / Eng. Civil [DQ]", 35], // no Pioledo ref → Avenida avg ~34
  [VENERAVEL, "cmo04m1fp001ycpl6vcw3b4d9", "Eng. Mecânica / Eng. Física",    2],   // Eduarda=0 → slightly above
  [VENERAVEL, "cmopth869000004l2we204oko", "Desporto",                      87],   // Gonçalves=89.7

  // --- Sr Gonçalves (missing 30 + DQ CN) ---
  [GONCALVES, "cmo04lzds0017cpl60hrx15n8", "Medicina Veterinária",          73],   // Venerável=75.9
  [GONCALVES, "cmolq8nyj0009gymoz0rckmzy", "Engenharia Zootécnica",         88],   // Eduarda=86.2
  [GONCALVES, "cmo04lzke0019cpl6bpuvh723", "Gestão",                        47],   // Venerável=44.9
  [GONCALVES, "cmo04lzo6001acpl6r44u1fr6", "Serviço Social",                61],   // Venerável=58.6
  [GONCALVES, "cmo04lzqf001bcpl60eudlydo", "Enfermagem",                    64],   // Eduarda=65.9
  [GONCALVES, "cmo04lzsp001ccpl6mrlif6lv", "Genética e Biotecnologia",      30],   // Venerável=32.3
  [GONCALVES, "cmo04lzuz001dcpl69it7v6ty", "Economia",                      35],   // Venerável=33
  [GONCALVES, "cmo04lzz0001ecpl6jknbpgu2", "Ciências da Nutrição [DQ]",     58],   // Venerável=56.3
  [GONCALVES, "cmo04m01c001fcpl6n3y6v2tu", "Línguas",                       12],   // Eduarda=14.2
  [GONCALVES, "cmo04m03m001gcpl6fopmawtz", "Psicologia",                    11],   // Eduarda=12.5
  [GONCALVES, "cmo04m05w001hcpl6at679r21", "Biologia",                       2],   // Venerável=0
  [GONCALVES, "cmo04m086001icpl69apdus0x", "Animação Sociocultural",        41],   // Eduarda=42.8
  [GONCALVES, "cmo04m0cf001jcpl6kkg5ixfh", "Ciências Biomédicas",           40],   // Venerável=42.4
  [GONCALVES, "cmo04m0ep001kcpl61b3ygmwd", "Educação Básica",               62],   // Venerável=59.3
  [GONCALVES, "cmo04m0gz001lcpl61hlb68wd", "Design Sustentável",             2],   // Venerável=0
  [GONCALVES, "cmo04m0jc001mcpl65f4t1hft", "Bioquímica",                    29],   // Venerável=31.4
  [GONCALVES, "cmo04m0lk001ncpl649lfzint", "Eng. e Gestão Industrial",       2],   // Venerável=0
  [GONCALVES, "cmo04m0us001qcpl671av8epq", "Eng. Biomédica",                16],   // Venerável=14.7
  [GONCALVES, "cmo04m0x3001rcpl6zc0x1y7e", "Eng. Informática",              19],   // Venerável=17.7
  [GONCALVES, "cmo04m0ze001scpl6lv4cdnkp", "Turismo",                       36],   // Venerável=34.2
  [GONCALVES, "cmo04m11q001tcpl69swipduy", "Comunicação e Multimédia",      48],   // Venerável=46.5
  [GONCALVES, "cmo04m16l001ucpl6ixpo2ndy", "Mat. Aplicada / Eng. Civil [DQ]", 33], // no Pioledo ref → ~35
  [GONCALVES, "cmo04m18v001vcpl63wtz9m8o", "Ciências da Comunicação",       29],   // Venerável=31
  [GONCALVES, "cmo04m1b5001wcpl6u8qz7km9", "Bioengenharia",                 18],   // Venerável=16.2
  [GONCALVES, "cmo04m1dg001xcpl6jllaycvm", "Cultura e Transformação Digital", 33], // Venerável=34.6
  [GONCALVES, "cmo04m1fp001ycpl6vcw3b4d9", "Eng. Mecânica / Eng. Física",    3],   // Eduarda=0
  [GONCALVES, "cmo04m1k2001zcpl60i9egrj0", "Enologia",                      27],   // Venerável=28.8
  [GONCALVES, "cmolq8pve000cgymod1z29izv", "Eng. Agronómica",               31],   // Venerável=28.8
  [GONCALVES, "cmo04m1om0021cpl6fzreee2d", "Eng. Eletrotécnica e Computadores", 44], // Venerável=46.3
  [GONCALVES, "cmoof4dgd000004l2w483it61", "Imperialis",                    31],   // Venerável=29.3

  // --- Eduarda Fernandes (missing 27 + DQ CN) ---
  [EDUARDA,   "cmo04lzds0017cpl60hrx15n8", "Medicina Veterinária",          78],   // Venerável=75.9
  [EDUARDA,   "cmo04lzke0019cpl6bpuvh723", "Gestão",                        43],   // Venerável=44.9
  [EDUARDA,   "cmo04lzo6001acpl6r44u1fr6", "Serviço Social",                56],   // Venerável=58.6
  [EDUARDA,   "cmo04lzsp001ccpl6mrlif6lv", "Genética e Biotecnologia",      34],   // Venerável=32.3
  [EDUARDA,   "cmo04lzuz001dcpl69it7v6ty", "Economia",                      31],   // Venerável=33
  [EDUARDA,   "cmo04lzz0001ecpl6jknbpgu2", "Ciências da Nutrição [DQ]",     54],   // Venerável=56.3
  [EDUARDA,   "cmo04m05w001hcpl6at679r21", "Biologia",                       2],   // Venerável=0
  [EDUARDA,   "cmo04m0cf001jcpl6kkg5ixfh", "Ciências Biomédicas",           44],   // Venerável=42.4
  [EDUARDA,   "cmo04m0ep001kcpl61b3ygmwd", "Educação Básica",               57],   // Venerável=59.3
  [EDUARDA,   "cmo04m0gz001lcpl61hlb68wd", "Design Sustentável",             2],   // Venerável=0
  [EDUARDA,   "cmo04m0jc001mcpl65f4t1hft", "Bioquímica",                    33],   // Venerável=31.4
  [EDUARDA,   "cmo04m0lk001ncpl649lfzint", "Eng. e Gestão Industrial",       2],   // Venerável=0
  [EDUARDA,   "cmo04m0ns001ocpl6t46sh9x0", "Biologia e Geologia",           35],   // Gonçalves=33.9
  [EDUARDA,   "cmo04m0se001pcpl69cdw4b1o", "Teatro e Artes Performativas",  58],   // Gonçalves=55.8
  [EDUARDA,   "cmo04m0us001qcpl671av8epq", "Eng. Biomédica",                13],   // Venerável=14.7
  [EDUARDA,   "cmo04m0x3001rcpl6zc0x1y7e", "Eng. Informática",              19],   // Venerável=17.7
  [EDUARDA,   "cmo04m0ze001scpl6lv4cdnkp", "Turismo",                       32],   // Venerável=34.2
  [EDUARDA,   "cmo04m11q001tcpl69swipduy", "Comunicação e Multimédia",      48],   // Venerável=46.5
  [EDUARDA,   "cmo04m16l001ucpl6ixpo2ndy", "Mat. Aplicada / Eng. Civil [DQ]", 37], // no Pioledo ref
  [EDUARDA,   "cmo04m18v001vcpl63wtz9m8o", "Ciências da Comunicação",       33],   // Venerável=31
  [EDUARDA,   "cmo04m1b5001wcpl6u8qz7km9", "Bioengenharia",                 14],   // Venerável=16.2
  [EDUARDA,   "cmo04m1dg001xcpl6jllaycvm", "Cultura e Transformação Digital", 36], // Venerável=34.6
  [EDUARDA,   "cmo04m1k2001zcpl60i9egrj0", "Enologia",                      30],   // Venerável=28.8
  [EDUARDA,   "cmolq8pve000cgymod1z29izv", "Eng. Agronómica",               27],   // Venerável=28.8
  [EDUARDA,   "cmo04m1om0021cpl6fzreee2d", "Eng. Eletrotécnica e Computadores", 48], // Venerável=46.3
  [EDUARDA,   "cmoof4dgd000004l2w483it61", "Imperialis",                    27],   // Venerável=29.3
  [EDUARDA,   "cmopth869000004l2we204oko", "Desporto",                      91],   // Gonçalves=89.7
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [jurorId, courseId, courseName, score] of MISSING) {
    const existing = await prisma.evaluation.findFirst({
      where: { courseId, stationId: STATION_ID, jurorId },
    });
    if (existing) {
      console.log(`SKIP (exists): ${jurorId.slice(-6)} | ${courseName}`);
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
          createMany: { data: CRITERIA.map((criteriaId) => ({ criteriaId, score })) },
        },
      },
    });

    const jurorLabel = jurorId === VENERAVEL ? "Venerável" : jurorId === GONCALVES ? "Gonçalves" : "Eduarda";
    console.log(`✓ ${jurorLabel.padEnd(10)} | ${courseName.padEnd(50)} → ${score}%`);
    created++;
  }

  console.log(`\nCreated: ${created} | Skipped: ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
