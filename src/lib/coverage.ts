// Logica di copertura giornaliera e calcolo ore.
import { toMinutes, toHHMM, durationHours } from "./time";

export type ShiftLike = { start: string; end: string; secretaryId?: string };
export type Interval = { start: string; end: string };

/** Fasce scoperte tra open e close dato l'insieme dei turni del giorno. */
export function coverageGaps(shifts: ShiftLike[], open: string, close: string): Interval[] {
  const o = toMinutes(open);
  const c = toMinutes(close);
  // unione degli intervalli coperti
  const ranges = shifts
    .map((s) => [Math.max(o, toMinutes(s.start)), Math.min(c, toMinutes(s.end))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);

  const gaps: Interval[] = [];
  let cursor = o;
  for (const [a, b] of ranges) {
    if (a > cursor) gaps.push({ start: toHHMM(cursor), end: toHHMM(a) });
    cursor = Math.max(cursor, b);
  }
  if (cursor < c) gaps.push({ start: toHHMM(cursor), end: toHHMM(c) });
  return gaps;
}

/** Numero massimo di persone contemporaneamente presenti. */
export function maxConcurrent(shifts: ShiftLike[]): number {
  const events: [number, number][] = [];
  for (const s of shifts) {
    events.push([toMinutes(s.start), 1]);
    events.push([toMinutes(s.end), -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let max = 0;
  for (const [, delta] of events) {
    cur += delta;
    if (cur > max) max = cur;
  }
  return max;
}

/** Assegna le corsie (colonne affiancate) ai turni che si sovrappongono nello stesso giorno. */
export function assignLanes<T extends ShiftLike>(shifts: T[]): { items: { shift: T; lane: number }[]; lanes: number } {
  const sorted = [...shifts].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const laneEnd: number[] = []; // minuto di fine per ogni corsia occupata
  const items = sorted.map((s) => {
    const st = toMinutes(s.start);
    const en = toMinutes(s.end);
    let lane = laneEnd.findIndex((e) => e <= st);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(en);
    } else {
      laneEnd[lane] = en;
    }
    return { shift: s, lane };
  });
  return { items, lanes: Math.max(1, laneEnd.length) };
}

/** Totale ore per segretaria su un insieme di turni. */
export function hoursBySecretary(shifts: ShiftLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of shifts) {
    if (!s.secretaryId) continue;
    out[s.secretaryId] = (out[s.secretaryId] ?? 0) + durationHours(s.start, s.end);
  }
  return out;
}
