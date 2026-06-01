import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey,
  dayShort, dayNum, durationHours, formatHours,
} from "@/lib/time";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";

export default async function MyShiftsPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mese?: string }>;
}) {
  const { token } = await params;
  const { mese } = await searchParams;
  const sec = await prisma.secretary.findUnique({ where: { token } });
  if (!sec || !sec.active) notFound();

  const monthKey = mese ?? monthKeyOf(toISODate(new Date()));
  const dates = monthDates(monthKey);

  const [myShifts, allShifts, others] = await Promise.all([
    prisma.shift.findMany({ where: { secretaryId: sec.id, date: { in: dates } }, orderBy: [{ date: "asc" }, { start: "asc" }] }),
    prisma.shift.findMany({ where: { date: { in: dates } } }),
    prisma.secretary.findMany(),
  ]);

  const nameById = new Map(others.map((o) => [o.id, o.name]));
  const total = myShifts.reduce((a, s) => a + durationHours(s.start, s.end), 0);

  return (
    <div className="mobile">
      <div className="mhead">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">{sec.name}</Typography>
            <Typography variant="h2" component="h1" sx={{ textTransform: "capitalize" }}>
              I miei turni · {monthName(monthKey)} {monthKey.slice(0, 4)}
            </Typography>
          </Box>
          <Link className="btn-nav" href={`/d/${token}/turni?mese=${addMonthsKey(monthKey, -1)}`}>‹</Link>
          <Link className="btn-nav" href={`/d/${token}/turni?mese=${addMonthsKey(monthKey, 1)}`}>›</Link>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Chip label={`Ore lavorate questo mese: ${formatHours(total)}h`} color="info" size="small" />
        </Box>
      </div>

      <div className="mbody">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {myShifts.length === 0 && (
            <Typography color="text.secondary" variant="body2" sx={{ textAlign: "center" }}>
              Nessun turno assegnato per questo mese.
            </Typography>
          )}
          {myShifts.map((s) => {
            const colleagues = allShifts
              .filter((x) => x.date === s.date && x.secretaryId !== sec.id)
              .map((x) => `${nameById.get(x.secretaryId)} ${x.start}–${x.end}`);
            return (
              <Paper key={s.id} sx={{ p: 2 }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Box sx={{ width: 54, textAlign: "center", flexShrink: 0 }}>
                    <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>{dayNum(s.date)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>{dayShort(s.date)}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{s.start} – {s.end}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatHours(durationHours(s.start, s.end))} ore
                      {colleagues.length ? ` · con ${colleagues.join(", ")}` : " · da sola"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            );
          })}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", mt: 1 }}>
            I turni li imposta la manager. Qui li vedi sempre aggiornati.
          </Typography>
        </Box>
      </div>

      <div className="mtab">
        <Link href={`/d/${token}`}><span className="ic">📅</span>Disponibilità</Link>
        <Link className="active" href={`/d/${token}/turni`}><span className="ic">🗓️</span>I miei turni</Link>
      </div>
    </div>
  );
}
