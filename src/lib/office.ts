// Orari d'ufficio per stagione. Per ora attiva la stagione estiva.
// Struttura pronta per aggiungere la stagione invernale come configurazione.

import { isWeekend } from "./time";

export type Season = "estiva" | "invernale";

export const ACTIVE_SEASON: Season = "estiva";

type Hours = { open: string; close: string };

const SEASON_HOURS: Record<Season, { weekday: Hours; weekend: Hours }> = {
  estiva: {
    weekday: { open: "08:00", close: "20:30" },
    weekend: { open: "09:00", close: "19:30" },
  },
  // Valori da definire: per ora uguali all'estiva come placeholder.
  invernale: {
    weekday: { open: "08:00", close: "20:30" },
    weekend: { open: "09:00", close: "19:30" },
  },
};

/** Orario di apertura/chiusura per un giorno specifico (ISO date). */
export function officeHours(iso: string, season: Season = ACTIVE_SEASON): Hours {
  const h = SEASON_HOURS[season];
  return isWeekend(iso) ? h.weekend : h.weekday;
}
