"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManager, logout } from "@/lib/auth";
import { toMinutes } from "@/lib/time";

export async function logoutAction() {
  await logout();
  redirect("/manager/login");
}

export async function saveShift(input: {
  id?: string;
  date: string;
  secretaryId: string;
  start: string;
  end: string;
}) {
  await requireManager();
  if (toMinutes(input.end) <= toMinutes(input.start)) {
    return { ok: false, error: "L'orario di fine deve essere dopo l'inizio." };
  }
  if (input.id) {
    await prisma.shift.update({
      where: { id: input.id },
      data: { date: input.date, secretaryId: input.secretaryId, start: input.start, end: input.end },
    });
  } else {
    await prisma.shift.create({
      data: { date: input.date, secretaryId: input.secretaryId, start: input.start, end: input.end },
    });
  }
  revalidatePath("/manager", "layout");
  return { ok: true };
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
  if (!input.name.trim()) return { ok: false, error: "Il nome non può essere vuoto." };
  await prisma.secretary.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      contractType: input.contractType,
      weeklyMax: Math.max(0, Math.round(input.weeklyMax)),
      color: input.color,
    },
  });
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
  if (!input.name.trim()) return { ok: false, error: "Il nome non può essere vuoto." };
  const slug = input.name.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // rimuove accenti
    .replace(/[^a-z]/g, "").slice(0, 4) || "sec";
  const rand = Math.random().toString(36).slice(2, 6);
  const token = `${slug}-${rand}`;
  const agg = await prisma.secretary.aggregate({ _max: { sort: true } });
  await prisma.secretary.create({
    data: {
      name: input.name.trim(),
      contractType: input.contractType,
      weeklyMax: Math.max(0, Math.round(input.weeklyMax)),
      color: input.color,
      token,
      sort: (agg._max.sort ?? 0) + 1,
    },
  });
  revalidatePath("/manager", "layout");
  return { ok: true };
}
