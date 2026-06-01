# CLAUDE.md

Guida per lavorare su **forus-turni**. UI e dominio sono in italiano: mantieni nomi, label e commenti in italiano.

## Cos'è

Web app per costruire i **turni mensili** di una segreteria di 5 persone, in sostituzione di una griglia Excel. Due ruoli:

- **Manager** (da PC, login a password): costruisce i turni, vede disponibilità, ore e avvisi di copertura.
- **Segretarie** ×5 (da telefono, link personale senza password): inseriscono le disponibilità mensili e vedono i propri turni assegnati.

Le 5 segretarie: Mara, Sonia (contratto `fisso`), Beatrice, Emma, Arianna (`a_chiamata`).

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript**, Server Actions, Server Components.
- **Prisma** ORM. Dev DB = **SQLite** (`prisma/dev.db`). Per il deploy si cambia `provider` in `schema.prisma` a `postgresql`.
- **CSS globale scritto a mano** in `src/app/globals.css` (niente Tailwind). Alias import: `@/*` → `src/*`.

## Comandi

```powershell
npm install
npx prisma generate
npx prisma db push      # crea/aggiorna lo schema SQLite
npm run db:seed         # carica le 5 segretarie (prisma/seed.ts)
npm run dev             # http://localhost:3000
npm run db:maggio       # (opzionale) turni + disponibilità maggio 2026 (mese completo)
```

`npm run build` · `npm run lint` · `npm run db:studio` (Prisma Studio).
npm è in `C:\Program Files\nodejs\npm.cmd` — disponibile in PowerShell, **non** nel tool Bash.

## Accessi (dev)

- Manager: `/manager` — password in `.env` (`MANAGER_PASSWORD`, default `turni2026`).
- Segretarie (token nel seed): Mara `/d/mara-7f3a`, Sonia `/d/sonia-2b9c`, Beatrice `/d/bea-5e1d`, Emma `/d/emma-9a4f`, Arianna `/d/ari-c8d2`.

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

- **Nessun target mensile**: il mese è solo un contatore di "ore lavorate" (nessun colore/target). L'unico limite è `weeklyMax` (settimanale). I vecchi campi `targetHours`/`binding` sono stati **rimossi** — non reintrodurli.
- **Ore turno** = `end − start`. Nessuna pausa pranzo dedotta; più turni nello stesso giorno si sommano.
- **Orari ufficio** (stagione estiva attiva, `src/lib/office.ts`): feriali 08:00–20:30, weekend 09:00–19:30. Max 2 persone in contemporanea; copertura piena obbligatoria. L'app **avvisa** su buchi e su >2 persone, ma non impedisce nulla. Stagione invernale: struttura pronta, orari da definire.
- Il raddoppio (2 persone insieme) è a discrezione della manager.
- Auth manager: cookie `manager_session` = `base64url("manager:<password>")` (`src/lib/auth.ts`). Sufficiente per 1 utente; non è sicurezza forte.

## Deploy (Vercel + Neon Postgres)

Procedura una-tantum:

### 1. Repo GitHub
```powershell
git init && git add . && git commit -m "init"
# crea repo su github.com, poi:
git remote add origin https://github.com/<utente>/forus-turni.git
git push -u origin main
```

### 2. Switch schema a PostgreSQL
In `prisma/schema.prisma`: commentare il blocco `sqlite` e decommentare quello `postgresql` (già preparato nel file).

### 3. Vercel
- vercel.com → **New Project** → importa il repo GitHub
- Framework: Next.js (rilevato auto)
- **Build Command**: `prisma generate && prisma db push && next build`
- **Install Command**: lascia default (`npm install`)

### 4. Database Neon
Nel dashboard Vercel → **Storage** → **Create Database** → **Neon**.
Questo aggiunge automaticamente `DATABASE_URL` e `POSTGRES_PRISMA_URL` alle env vars del progetto.
Aggiungere manualmente anche `DIRECT_URL` (prendere la "direct connection string" da Neon → Connection Details).

### 5. Variabili d'ambiente su Vercel
| Variabile | Valore |
|-----------|--------|
| `DATABASE_URL` | stringa Neon **pooled** (auto da Storage) |
| `DIRECT_URL` | stringa Neon **direct** (da Neon dashboard) |
| `MANAGER_PASSWORD` | password scelta per la manager |

### 6. Primo deploy → seed
Dopo il primo deploy, eseguire il seed dal PC locale puntando al DB di produzione:
```powershell
# Copia le env vars di produzione in locale
npx vercel env pull .env.production.local
# Lancia il seed puntando a Neon
$env:DATABASE_URL = "<neon-direct-url>"; $env:DIRECT_URL = "<neon-direct-url>"; npm run db:seed
```
Oppure dal Vercel Dashboard → Functions → apri una console e lancia il seed.

### Riepilogo differenze dev → prod
| | Dev | Prod |
|--|-----|------|
| `schema.prisma` provider | `sqlite` | `postgresql` |
| `DATABASE_URL` | `file:./dev.db` | stringa Neon pooled |
| `DIRECT_URL` | *(non usata)* | stringa Neon direct |

---

## Note

- Mese nuovo parte **vuoto**. Scadenza disponibilità (25 del mese precedente) è solo un promemoria, non blocca.
- Da iterare: gestione segretarie/token da UI (ora solo via seed), orari stagione invernale.
