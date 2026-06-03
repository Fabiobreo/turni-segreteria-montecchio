# CLAUDE.md

Guida per lavorare su **forus-turni**. UI e dominio sono in italiano: mantieni nomi, label e commenti in italiano.

## Cos'è

Web app per costruire i **turni mensili** di una segreteria di n persone, in sostituzione di una griglia Excel. Due ruoli:

- **Manager** (da PC, login a password): costruisce i turni, vede disponibilità, ore e avvisi di copertura.
- **Segretarie** ×5 (da telefono, link personale senza password): inseriscono le disponibilità mensili e vedono i propri turni assegnati.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, Server Actions, Server Components.
- **Prisma** ORM. DB = **PostgreSQL** (provider `postgresql`, vedi `schema.prisma`). Connessione via `DATABASE_URL` (pooled) + `DIRECT_URL` (diretta, per `db push`/`migrate`). Vedi `.env.example`.
- **UI:** Material-UI v9 (MUI).

## Comandi

```powershell
npm install
npx prisma generate
npx prisma db push      # crea/aggiorna lo schema sul DB Postgres
npm run db:seed         # carica le 5 segretarie (prisma/seed.ts)
npm run dev             # http://localhost:3000
npm run db:maggio       # (opzionale) turni + disponibilità maggio 2026 (mese completo)
```

`npm run build` · `npm run lint` · `npm run db:studio` (Prisma Studio).
npm è in `C:\Program Files\nodejs\npm.cmd` — disponibile in PowerShell, **non** nel tool Bash.

> ⚠️ **`npm run build` è il comando di deploy Vercel**: esegue `prisma db push --skip-generate --accept-data-loss && prisma generate && next build`. Quindi in locale **sincronizza il DB puntato da `.env` con perdita di dati** e rigenera il client. Per buildare in locale senza toccare il DB usa `npx next build`. Il `db push`+`generate` nel build serve perché Vercel cacha `node_modules`: senza, il client Prisma resta stale e i tipi non si aggiornano (es. errori su campi rimossi).

## Accessi (dev)

- Manager: `/manager` — password in `.env` (`MANAGER_PASSWORD`, default `turni2026`).
- Segretarie (token nel seed).

## Struttura

- `src/app/manager/` — area manager: `page.tsx` (vista **settimana**, home + poster), `mese`, `riepilogo`, `giorno/[date]` (editor turni del giorno), `login`. Logica server in `manager/actions.ts`.
- `src/app/d/[token]/` — area segretaria: `page.tsx` (disponibilità) e `turni/` (i propri turni). Logica server in `d/actions.ts`.
- `src/components/` — `DayEditor`, `AvailabilityEditor`, `SecretaryRow`, `WeekPoster` / `ShareableCalendar` (export immagine), `ManagerTop`, `PrintButton`.
- `src/lib/` — `time` (date/orari, ISO `YYYY-MM-DD`, `HH:MM`), `office` (orari ufficio per stagione), `coverage` (buchi di copertura, raddoppi, ore), `grid` (geometria griglia settimanale), `auth` (sessione manager), `db` (client Prisma), `export-image` (PNG + Web Share).
- `prisma/` — `schema.prisma`, `seed.ts`, `demo.cjs`.

## Modello dati (`prisma/schema.prisma`)

- **Secretary**: `contractType` (`fisso`|`a_chiamata`, solo informativo), `weeklyMax` (tetto **ore settimanali**, unico limite; 0 = non impostato), `color`, `token` (univoco), `active`, `sort`.
- **Availability**: `date`, `status` (`disponibile`|`parziale`|`non_disponibile`), `start`/`end` (solo se `parziale`), `note`. Unique su `[secretaryId, date]`.
- **Shift**: `date`, `secretaryId`, `start`, `end`.

## Regole di dominio importanti

- **Nessun target mensile**: il mese è solo un contatore di "ore lavorate" (nessun colore/target). I vecchi campi `targetHours`/`binding` sono stati **rimossi** — non reintrodurli.
- **Limiti ore**: tetto **settimanale** per segretaria = `weeklyMax` (0 = non impostato) + tetto **giornaliero** = `MAX_ORE_GIORNO` (6,5 h, `src/lib/constants.ts`). La bozza automatica li rispetta come vincoli rigidi; l'editor del giorno **avvisa** se un turno manuale sfora le 6,5 h/giorno (non blocca).
- **Ore turno** = `end − start`. Nessuna pausa pranzo dedotta; più turni nello stesso giorno si sommano.
- **Orari ufficio** (stagione estiva attiva, `src/lib/office.ts`): feriali 08:00–20:30, weekend 09:00–19:30. Max 2 persone in contemporanea; copertura piena obbligatoria. L'app **avvisa** su buchi e su >2 persone, ma non impedisce nulla. Stagione invernale: struttura pronta, orari da definire.
- Il raddoppio (2 persone insieme) è a discrezione della manager.
- Auth manager: cookie `manager_session` = `base64url("manager:<password>")` (`src/lib/auth.ts`). Sufficiente per 1 utente; non è sicurezza forte.

---

## Note

- Mese nuovo parte **vuoto**. Scadenza disponibilità (25 del mese precedente) è solo un promemoria, non blocca.
- Da iterare: gestione segretarie/token da UI (ora solo via seed), orari stagione invernale.
