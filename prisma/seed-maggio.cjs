// Turni e disponibilità maggio 2026 — con raddoppi nelle finestre 10-12 e 16-19.
// Eseguire DOPO npm run db:seed.   Comando: node prisma/seed-maggio.cjs
//
// Pattern feriali:
//   A (raddoppio 10-12):  08:00-12:00 / 10:00-17:00 / 16:00-20:30
//   B (raddoppio 16-19):  08:00-14:00 / 12:00-19:00 / 16:00-20:30
//   S (semplice):         08:00-14:00 / 14:00-20:30
// Pattern weekend (09:00-19:30):
//   WB (raddoppio 16-19): 09:00-14:30 / 12:00-19:00 / 16:00-19:30
//   WS (semplice):        09:00-14:30 / 14:30-19:30
// Nessun turno supera 7h.

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const TOKENS = ["mara-7f3a", "sonia-2b9c", "bea-5e1d", "emma-9a4f", "ari-c8d2"];
  const byToken = {};
  for (const t of TOKENS) {
    byToken[t] = await p.secretary.findUnique({ where: { token: t } });
    if (!byToken[t])
      throw new Error(`Segretaria "${t}" non trovata. Esegui prima: npm run db:seed`);
  }
  const id = (t) => byToken[t].id;

  const maggio = Array.from({ length: 31 }, (_, i) => {
    const d = new Date(2026, 4, i + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });

  await p.shift.deleteMany({ where: { date: { in: maggio } } });
  await p.availability.deleteMany({ where: { date: { in: maggio } } });
  console.log("Pulizia maggio 2026 completata.");

  // [token, data, inizio, fine]
  const SHIFTS = [
    // === Ven 01/05 — Pattern B (raddoppio 12-14, 16-19) ===
    ["bea-5e1d",   "2026-05-01", "08:00", "14:00"],
    ["emma-9a4f",  "2026-05-01", "12:00", "19:00"],
    ["ari-c8d2",   "2026-05-01", "16:00", "20:30"],

    // === Sab 02/05 — WS ===
    ["mara-7f3a",  "2026-05-02", "09:00", "14:30"],
    ["sonia-2b9c", "2026-05-02", "14:30", "19:30"],

    // === Dom 03/05 — WS ===
    ["ari-c8d2",   "2026-05-03", "09:00", "14:30"],
    ["bea-5e1d",   "2026-05-03", "14:30", "19:30"],

    // === Lun 04/05 — Pattern A (raddoppio 10-12, 16-17) ===
    ["sonia-2b9c", "2026-05-04", "08:00", "12:00"],
    ["mara-7f3a",  "2026-05-04", "10:00", "17:00"],
    ["bea-5e1d",   "2026-05-04", "16:00", "20:30"],

    // === Mar 05/05 — Pattern B ===
    ["emma-9a4f",  "2026-05-05", "08:00", "14:00"],
    ["bea-5e1d",   "2026-05-05", "12:00", "19:00"],
    ["sonia-2b9c", "2026-05-05", "16:00", "20:30"],

    // === Mer 06/05 — Pattern A ===
    ["mara-7f3a",  "2026-05-06", "08:00", "12:00"],
    ["ari-c8d2",   "2026-05-06", "10:00", "17:00"],
    ["emma-9a4f",  "2026-05-06", "16:00", "20:30"],

    // === Gio 07/05 — Pattern B ===
    ["sonia-2b9c", "2026-05-07", "08:00", "14:00"],
    ["mara-7f3a",  "2026-05-07", "12:00", "19:00"],
    ["bea-5e1d",   "2026-05-07", "16:00", "20:30"],

    // === Ven 08/05 — Pattern S ===
    ["ari-c8d2",   "2026-05-08", "08:00", "14:00"],
    ["mara-7f3a",  "2026-05-08", "14:00", "20:30"],

    // === Sab 09/05 — WS ===
    ["sonia-2b9c", "2026-05-09", "09:00", "14:30"],
    ["emma-9a4f",  "2026-05-09", "14:30", "19:30"],

    // === Dom 10/05 — WB (raddoppio 12-14:30, 16-19) ===
    ["mara-7f3a",  "2026-05-10", "09:00", "14:30"],
    ["sonia-2b9c", "2026-05-10", "12:00", "19:00"],
    ["bea-5e1d",   "2026-05-10", "16:00", "19:30"],

    // === Lun 11/05 — Pattern B ===
    ["mara-7f3a",  "2026-05-11", "08:00", "14:00"],
    ["ari-c8d2",   "2026-05-11", "12:00", "19:00"],
    ["emma-9a4f",  "2026-05-11", "16:00", "20:30"],

    // === Mar 12/05 — Pattern A ===
    ["emma-9a4f",  "2026-05-12", "08:00", "12:00"],
    ["sonia-2b9c", "2026-05-12", "10:00", "17:00"],
    ["bea-5e1d",   "2026-05-12", "16:00", "20:30"],

    // === Mer 13/05 — Pattern S ===
    ["sonia-2b9c", "2026-05-13", "08:00", "14:00"],
    ["ari-c8d2",   "2026-05-13", "14:00", "20:30"],

    // === Gio 14/05 — Pattern B ===
    ["ari-c8d2",   "2026-05-14", "08:00", "14:00"],
    ["sonia-2b9c", "2026-05-14", "12:00", "19:00"],
    ["mara-7f3a",  "2026-05-14", "16:00", "20:30"],

    // === Ven 15/05 — Pattern A ===
    ["bea-5e1d",   "2026-05-15", "08:00", "12:00"],
    ["mara-7f3a",  "2026-05-15", "10:00", "17:00"],
    ["ari-c8d2",   "2026-05-15", "16:00", "20:30"],

    // === Sab 16/05 — WS ===
    ["bea-5e1d",   "2026-05-16", "09:00", "14:30"],
    ["mara-7f3a",  "2026-05-16", "14:30", "19:30"],

    // === Dom 17/05 — WS ===
    ["emma-9a4f",  "2026-05-17", "09:00", "14:30"],
    ["ari-c8d2",   "2026-05-17", "14:30", "19:30"],

    // === Lun 18/05 — Pattern A ===
    ["ari-c8d2",   "2026-05-18", "08:00", "12:00"],
    ["bea-5e1d",   "2026-05-18", "10:00", "17:00"],
    ["sonia-2b9c", "2026-05-18", "16:00", "20:30"],

    // === Mar 19/05 — Pattern B ===
    ["bea-5e1d",   "2026-05-19", "08:00", "14:00"],
    ["emma-9a4f",  "2026-05-19", "12:00", "19:00"],
    ["ari-c8d2",   "2026-05-19", "16:00", "20:30"],

    // === Mer 20/05 — Pattern A ===
    ["sonia-2b9c", "2026-05-20", "08:00", "12:00"],
    ["emma-9a4f",  "2026-05-20", "10:00", "17:00"],
    ["mara-7f3a",  "2026-05-20", "16:00", "20:30"],

    // === Gio 21/05 — Pattern S ===
    ["bea-5e1d",   "2026-05-21", "08:00", "14:00"],
    ["sonia-2b9c", "2026-05-21", "14:00", "20:30"],

    // === Ven 22/05 — Pattern B ===
    ["emma-9a4f",  "2026-05-22", "08:00", "14:00"],
    ["mara-7f3a",  "2026-05-22", "12:00", "19:00"],
    ["sonia-2b9c", "2026-05-22", "16:00", "20:30"],

    // === Sab 23/05 — WS ===
    ["mara-7f3a",  "2026-05-23", "09:00", "14:30"],
    ["sonia-2b9c", "2026-05-23", "14:30", "19:30"],

    // === Dom 24/05 — WB (raddoppio 12-14:30, 16-19) ===
    ["ari-c8d2",   "2026-05-24", "09:00", "14:30"],
    ["emma-9a4f",  "2026-05-24", "12:00", "19:00"],
    ["mara-7f3a",  "2026-05-24", "16:00", "19:30"],

    // === Lun 25/05 — Pattern B ===
    ["sonia-2b9c", "2026-05-25", "08:00", "14:00"],
    ["bea-5e1d",   "2026-05-25", "12:00", "19:00"],
    ["emma-9a4f",  "2026-05-25", "16:00", "20:30"],

    // === Mar 26/05 — Pattern A ===
    ["mara-7f3a",  "2026-05-26", "08:00", "12:00"],
    ["ari-c8d2",   "2026-05-26", "10:00", "17:00"],
    ["bea-5e1d",   "2026-05-26", "16:00", "20:30"],

    // === Mer 27/05 — Pattern B ===
    ["mara-7f3a",  "2026-05-27", "08:00", "14:00"],
    ["ari-c8d2",   "2026-05-27", "12:00", "19:00"],
    ["bea-5e1d",   "2026-05-27", "16:00", "20:30"],

    // === Gio 28/05 — Pattern A ===
    ["bea-5e1d",   "2026-05-28", "08:00", "12:00"],
    ["sonia-2b9c", "2026-05-28", "10:00", "17:00"],
    ["emma-9a4f",  "2026-05-28", "16:00", "20:30"],

    // === Ven 29/05 — Pattern S ===
    ["emma-9a4f",  "2026-05-29", "08:00", "14:00"],
    ["bea-5e1d",   "2026-05-29", "14:00", "20:30"],

    // === Sab 30/05 — WS ===
    ["ari-c8d2",   "2026-05-30", "09:00", "14:30"],
    ["emma-9a4f",  "2026-05-30", "14:30", "19:30"],

    // === Dom 31/05 — WS ===
    ["sonia-2b9c", "2026-05-31", "09:00", "14:30"],
    ["bea-5e1d",   "2026-05-31", "14:30", "19:30"],
  ];

  for (const [t, date, start, end] of SHIFTS) {
    await p.shift.create({ data: { secretaryId: id(t), date, start, end } });
  }
  console.log(`${SHIFTS.length} turni inseriti.`);

  // "disponibile" per tutti i giorni con turno assegnato
  const avInserted = new Set();
  for (const [t, date] of SHIFTS) {
    const key = `${t}|${date}`;
    if (!avInserted.has(key)) {
      await p.availability.create({
        data: { secretaryId: id(t), date, status: "disponibile", slots: null, note: null },
      });
      avInserted.add(key);
    }
  }

  // Disponibilità su giorni liberi: non_disponibile, parziale, e qualche "disponibile"
  // (serve a mostrare nel day editor "chi è libero" per le fasce scoperte)
  const AVAIL_EXTRA = [
    // Mara — libera: 1,3,5,9,12,13,17,18,19,21,25,28,29,30,31
    ["mara-7f3a",  "2026-05-01", "disponibile",     null,    null],
    ["mara-7f3a",  "2026-05-05", "non_disponibile", null,    null],
    ["mara-7f3a",  "2026-05-09", "disponibile",     null,    null],
    ["mara-7f3a",  "2026-05-12", "disponibile",     null,    null],
    ["mara-7f3a",  "2026-05-13", "parziale",        JSON.stringify([{start:"08:00",end:"13:00"}]), "esco a mezzogiorno"],
    ["mara-7f3a",  "2026-05-18", "non_disponibile", null,    "impegno personale"],
    ["mara-7f3a",  "2026-05-21", "disponibile",     null,    null],
    ["mara-7f3a",  "2026-05-25", "disponibile",     null,    null],
    ["mara-7f3a",  "2026-05-29", "non_disponibile", null,    null],
    ["mara-7f3a",  "2026-05-31", "non_disponibile", null,    null],

    // Sonia — libera: 1,3,6,8,11,15,16,17,19,20,24,26,27,29,30
    ["sonia-2b9c", "2026-05-01", "disponibile",     null,    null],
    ["sonia-2b9c", "2026-05-03", "non_disponibile", null,    null],
    ["sonia-2b9c", "2026-05-06", "disponibile",     null,    null],
    ["sonia-2b9c", "2026-05-08", "disponibile",     null,    null],
    ["sonia-2b9c", "2026-05-11", "disponibile",     null,    null],
    ["sonia-2b9c", "2026-05-15", "parziale",        JSON.stringify([{start:"08:00",end:"14:00"}]), "solo mattina"],
    ["sonia-2b9c", "2026-05-17", "non_disponibile", null,    null],
    ["sonia-2b9c", "2026-05-24", "non_disponibile", null,    "ferie"],
    ["sonia-2b9c", "2026-05-26", "disponibile",     null,    null],
    ["sonia-2b9c", "2026-05-30", "non_disponibile", null,    null],

    // Beatrice — libera: 2,6,8,9,11,13,14,17,20,22,23,24,30
    ["bea-5e1d",   "2026-05-02", "non_disponibile", null,    null],
    ["bea-5e1d",   "2026-05-06", "disponibile",     null,    null],
    ["bea-5e1d",   "2026-05-08", "disponibile",     null,    null],
    ["bea-5e1d",   "2026-05-09", "non_disponibile", null,    null],
    ["bea-5e1d",   "2026-05-11", "disponibile",     null,    null],
    ["bea-5e1d",   "2026-05-13", "disponibile",     null,    null],
    ["bea-5e1d",   "2026-05-14", "disponibile",     null,    null],
    ["bea-5e1d",   "2026-05-17", "non_disponibile", null,    null],
    ["bea-5e1d",   "2026-05-20", "parziale",        JSON.stringify([{start:"08:00",end:"14:00"}]), "mattina ok"],
    ["bea-5e1d",   "2026-05-22", "non_disponibile", null,    null],
    ["bea-5e1d",   "2026-05-23", "disponibile",     null,    null],
    ["bea-5e1d",   "2026-05-30", "non_disponibile", null,    null],

    // Emma — libera: 2,3,4,7,8,10,13,14,15,16,18,21,23,26,27,31
    ["emma-9a4f",  "2026-05-02", "non_disponibile", null,    null],
    ["emma-9a4f",  "2026-05-04", "parziale",        JSON.stringify([{start:"14:00",end:"19:00"}]), "solo pomeriggio"],
    ["emma-9a4f",  "2026-05-07", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-08", "non_disponibile", null,    null],
    ["emma-9a4f",  "2026-05-10", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-13", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-15", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-16", "non_disponibile", null,    null],
    ["emma-9a4f",  "2026-05-18", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-21", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-23", "non_disponibile", null,    "impegno"],
    ["emma-9a4f",  "2026-05-26", "disponibile",     null,    null],
    ["emma-9a4f",  "2026-05-31", "non_disponibile", null,    null],

    // Arianna — libera: 2,4,5,7,9,10,12,16,20,21,22,23,25,28,29,31
    ["ari-c8d2",   "2026-05-02", "non_disponibile", null,    null],
    ["ari-c8d2",   "2026-05-04", "non_disponibile", null,    null],
    ["ari-c8d2",   "2026-05-05", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-07", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-09", "parziale",        JSON.stringify([{start:"09:00",end:"15:00"}]), "disponibile fino alle 15"],
    ["ari-c8d2",   "2026-05-10", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-12", "non_disponibile", null,    null],
    ["ari-c8d2",   "2026-05-16", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-20", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-22", "non_disponibile", null,    null],
    ["ari-c8d2",   "2026-05-25", "non_disponibile", null,    null],
    ["ari-c8d2",   "2026-05-28", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-29", "disponibile",     null,    null],
    ["ari-c8d2",   "2026-05-31", "non_disponibile", null,    null],
  ];

  for (const [t, date, status, slots, note] of AVAIL_EXTRA) {
    const key = `${t}|${date}`;
    if (avInserted.has(key)) {
      console.warn(`  SKIP: ${t} ${date} (turno già assegnato)`);
      continue;
    }
    await p.availability.create({
      data: { secretaryId: id(t), date, status, slots: slots ?? null, note: note ?? null },
    });
    avInserted.add(key);
  }

  console.log(`${avInserted.size} disponibilità inserite.`);
  console.log("Maggio 2026 pronto.");
  await p.$disconnect();
})();
