import Link from "next/link";
import { ButtonLink } from "@/components/ButtonLink";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { officeHours } from "@/lib/office";
import { coverageGaps, hoursBySecretary } from "@/lib/coverage";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey,
  parseDate, isWeekend, formatHours,
} from "@/lib/time";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  await requireManager();
  const { mese } = await searchParams;
  const monthKey = mese ?? monthKeyOf(toISODate(new Date()));
  const dates = monthDates(monthKey);

  const [secretaries, shifts] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } }, orderBy: { start: "asc" } }),
  ]);
  const secById = new Map(secretaries.map((s) => [s.id, s]));
  const monthlyHours = hoursBySecretary(shifts);

  const firstDow = parseDate(dates[0]).getDay();
  const leading = (firstDow + 6) % 7;
  const today = toISODate(new Date());

  let built = 0, withGaps = 0;
  for (const iso of dates) {
    const ds = shifts.filter((s) => s.date === iso);
    if (ds.length > 0) {
      built++;
      const { open, close } = officeHours(iso);
      if (coverageGaps(ds, open, close).length > 0) withGaps++;
    }
  }

  return (
    <>
      <ManagerTop active="mese" />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Panoramica mese</Typography>
            <Typography variant="h1" component="h1" sx={{ textTransform: "capitalize" }}>
              {monthName(monthKey)} {monthKey.slice(0, 4)}
            </Typography>
          </Box>
          <ButtonLink href={`/manager/mese?mese=${addMonthsKey(monthKey, -1)}`} variant="outlined" size="small">‹ Mese prec.</ButtonLink>
          <ButtonLink href={`/manager/mese?mese=${addMonthsKey(monthKey, 1)}`}  variant="outlined" size="small">Mese succ. ›</ButtonLink>
        </Box>

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {/* Griglia mensile */}
          <Paper sx={{ p: 2, flex: 1, minWidth: 480 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">Legenda:</Typography>
              {secretaries.map((s) => (
                <span key={s.id} className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span>
              ))}
            </Box>
            <div className="grid">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
                <div key={d} className="gh">{d}</div>
              ))}
              {Array.from({ length: leading }).map((_, i) => (
                <div key={`lead-${i}`} className="cell out" />
              ))}
              {dates.map((iso) => {
                const ds = shifts.filter((s) => s.date === iso);
                const { open, close } = officeHours(iso);
                const gaps = ds.length ? coverageGaps(ds, open, close) : [];
                return (
                  <Link
                    key={iso}
                    href={`/manager/giorno/${iso}`}
                    className={`cell${isWeekend(iso) ? " we" : ""}${iso === today ? " today" : ""}`}
                  >
                    <div className="d">{parseDate(iso).getDate()}</div>
                    {ds.map((s) => {
                      const sec = secById.get(s.secretaryId);
                      return (
                        <span key={s.id} className={`chip ${sec?.color ?? ""}`}>
                          {sec?.name} {s.start}–{s.end}
                        </span>
                      );
                    })}
                    {gaps.length > 0 && <div className="gap">⚠ {gaps[0].start}–{gaps[0].end}</div>}
                  </Link>
                );
              })}
            </div>
          </Paper>

          {/* Sidebar stato mese */}
          <Box sx={{ width: 280 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h3" sx={{ mb: 2 }}>Stato mese</Typography>
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 800 }}>{built}</Typography>
                  <Typography variant="body2" color="text.secondary">giorni costruiti</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "error.main" }}>{withGaps}</Typography>
                  <Typography variant="body2" color="text.secondary">con buchi</Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ore lavorate nel mese</Typography>
              <Table size="small">
                <TableBody>
                  {secretaries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell sx={{ pl: 0 }}>{s.name}</TableCell>
                      <TableCell align="right" sx={{ pr: 0, fontWeight: 700 }}>
                        {formatHours(monthlyHours[s.id] ?? 0)} h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ButtonLink
                href={`/manager/riepilogo?mese=${monthKey}`}
                variant="outlined"
                fullWidth
                size="small"
                sx={{ mt: 2 }}
              >
                Riepilogo completo ▸
              </ButtonLink>
            </Paper>
          </Box>
        </Box>
      </Container>
    </>
  );
}
