// Generatore di bozza turni settimanale (euristica greedy).
//
// Vincoli rispettati:
//  - Disponibilità: assegna SOLO dove la segretaria è `disponibile` (intera fascia
//    ufficio) o `parziale` (nelle sue fasce). Mai dove `non_disponibile` o non indicata.
//  - Tetto ore settimanale (`weeklyMax`): non viene superato (0 = nessun tetto).
//  - Tetto ore giornaliero (`MAX_ORE_GIORNO`): nessuna segretaria supera il massimo
//    di ore in un singolo giorno (sommando tutti gli impianti).
//  - Copertura orari ufficio: copre [open, close] minimizzando i buchi.
//  - Max 2 in contemporanea: la bozza assegna una sola persona per fascia (≤1),
//    quindi è sempre entro il limite; il raddoppio resta a discrezione della manager.
//  - Durata minima turno (`MIN_ORE_TURNO`): non propone turni più corti del minimo;
//    se nessuno può coprire almeno il minimo da un certo punto, lascia scoperto
//    (niente "miniturni" da mezz'ora) e la manager rifinisce a mano.
//
// È una BOZZA: privilegia una copertura sensata, non l'ottimo globale.
import { toMinutes, toHHMM } from "./time";
import { officeHours, type ImpiantoConfig } from "./office";
import type { Slot } from "./validation";
import { MAX_ORE_GIORNO, MIN_ORE_TURNO } from "./constants";

export type AvailLite = { status: string; slots: Slot[] };
export type SecLite = { id: string; weeklyMax: number };
export type DraftShift = { date: string; secretaryId: string; start: string; end: string; impianto: string };

type Cand = { secId: string; start: number; end: number };

export function generateWeekDraft(args: {
  days: string[];
  impianti: ImpiantoConfig[];
  secretaries: SecLite[];
  /** Disponibilità di una segretaria in un giorno (undefined = non indicata). */
  avail: (date: string, secId: string) => AvailLite | undefined;
}): DraftShift[] {
  const { days, impianti, secretaries, avail } = args;
  // Budget residuo in minuti per segretaria (Infinity = nessun tetto).
  const remaining = new Map<string, number>(
    secretaries.map((s) => [s.id, s.weeklyMax > 0 ? s.weeklyMax * 60 : Infinity])
  );
  const active = impianti.filter((i) => i.attivo);
  const capGiorno = MAX_ORE_GIORNO * 60; // tetto giornaliero in minuti
  const minTurno = MIN_ORE_TURNO * 60; // durata minima turno in minuti
  const out: DraftShift[] = [];

  for (const date of days) {
    // Minuti già usati oggi da ciascuna segretaria (somma su tutti gli impianti).
    const usatiOggi = new Map<string, number>();
    // Budget residuo (minuti) per oggi = min(residuo settimanale, residuo giornaliero).
    const budgetFor = (id: string) =>
      Math.min(remaining.get(id) ?? 0, capGiorno - (usatiOggi.get(id) ?? 0));

    for (const imp of active) {
      const { open, close } = officeHours(date, imp);
      const o = toMinutes(open);
      const c = toMinutes(close);

      // Fasce candidate (disponibilità clampate all'orario ufficio).
      const cands: Cand[] = [];
      for (const s of secretaries) {
        const a = avail(date, s.id);
        if (!a) continue;
        if (a.status === "disponibile") {
          cands.push({ secId: s.id, start: o, end: c });
        } else if (a.status === "parziale") {
          for (const sl of a.slots) {
            const st = Math.max(o, toMinutes(sl.start));
            const en = Math.min(c, toMinutes(sl.end));
            if (en > st) cands.push({ secId: s.id, start: st, end: en });
          }
        }
      }

      // Copertura greedy: a ogni punto scoperto scegli chi arriva più lontano.
      let cursor = o;
      while (cursor < c) {
        // Tra chi copre `cursor` e può garantire almeno `minTurno`, scegli chi arriva più lontano.
        let best: string | null = null; // secId
        let bestReach = 0;
        for (const cand of cands) {
          if (cand.start <= cursor && cand.end > cursor) {
            const b = budgetFor(cand.secId); // sempre finito (tetto giornaliero)
            if (b <= 0) continue;
            const reach = Math.min(cand.end, cursor + b);
            if (reach - cursor >= minTurno && reach > bestReach) {
              best = cand.secId;
              bestReach = reach;
            }
          }
        }
        if (!best) {
          // Nessuno può garantire un turno >= minimo da qui: salta al prossimo inizio fascia.
          let next = Infinity;
          for (const cand of cands) {
            if (cand.start > cursor && budgetFor(cand.secId) > 0) next = Math.min(next, cand.start);
          }
          if (next === Infinity) break; // resta scoperto fino a chiusura
          cursor = next;
          continue;
        }
        const segEnd = bestReach;
        const usato = segEnd - cursor;
        out.push({ date, secretaryId: best, start: toHHMM(cursor), end: toHHMM(segEnd), impianto: imp.id });
        const weekly = remaining.get(best) ?? 0;
        if (Number.isFinite(weekly)) remaining.set(best, weekly - usato);
        usatiOggi.set(best, (usatiOggi.get(best) ?? 0) + usato);
        cursor = segEnd;
      }
    }
  }
  return out;
}
