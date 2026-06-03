// Scheletri di caricamento per le viste. Usati come `fallback` dei <Suspense>
// così la shell (nav + intestazione) appare subito e solo le parti che
// dipendono dal DB mostrano il placeholder animato.
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { GRID_HEIGHT } from "@/lib/grid";

const DAYS = Array.from({ length: 7 });

/** Chip/legenda finti (riga di pill colorate). */
function LegendSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Box sx={{ display: "flex", mb: 1.5, flexWrap: "wrap", gap: 1, alignItems: "center" }}>
      <Skeleton variant="text" width={56} />
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={64} height={22} />
      ))}
    </Box>
  );
}

/** Griglia settimanale a fasce (Paper con weekgrid). */
export function WeekGridSkeleton() {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <LegendSkeleton />
      <Box sx={{ overflowX: "auto" }}>
        <div className="weekgrid">
          <div className="hcell" />
          {DAYS.map((_, i) => (
            <div key={i} className="dayhead">
              <Skeleton variant="text" width={18} sx={{ mx: "auto" }} />
              <Skeleton variant="text" width={28} sx={{ mx: "auto", fontSize: "0.7rem" }} />
            </div>
          ))}
          <div className="timecol" />
          {DAYS.map((_, i) => (
            <div key={i} className="daybody">
              <Skeleton
                variant="rounded"
                sx={{ position: "absolute", left: 4, right: 4, top: 30 + (i % 3) * 24, height: 70 }}
              />
              <Skeleton
                variant="rounded"
                sx={{ position: "absolute", left: 4, right: 4, top: 170 + (i % 2) * 36, height: 110 }}
              />
            </div>
          ))}
        </div>
      </Box>
    </Paper>
  );
}

/** Tabella ore + pannello avvisi affiancati. */
function HoursAndAlertsSkeleton() {
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      <Paper sx={{ p: 2, flex: 1, minWidth: 380 }}>
        <Skeleton variant="text" width={160} sx={{ fontSize: "1.1rem", mb: 1.5 }} />
        <Table size="small">
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton variant="rounded" width={70} height={20} /></TableCell>
                <TableCell align="center"><Skeleton variant="rounded" width={64} height={22} sx={{ mx: "auto" }} /></TableCell>
                <TableCell align="right"><Skeleton variant="text" width={40} sx={{ ml: "auto" }} /></TableCell>
                <TableCell><Skeleton variant="text" width={28} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Paper sx={{ p: 2, width: 320 }}>
        <Skeleton variant="text" width={130} sx={{ fontSize: "1.1rem", mb: 1.5 }} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={`${70 - i * 8}%`} height={24} />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

/** Poster condivisibile (blocco largo in fondo). */
function PosterSkeleton() {
  return <Skeleton variant="rounded" height={220} sx={{ mt: 2 }} />;
}

/** Contenuto completo della vista Settimana. */
export function WeekContentSkeleton() {
  return (
    <>
      <WeekGridSkeleton />
      <HoursAndAlertsSkeleton />
      <PosterSkeleton />
    </>
  );
}

/** Contenuto della vista Mese (calendario + sidebar stato). */
export function MonthContentSkeleton() {
  return (
    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      <Paper sx={{ p: 2, flex: 1, minWidth: 480 }}>
        <LegendSkeleton />
        <Box sx={{ overflowX: "auto" }}>
          <div className="grid">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
              <div key={d} className="gh">{d}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" sx={{ minHeight: 104, borderRadius: "10px" }} />
            ))}
          </div>
        </Box>
      </Paper>
      <Box sx={{ width: 280 }}>
        <Paper sx={{ p: 2 }}>
          <Skeleton variant="text" width={120} sx={{ fontSize: "1.1rem", mb: 2 }} />
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          </Box>
          <Table size="small">
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ pl: 0 }}><Skeleton variant="text" width={90} /></TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}><Skeleton variant="text" width={40} sx={{ ml: "auto" }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Skeleton variant="rounded" height={32} sx={{ mt: 2 }} />
        </Paper>
      </Box>
    </Box>
  );
}

/** Contenuto del Riepilogo mensile (tabella ore + totali + poster multi-settimana). */
export function RiepilogoContentSkeleton() {
  return (
    <>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: 360 }}>
          <Skeleton variant="text" width={220} sx={{ fontSize: "1.1rem", mb: 2 }} />
          <Table size="small">
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="rounded" width={70} height={20} /></TableCell>
                  <TableCell><Skeleton variant="text" width={70} /></TableCell>
                  <TableCell><Skeleton variant="text" width={40} /></TableCell>
                  <TableCell align="right"><Skeleton variant="text" width={40} sx={{ ml: "auto" }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <Paper sx={{ p: 2, width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Skeleton variant="text" width={80} sx={{ fontSize: "1.1rem" }} />
          <Skeleton variant="rounded" width={120} height={48} />
          <Skeleton variant="rounded" width={120} height={48} />
        </Paper>
      </Box>
      <Skeleton variant="rounded" height={360} />
    </>
  );
}

/** Editor del giorno (timeline + colonna controlli). */
export function DayEditorSkeleton() {
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
      <Paper sx={{ p: 2, flex: 1, minWidth: 320 }}>
        <LegendSkeleton count={4} />
        <Skeleton variant="rounded" height={GRID_HEIGHT} />
      </Paper>
      <Paper sx={{ p: 2, width: 320 }}>
        <Skeleton variant="text" width={140} sx={{ fontSize: "1.1rem", mb: 1.5 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />
        ))}
      </Paper>
    </Box>
  );
}

/** Lista turni della segretaria (mobile). */
export function MyShiftsSkeleton() {
  return (
    <Box sx={{ px: 2, pt: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={78} sx={{ borderRadius: "0 12px 12px 0" }} />
      ))}
    </Box>
  );
}

/** Lista righe segretarie (impostazioni). */
export function SecretariesListSkeleton() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={84} />
      ))}
    </Box>
  );
}

/** Lista card impianti (impostazioni orari). */
export function ImpiantiListSkeleton() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {Array.from({ length: 2 }).map((_, i) => (
        <Paper key={i} sx={{ p: 3 }}>
          <Skeleton variant="text" width={140} sx={{ fontSize: "1.1rem" }} />
          <Skeleton variant="text" width={90} sx={{ fontSize: "0.75rem", mb: 2 }} />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} variant="rounded" width={120} height={48} />
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

/** Editor disponibilità della segretaria (mobile). */
export function AvailabilitySkeleton() {
  return (
    <Box sx={{ maxWidth: 460, mx: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Skeleton variant="rounded" height={64} sx={{ mb: 1 }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={56} />
      ))}
    </Box>
  );
}
