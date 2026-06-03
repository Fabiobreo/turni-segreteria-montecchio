"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  availabilityInputSchema,
  manyAvailabilitySchema,
  parseSlots,
  ISODate,
  firstError,
} from "@/lib/validation";
import { logAudit, describeAvailability } from "@/lib/audit";
import { dayMonthShort, weekDates } from "@/lib/time";

async function secretaryByToken(token: string) {
  const sec = await prisma.secretary.findUnique({ where: { token } });
  if (!sec || !sec.active) throw new Error("Link non valido");
  return sec;
}

export async function setAvailability(input: {
  token: string;
  date: string;
  status: "disponibile" | "parziale" | "non_disponibile";
  slots?: string | null; // JSON: [{start,end}, ...]
  note?: string | null;
}) {
  const parsed = availabilityInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;
  const sec = await secretaryByToken(data.token);

  // Le fasce hanno senso solo se "parziale"; parseSlots valida e scarta i dati malformati.
  let slots: string | null = null;
  if (data.status === "parziale" && data.slots) {
    const valid = parseSlots(data.slots);
    if (valid.length === 0) {
      return { ok: false, error: "Ogni fascia deve avere orario fine dopo inizio." };
    }
    slots = JSON.stringify(valid);
  }

  const before = await prisma.availability.findUnique({
    where: { secretaryId_date: { secretaryId: sec.id, date: data.date } },
  });

  await prisma.availability.upsert({
    where: { secretaryId_date: { secretaryId: sec.id, date: data.date } },
    update: { status: data.status, slots, note: data.note ?? null },
    create: { secretaryId: sec.id, date: data.date, status: data.status, slots, note: data.note ?? null },
  });

  const afterDesc = describeAvailability(data.status, parseSlots(slots));
  const beforeDesc = before ? describeAvailability(before.status, parseSlots(before.slots)) : null;
  await logAudit({
    actor: sec.name,
    entity: "availability",
    action: before ? "update" : "create",
    date: data.date,
    summary: `${sec.name} · ${dayMonthShort(data.date)}: ${afterDesc}${beforeDesc ? ` (prima: ${beforeDesc})` : ""}`,
    before: before ? { status: before.status, slots: before.slots, note: before.note } : null,
    after: { status: data.status, slots, note: data.note ?? null },
  });

  revalidatePath(`/d/${data.token}`);
  return { ok: true };
}

export async function setManyAvailability(input: {
  token: string;
  dates: string[];
  status: "disponibile" | "non_disponibile";
}) {
  const parsed = manyAvailabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;
  const sec = await secretaryByToken(data.token);
  await prisma.$transaction(
    data.dates.map((date) =>
      prisma.availability.upsert({
        where: { secretaryId_date: { secretaryId: sec.id, date } },
        update: { status: data.status, slots: null },
        create: { secretaryId: sec.id, date, status: data.status },
      })
    )
  );
  await logAudit({
    actor: sec.name,
    entity: "availability",
    action: "update",
    summary: `${sec.name}: ${data.dates.length} giorni → ${data.status === "disponibile" ? "disponibile" : "non disponibile"}`,
    after: { dates: data.dates, status: data.status },
  });
  revalidatePath(`/d/${data.token}`);
  return { ok: true };
}

export async function clearMonth(input: { token: string; dates: string[] }) {
  const sec = await secretaryByToken(input.token);
  const deleted = await prisma.availability.deleteMany({ where: { secretaryId: sec.id, date: { in: input.dates } } });
  if (deleted.count > 0) {
    await logAudit({
      actor: sec.name,
      entity: "availability",
      action: "delete",
      summary: `${sec.name}: cancellate ${deleted.count} disponibilità`,
      before: { dates: input.dates },
    });
  }
  revalidatePath(`/d/${input.token}`);
  return { ok: true };
}

/**
 * Copia la disponibilità di una settimana di calendario (lun–dom) su un'altra,
 * abbinando i giorni per posizione (lun→lun, ...). Ragiona su settimane intere:
 * - la sorgente può stare nel mese precedente (es. copiando la 1ª settimana);
 * - i giorni destinazione che sforano nel mese successivo vengono comunque scritti;
 * - NON scrive nei giorni precedenti al mese corrente (`monthKey`), per non
 *   sovrascrivere il mese prima.
 */
export async function copyWeekAvailability(input: {
  token: string;
  fromMonday: string;
  toMonday: string;
  monthKey: string; // "YYYY-MM" del mese visualizzato
}) {
  const fromOk = ISODate.safeParse(input.fromMonday);
  const toOk = ISODate.safeParse(input.toMonday);
  if (!fromOk.success || !toOk.success) return { ok: false, error: "Date non valide." };
  const sec = await secretaryByToken(input.token);

  const fromDays = weekDates(fromOk.data);
  const toDays = weekDates(toOk.data);
  const monthFloor = `${input.monthKey}-01`;

  const src = await prisma.availability.findMany({ where: { secretaryId: sec.id, date: { in: fromDays } } });
  const byDate = new Map(src.map((a) => [a.date, a]));

  let copied = 0;
  // Voci risultanti per i giorni del mese corrente, così il client aggiorna subito la UI.
  const result: { date: string; status: string; slots: ReturnType<typeof parseSlots>; note: string | null }[] = [];
  const cleared: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < 7; i++) {
      const target = toDays[i];
      if (target < monthFloor) continue; // non toccare il mese precedente
      const inCurrentMonth = target.startsWith(input.monthKey);
      const s = byDate.get(fromDays[i]);
      if (s) {
        await tx.availability.upsert({
          where: { secretaryId_date: { secretaryId: sec.id, date: target } },
          update: { status: s.status, slots: s.slots, note: s.note },
          create: { secretaryId: sec.id, date: target, status: s.status, slots: s.slots, note: s.note },
        });
        copied++;
        if (inCurrentMonth) result.push({ date: target, status: s.status, slots: parseSlots(s.slots), note: s.note });
      } else {
        await tx.availability.deleteMany({ where: { secretaryId: sec.id, date: target } });
        if (inCurrentMonth) cleared.push(target);
      }
    }
  });

  await logAudit({
    actor: sec.name,
    entity: "availability",
    action: "update",
    summary: `${sec.name}: copiata disponibilità dalla settimana del ${dayMonthShort(fromOk.data)} a quella del ${dayMonthShort(toOk.data)} (${copied} giorni)`,
    after: { fromMonday: fromOk.data, toMonday: toOk.data },
  });

  revalidatePath(`/d/${input.token}`);
  return { ok: true, copied, result, cleared };
}
