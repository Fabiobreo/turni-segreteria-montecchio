import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Token semplici e leggibili per i link personali (modificabili poi dalla manager).
// weeklyMax = tetto ore settimanali (unico limite). Modificabile dall'app (Segretarie).
const secretaries = [
  { name: "Mara", contractType: "fisso", weeklyMax: 20, color: "mara", token: "mara-7f3a", sort: 1 },
  { name: "Sonia", contractType: "fisso", weeklyMax: 20, color: "sonia", token: "sonia-2b9c", sort: 2 },
  { name: "Beatrice", contractType: "a_chiamata", weeklyMax: 30, color: "bea", token: "bea-5e1d", sort: 3 },
  { name: "Emma", contractType: "a_chiamata", weeklyMax: 20, color: "emma", token: "emma-9a4f", sort: 4 },
  { name: "Arianna", contractType: "a_chiamata", weeklyMax: 20, color: "ari", token: "ari-c8d2", sort: 5 },
];

async function main() {
  for (const s of secretaries) {
    await prisma.secretary.upsert({
      where: { token: s.token },
      update: { name: s.name, contractType: s.contractType, color: s.color, sort: s.sort },
      // weeklyMax NON in update: non sovrascrive i valori già impostati a mano dalla manager.
      create: s,
    });
  }
  console.log(`Seed completato: ${secretaries.length} segretarie.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
