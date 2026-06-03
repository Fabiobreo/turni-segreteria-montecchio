// Schemi di validazione condivisi (client + server actions) e parsing sicuro.
import { z } from "zod";
import { toMinutes } from "./time";

/** "HH:MM" 00:00–23:59. */
export const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido (HH:MM).");
/** "YYYY-MM-DD". */
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida (YYYY-MM-DD).");

export const slotSchema = z
  .object({ start: HHMM, end: HHMM })
  .refine((s) => toMinutes(s.end) > toMinutes(s.start), {
    message: "Ogni fascia deve avere orario fine dopo inizio.",
    path: ["end"],
  });
export type Slot = z.infer<typeof slotSchema>;

export const slotsArraySchema = z.array(slotSchema);

/** Parsa in sicurezza il campo `slots` (JSON dal DB o dal client): [] se nullo o malformato. */
export function parseSlots(raw: string | null | undefined): Slot[] {
  if (!raw) return [];
  try {
    const res = slotsArraySchema.safeParse(JSON.parse(raw));
    return res.success ? res.data : [];
  } catch {
    return [];
  }
}

export const shiftInputSchema = z
  .object({
    id: z.string().optional(),
    date: ISODate,
    secretaryId: z.string().min(1, "Segretaria mancante."),
    start: HHMM,
    end: HHMM,
    impianto: z.string().optional(),
  })
  .refine((s) => toMinutes(s.end) > toMinutes(s.start), {
    message: "L'orario di fine deve essere dopo l'inizio.",
    path: ["end"],
  });

export const availabilityInputSchema = z.object({
  token: z.string().min(1),
  date: ISODate,
  status: z.enum(["disponibile", "parziale", "non_disponibile"]),
  slots: z.string().nullish(),
  note: z.string().nullish(),
});

export const manyAvailabilitySchema = z.object({
  token: z.string().min(1),
  dates: z.array(ISODate).min(1),
  status: z.enum(["disponibile", "non_disponibile"]),
});

const secretaryFields = {
  name: z.string().trim().min(1, "Il nome non può essere vuoto."),
  contractType: z.enum(["fisso", "a_chiamata"]),
  weeklyMax: z.coerce.number().int().min(0).max(168),
  color: z.string().min(1),
};
export const addSecretarySchema = z.object(secretaryFields);
export const updateSecretarySchema = z.object({ id: z.string().min(1), ...secretaryFields });

export const impiantoSchema = z.object({
  id: z.string().min(1),
  nome: z.string().trim().min(1, "Il nome non può essere vuoto."),
  icona: z.string().trim().min(1, "Scegli un'icona.").max(8),
  weekdayOpen: HHMM,
  weekdayClose: HHMM,
  weekendOpen: HHMM,
  weekendClose: HHMM,
  attivo: z.boolean(),
});

/** Nuovo impianto: l'id viene generato dal server, qui non serve. */
export const createImpiantoSchema = impiantoSchema.omit({ id: true });

/** Primo messaggio d'errore leggibile da un ZodError. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dati non validi.";
}
