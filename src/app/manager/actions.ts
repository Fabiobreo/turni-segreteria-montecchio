"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireManager, logout } from "@/lib/auth";
import { toMinutes, weekDates, mondayOf } from "@/lib/time";
import {
  shiftInputSchema,
  addSecretarySchema,
  updateSecretarySchema,
  impiantoSchema,
  createImpiantoSchema,
  parseSlots,
  ISODate,
  firstError,
} from "@/lib/validation";
import { generateWeekDraft } from "@/lib/schedule";
import { NOTIF_SEEN_COOKIE } from "@/lib/constants";

/** Client Prisma o client di transazione. */
type Db = PrismaClient | Prisma.TransactionClient;

export async function logoutAction() {
  await logout();
  redirect("/manager/login");
}

/** Segna come lette tutte le notifiche fino a ora (azzera il badge). */
export async function markNotificationsRead() {
  await requireManager();
  const store = await cookies();
  store.set(NOTIF_SEEN_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

/**
 * Fonde i turni della stessa segretaria e impianto nello stesso giorno che
 * si toccano o si sovrappongono (es. 08:00–14:00 + 14:00–18:00 → 08:00–18:00).
 * Tiene il primo di ogni gruppo, ne estende l'orario, elimina gli altri.
 */
async function mergeAdjacentShifts(db: Db, date: string, secretaryId: string, impianto: string) {
  const rows = await db.shift.findMany({
    where: { date, secretaryId, impianto },
    orderBy: { start: "asc" },
  });
  type Group = { keepId: string; start: string; end: string; dropIds: string[] };
  const groups: Group[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && toMinutes(r.start) <= toMinutes(last.end)) {
      if (toMinutes(r.end) > toMinutes(last.end)) last.end = r.end;
      last.dropIds.push(r.id);
    } else {
      groups.push({ keepId: r.id, start: r.start, end: r.end, dropIds: [] });
    }
  }
  for (const g of groups) {
    if (g.dropIds.length === 0) continue;
    await db.shift.update({ where: { id: g.keepId }, data: { start: g.start, end: g.end } });
    await db.shift.deleteMany({ where: { id: { in: g.dropIds } } });
  }
}

export async function saveShift(input: {
  id?: string;
  date: string;
  secretaryId: string;
  start: string;
  end: string;
  impianto?: string;
}) {
  await requireManager();
  const parsed = shiftInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  // Salvataggio + fusione dei turni adiacenti in un'unica transazione atomica.
  await prisma.$transaction(async (tx) => {
    const saved = data.id
      ? await tx.shift.update({
          where: { id: data.id },
          data: {
            date: data.date,
            secretaryId: data.secretaryId,
            start: data.start,
            end: data.end,
            ...(data.impianto ? { impianto: data.impianto } : {}),
          },
        })
      : await tx.shift.create({
          data: {
            date: data.date,
            secretaryId: data.secretaryId,
            start: data.start,
            end: data.end,
            impianto: data.impianto ?? "estivo",
          },
        });
    await mergeAdjacentShifts(tx, saved.date, saved.secretaryId, saved.impianto);
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

export async function saveImpianto(input: {
  id: string;
  nome: string;
  icona: string;
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  attivo: boolean;
}) {
  await requireManager();
  const parsed = impiantoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;
  await prisma.impianto.upsert({
    where: { id: data.id },
    update: {
      nome: data.nome,
      icona: data.icona,
      weekdayOpen: data.weekdayOpen,
      weekdayClose: data.weekdayClose,
      weekendOpen: data.weekendOpen,
      weekendClose: data.weekendClose,
      attivo: data.attivo,
    },
    create: { ...data, sort: data.id === "estivo" ? 1 : 2 },
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

export async function createImpianto(input: {
  nome: string;
  icona: string;
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  attivo: boolean;
}) {
  await requireManager();
  const parsed = createImpiantoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  // Genera un id univoco dallo slug del nome (es. "Piscina Comunale" -> "piscina-xxxx").
  const slug = data.nome.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // rimuove accenti
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "impianto";
  const rand = Math.random().toString(36).slice(2, 6);
  const id = `${slug}-${rand}`;

  const agg = await prisma.impianto.aggregate({ _max: { sort: true } });
  await prisma.impianto.create({
    data: { id, ...data, sort: (agg._max.sort ?? 0) + 1 },
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

export async function deleteImpianto(id: string) {
  await requireManager();
  // I turni referenziano l'impianto via stringa (nessuna FK): non eliminare se ci sono turni.
  const turni = await prisma.shift.count({ where: { impianto: id } });
  if (turni > 0) {
    return {
      ok: false,
      error: `Impossibile eliminare: ci sono ${turni} turni assegnati a questo impianto. Disattivalo invece di eliminarlo.`,
    };
  }
  await prisma.impianto.delete({ where: { id } });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

/**
 * Genera una bozza di turni per la settimana che contiene `monday` e la salva,
 * SOSTITUENDO i turni esistenti della settimana per gli impianti attivi.
 * Vedi `generateWeekDraft` per i vincoli rispettati.
 */
export async function generateWeekShifts(input: { monday: string }) {
  await requireManager();
  const parsed = ISODate.safeParse(input.monday);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const monday = mondayOf(parsed.data);
  const days = weekDates(monday);

  const [secretaries, impianti, avails] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.impianto.findMany({ where: { attivo: true }, orderBy: { sort: "asc" } }),
    prisma.availability.findMany({ where: { date: { in: days } } }),
  ]);
  if (impianti.length === 0) return { ok: false, error: "Nessun impianto attivo: configura gli orari in Impostazioni." };

  // Check disponibilità: ogni segretaria attiva deve aver indicato TUTTI i 7 giorni.
  const giorniPerSegretaria = new Map<string, Set<string>>();
  for (const a of avails) {
    const set = giorniPerSegretaria.get(a.secretaryId) ?? new Set<string>();
    set.add(a.date);
    giorniPerSegretaria.set(a.secretaryId, set);
  }
  const incomplete = secretaries
    .map((s) => ({ name: s.name, mancanti: days.length - (giorniPerSegretaria.get(s.id)?.size ?? 0) }))
    .filter((x) => x.mancanti > 0);
  if (incomplete.length > 0) {
    const elenco = incomplete
      .map((x) => `${x.name} (${x.mancanti} giorn${x.mancanti === 1 ? "o" : "i"})`)
      .join(", ");
    return {
      ok: false,
      error: `Disponibilità incompleta per questa settimana — manca: ${elenco}. Tutte le segretarie devono compilare i 7 giorni prima di generare la bozza.`,
    };
  }

  const availMap = new Map<string, { status: string; slots: ReturnType<typeof parseSlots> }>();
  for (const a of avails) {
    availMap.set(`${a.date}|${a.secretaryId}`, { status: a.status, slots: parseSlots(a.slots) });
  }

  const draft = generateWeekDraft({
    days,
    impianti,
    secretaries: secretaries.map((s) => ({ id: s.id, weeklyMax: s.weeklyMax })),
    avail: (date, secId) => availMap.get(`${date}|${secId}`),
  });

  const impIds = impianti.map((i) => i.id);
  // Tuple uniche (giorno, segretaria, impianto) per fondere eventuali fasce adiacenti.
  const groups = [...new Set(draft.map((d) => `${d.date}|${d.secretaryId}|${d.impianto}`))]
    .map((k) => k.split("|") as [string, string, string]);

  await prisma.$transaction(async (tx) => {
    await tx.shift.deleteMany({ where: { date: { in: days }, impianto: { in: impIds } } });
    if (draft.length) await tx.shift.createMany({ data: draft });
    for (const [date, secretaryId, impianto] of groups) {
      await mergeAdjacentShifts(tx, date, secretaryId, impianto);
    }
  });

  revalidatePath("/manager", "layout");
  return { ok: true, count: draft.length };
}

export async function deleteShift(id: string) {
  await requireManager();
  await prisma.shift.delete({ where: { id } });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

export async function updateSecretary(input: {
  id: string;
  name: string;
  contractType: "fisso" | "a_chiamata";
  weeklyMax: number;
  color: string;
}) {
  await requireManager();
  const parsed = updateSecretarySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;
  await prisma.secretary.update({
    where: { id: data.id },
    data: {
      name: data.name,
      contractType: data.contractType,
      weeklyMax: data.weeklyMax,
      color: data.color,
    },
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

export async function deleteSecretary(id: string) {
  await requireManager();
  await prisma.secretary.delete({ where: { id } });
  revalidatePath("/manager", "layout");
  return { ok: true };
}

export async function addSecretary(input: {
  name: string;
  contractType: "fisso" | "a_chiamata";
  weeklyMax: number;
  color: string;
}) {
  await requireManager();
  const parsed = addSecretarySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;
  const slug = data.name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // rimuove accenti
    .replace(/[^a-z]/g, "").slice(0, 4) || "sec";
  const rand = Math.random().toString(36).slice(2, 6);
  const token = `${slug}-${rand}`;
  const agg = await prisma.secretary.aggregate({ _max: { sort: true } });
  await prisma.secretary.create({
    data: {
      name: data.name,
      contractType: data.contractType,
      weeklyMax: data.weeklyMax,
      color: data.color,
      token,
      sort: (agg._max.sort ?? 0) + 1,
    },
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}
