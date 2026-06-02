import { isWeekend } from "./time";

export type ImpiantoConfig = {
  id: string;
  nome: string;
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  attivo: boolean;
  sort: number;
};

/** Orario di apertura/chiusura di un impianto per un giorno specifico (ISO date). */
export function officeHours(iso: string, impianto: ImpiantoConfig): { open: string; close: string } {
  return isWeekend(iso)
    ? { open: impianto.weekendOpen, close: impianto.weekendClose }
    : { open: impianto.weekdayOpen, close: impianto.weekdayClose };
}

/** Orario di riferimento per un giorno: unione di tutti gli impianti attivi (min open, max close). */
export function referenceHours(iso: string, impianti: ImpiantoConfig[]): { open: string; close: string } {
  const active = impianti.filter((i) => i.attivo);
  if (!active.length) {
    return isWeekend(iso) ? { open: "09:00", close: "19:30" } : { open: "08:00", close: "20:30" };
  }
  const hours = active.map((imp) => officeHours(iso, imp));
  const opens = hours.map((h) => h.open).sort();
  const closes = hours.map((h) => h.close).sort();
  return { open: opens[0], close: closes[closes.length - 1] };
}
