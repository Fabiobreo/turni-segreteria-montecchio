// Utility orari e date. Orari come "HH:MM", date come "YYYY-MM-DD".

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Durata in ore (decimale) tra due orari "HH:MM". */
export function durationHours(start: string, end: string): number {
  return (toMinutes(end) - toMinutes(start)) / 60;
}

/** Ore in formato italiano: 6.5 -> "6,5", 6 -> "6". */
export function formatHours(h: number): string {
  const rounded = Math.round(h * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const GIORNI_LUNGHI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/** Crea una Date a mezzanotte locale dalla stringa YYYY-MM-DD (evita shift UTC). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Lunedì della settimana che contiene `iso`. */
export function mondayOf(iso: string): string {
  const d = parseDate(iso);
  const dow = d.getDay(); // 0=dom ... 6=sab
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i));
}

/** Giorni del mese "YYYY-MM" come array di ISO date. */
export function monthDates(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => toISODate(new Date(y, m - 1, i + 1)));
}

export function dayShort(iso: string): string {
  return GIORNI_BREVI[parseDate(iso).getDay()];
}
export function dayLong(iso: string): string {
  return GIORNI_LUNGHI[parseDate(iso).getDay()];
}
export function dayNum(iso: string): number {
  return parseDate(iso).getDate();
}
/** "12 giu" — giorno + mese abbreviato. */
export function dayMonthShort(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}
export function monthName(monthKey: string): string {
  const [, m] = monthKey.split("-").map(Number);
  return MESI[m - 1];
}
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}
export function addMonthsKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function isWeekend(iso: string): boolean {
  const dow = parseDate(iso).getDay();
  return dow === 0 || dow === 6;
}

/** Etichetta intervallo settimana: "8 – 14 giugno 2026". */
export function weekLabel(mondayIso: string): string {
  const start = parseDate(mondayIso);
  const end = parseDate(addDays(mondayIso, 6));
  const y = end.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${MESI[end.getMonth()]} ${y}`;
  }
  return `${start.getDate()} ${MESI[start.getMonth()]} – ${end.getDate()} ${MESI[end.getMonth()]} ${y}`;
}
