// Geometria della griglia settimanale a fasce.
import { toMinutes } from "./time";

export const GRID_OPEN = "08:00";
export const GRID_CLOSE = "20:30";
export const GRID_HEIGHT = 625; // px
const OPEN_MIN = toMinutes(GRID_OPEN);
const CLOSE_MIN = toMinutes(GRID_CLOSE);
const PX_PER_MIN = GRID_HEIGHT / (CLOSE_MIN - OPEN_MIN);

export function topPx(hhmm: string): number {
  return Math.max(0, (toMinutes(hhmm) - OPEN_MIN) * PX_PER_MIN);
}
export function heightPx(start: string, end: string): number {
  return (toMinutes(end) - toMinutes(start)) * PX_PER_MIN;
}

/** Etichette orarie a sinistra (ogni ora intera nel range). */
export function hourLabels(): { label: string; top: number }[] {
  const out: { label: string; top: number }[] = [];
  for (let m = OPEN_MIN; m < CLOSE_MIN; m += 60) {
    const h = Math.floor(m / 60);
    out.push({ label: `${String(h).padStart(2, "0")}:00`, top: (m - OPEN_MIN) * PX_PER_MIN });
  }
  return out;
}
