"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { toMinutes } from "@/lib/time";

async function secretaryByToken(token: string) {
  const sec = await prisma.secretary.findUnique({ where: { token } });
  if (!sec || !sec.active) throw new Error("Link non valido");
  return sec;
}

export async function setAvailability(input: {
  token: string;
  date: string;
  status: "disponibile" | "parziale" | "non_disponibile";
  start?: string | null;
  end?: string | null;
  note?: string | null;
}) {
  const sec = await secretaryByToken(input.token);

  const isPartial = input.status === "parziale";
  const start = isPartial ? input.start ?? null : null;
  const end = isPartial ? input.end ?? null : null;
  if (isPartial && start && end && toMinutes(end) <= toMinutes(start)) {
    return { ok: false, error: "L'orario di fine deve essere dopo l'inizio." };
  }

  await prisma.availability.upsert({
    where: { secretaryId_date: { secretaryId: sec.id, date: input.date } },
    update: { status: input.status, start, end, note: input.note ?? null },
    create: { secretaryId: sec.id, date: input.date, status: input.status, start, end, note: input.note ?? null },
  });
  revalidatePath(`/d/${input.token}`);
  return { ok: true };
}

export async function setManyAvailability(input: {
  token: string;
  dates: string[];
  status: "disponibile" | "parziale" | "non_disponibile";
}) {
  const sec = await secretaryByToken(input.token);
  await prisma.$transaction(
    input.dates.map((date) =>
      prisma.availability.upsert({
        where: { secretaryId_date: { secretaryId: sec.id, date } },
        update: { status: input.status, start: null, end: null },
        create: { secretaryId: sec.id, date, status: input.status },
      })
    )
  );
  revalidatePath(`/d/${input.token}`);
  return { ok: true };
}

export async function clearMonth(input: { token: string; dates: string[] }) {
  const sec = await secretaryByToken(input.token);
  await prisma.availability.deleteMany({ where: { secretaryId: sec.id, date: { in: input.dates } } });
  revalidatePath(`/d/${input.token}`);
  return { ok: true };
}
