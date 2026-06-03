// Registro modifiche (audit log): chi ha cambiato cosa e quando.
import { prisma } from "./db";
import type { Slot } from "./validation";

export type AuditEntity = "availability" | "shift" | "secretary" | "impianto";
export type AuditAction = "create" | "update" | "delete";

export async function logAudit(e: {
  actor: string;
  entity: AuditEntity;
  action: AuditAction;
  summary: string;
  date?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor: e.actor,
      entity: e.entity,
      action: e.action,
      summary: e.summary,
      date: e.date ?? null,
      before: e.before != null ? JSON.stringify(e.before) : null,
      after: e.after != null ? JSON.stringify(e.after) : null,
    },
  });
}

/** Descrizione leggibile di uno stato disponibilità. */
export function describeAvailability(status: string, slots: Slot[]): string {
  if (status === "disponibile") return "disponibile";
  if (status === "non_disponibile") return "non disponibile";
  if (status === "parziale") {
    const fasce = slots.map((s) => `${s.start}–${s.end}`).join(", ");
    return fasce ? `parziale (${fasce})` : "parziale";
  }
  return status;
}
