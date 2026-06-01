# Gestione Turni — Segreteria

App per costruire i turni mensili della segreteria. Manager da PC, segretarie da telefono.

Stack: **Next.js (App Router) + TypeScript + Prisma**. DB in sviluppo: **SQLite** (`prisma/dev.db`). Per il deploy si passa a Postgres hosted.

## Avvio in locale

```powershell
npm install
npx prisma generate
npx prisma db push     # crea il database SQLite
npm run db:seed        # carica le segretarie
npm run db:maggio      # (opzionale) turni + disponibilità maggio 2026
npm run dev            # http://localhost:3000
```

## Accessi

- **Manager:** http://localhost:3000/manager — password in `.env` (`MANAGER_PASSWORD`).
- **Segretarie:** link personale senza password (token nel seed)

## Struttura

- `src/app/manager/` — area manager: settimana (home), `mese`, `riepilogo`, `giorno/[date]` (editor turni), `login`.
- `src/app/d/[token]/` — area segretaria: disponibilità (home) e `turni`.
- `src/lib/` — `time` (date/orari), `office` (orari ufficio/stagioni), `coverage` (buchi, raddoppi, ore), `grid` (geometria settimana), `auth`, `db`.
- `prisma/schema.prisma` — modello dati; `prisma/seed.ts` — dati iniziali; `prisma/seed-maggio.cjs` — mese completo maggio 2026.

## Da sistemare lungo la via (note)

- Export immagine per WhatsApp (ora c'è Stampa/PDF).
- Stagione invernale: struttura pronta, orari da inserire in `src/lib/office.ts`.
- Gestione segretarie/token da UI (ora via seed).
- Deploy su Vercel + Postgres hosted (cambiare provider in `schema.prisma`).
