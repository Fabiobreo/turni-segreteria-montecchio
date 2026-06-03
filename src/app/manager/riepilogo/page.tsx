import { Suspense } from "react";
import { ButtonLink } from "@/components/ButtonLink";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { PrintButton } from "@/components/PrintButton";
import { MultiWeekPoster, type MWPWeek } from "@/components/MultiWeekPoster";
import { RiepilogoContentSkeleton } from "@/components/skeletons";
import { officeHours } from "@/lib/office";
import { coverageGaps, hoursBySecretary } from "@/lib/coverage";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey, addDays,
  mondayOf, weekDates, weekLabel, dayShort, dayNum,
  isWeekend, formatHours, durationHours,
} from "@/lib/time";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

export default async function RiepilogoPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  await requireManager();
  const { mese } = await searchParams;
  const monthKey = mese ?? monthKeyOf(toISODate(new Date()));
  const label = `${monthName(monthKey)} ${monthKey.slice(0, 4)}`;

  return (
    <>
      <ManagerTop active="riepilogo" />
      <Container maxWidth="lg" sx={{ py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Riepilogo mensile</Typography>
            <Typography variant="h1" component="h1" sx={{ textTransform: "capitalize" }}>{label}</Typography>
          </Box>
          <ButtonLink href={`/manager/riepilogo?mese=${addMonthsKey(monthKey, -1)}`} variant="outlined" size="small">‹</ButtonLink>
          <ButtonLink href={`/manager/riepilogo?mese=${addMonthsKey(monthKey, 1)}`}  variant="outlined" size="small">›</ButtonLink>
          <PrintButton />
        </Box>

        <Suspense fallback={<RiepilogoContentSkeleton />}>
          <RiepilogoContent monthKey={monthKey} label={label} />
        </Suspense>
      </Container>
    </>
  );
}

/** Tabella ore + totali + poster multi-settimana. */
async function RiepilogoContent({ monthKey, label }: { monthKey: string; label: string }) {
  const dates = monthDates(monthKey);
  const monthDatesSet = new Set(dates);

  const [secretaries, shifts, impianti] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } }, orderBy: { start: "asc" } }),
    prisma.impianto.findMany({ orderBy: { sort: "asc" } }),
  ]);
  const monthlyHours = hoursBySecretary(shifts);

  const totalHours = shifts.reduce((a, s) => a + durationHours(s.start, s.end), 0);
  const daysWithGaps = dates.filter((iso) => {
    const ds = shifts.filter((s) => s.date === iso);
    if (!ds.length) return false;
    return impianti.some((imp) => {
      const { open, close } = officeHours(iso, imp);
      return coverageGaps(ds.filter((s) => s.impianto === imp.id), open, close).length > 0;
    });
  });

  const posterWeeks: MWPWeek[] = [];
  let wStart = mondayOf(dates[0]);
  while (wStart <= dates[dates.length - 1]) {
    const wd = weekDates(wStart);
    const weekShifts = shifts.filter((s) => wd.includes(s.date));
    const weeklyHours = hoursBySecretary(weekShifts);
    posterWeeks.push({
      label: weekLabel(wStart),
      dayHeaders: wd.map((iso) => ({
        num: dayNum(iso), name: dayShort(iso),
        weekend: isWeekend(iso), inMonth: monthDatesSet.has(iso),
      })),
      secretaries: secretaries.map((s) => ({
        id: s.id, name: s.name, color: s.color,
        weekHours: formatHours(weeklyHours[s.id] ?? 0),
        days: wd.map((iso) =>
          weekShifts.filter((sh) => sh.date === iso && sh.secretaryId === s.id)
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((sh) => ({ start: sh.start, end: sh.end }))
        ),
      })),
      hasGaps: wd.some((iso) => {
        if (!monthDatesSet.has(iso)) return false;
        const ds = weekShifts.filter((sh) => sh.date === iso);
        return impianti.some((imp) => {
          const { open, close } = officeHours(iso, imp);
          const impShifts = ds.filter((s) => s.impianto === imp.id);
          return impShifts.length === 0 || coverageGaps(impShifts, open, close).length > 0;
        });
      }),
    });
    wStart = addDays(wStart, 7);
  }

  return (
    <>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 3 }}>
        {/* Ore per segretaria */}
        <Paper sx={{ p: 2, flex: 1, minWidth: 360 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>Ore lavorate per segretaria</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Segretaria</TableCell>
                <TableCell>Contratto</TableCell>
                <TableCell>Tetto/sett.</TableCell>
                <TableCell align="right">Ore mese</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secretaries.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span>
                  </TableCell>
                  <TableCell>{s.contractType === "fisso" ? "Fisso" : "A chiamata"}</TableCell>
                  <TableCell>{s.weeklyMax ? `${s.weeklyMax} h` : "—"}</TableCell>
                  <TableCell align="right"><strong>{formatHours(monthlyHours[s.id] ?? 0)} h</strong></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Ore effettivamente assegnate nel mese. Il limite è settimanale.
          </Typography>
        </Paper>

        {/* Totali */}
        <Paper sx={{ p: 2, width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
          <Typography variant="h3">Totali</Typography>
          <Box>
            <Typography sx={{ fontSize: "1.75rem", fontWeight: 800 }}>{formatHours(totalHours)} h</Typography>
            <Typography variant="body2" color="text.secondary">ore pianificate</Typography>
          </Box>
          <Divider flexItem />
          <Box>
            <Typography sx={{ fontSize: "1.75rem", fontWeight: 800, color: daysWithGaps.length ? "error.main" : "success.main" }}>
              {daysWithGaps.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">giorni con fasce scoperte</Typography>
          </Box>
          {daysWithGaps.length > 0 && (
            <Alert severity="warning" sx={{ width: "100%", textAlign: "left", fontSize: "0.8rem" }}>
              Risolvi i giorni {daysWithGaps.map((d) => dayNum(d)).join(", ")} prima di condividere.
            </Alert>
          )}
        </Paper>
      </Box>

      <MultiWeekPoster monthLabel={label} weeks={posterWeeks} />
    </>
  );
}
