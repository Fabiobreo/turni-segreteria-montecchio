import Link from "next/link";
import { ButtonLink } from "@/components/ButtonLink";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { WeekPoster } from "@/components/WeekPoster";
import { officeHours, referenceHours } from "@/lib/office";
import { coverageGaps, assignLanes, hoursBySecretary } from "@/lib/coverage";
import { topPx, heightPx, hourLabels, GRID_HEIGHT } from "@/lib/grid";
import {
  mondayOf, weekDates, weekLabel, addDays, toISODate, dayShort, dayNum,
  isWeekend, monthKeyOf, formatHours, durationHours,
} from "@/lib/time";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  await requireManager();
  const { start } = await searchParams;
  const monday = mondayOf(start ?? toISODate(new Date()));
  const days = weekDates(monday);
  const monthKey = monthKeyOf(monday);

  const [secretaries, weekShifts, weekAvail, monthShifts, recent, impianti] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date: { in: days } } }),
    prisma.availability.findMany({ where: { date: { in: days } } }), // eslint-disable-line @typescript-eslint/no-unused-vars
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } } }),
    prisma.availability.count({
      where: { updatedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.impianto.findMany({ orderBy: { sort: "asc" } }),
  ]);

  const secById = new Map(secretaries.map((s) => [s.id, s]));
  const monthlyHours = hoursBySecretary(monthShifts);
  const weeklyHours  = hoursBySecretary(weekShifts);

  const posterDayHeaders = days.map((iso) => ({ num: dayNum(iso), name: dayShort(iso), weekend: isWeekend(iso) }));
  const posterSecretaries = secretaries.map((s) => ({
    id: s.id, name: s.name, color: s.color,
    weekHours: formatHours(weeklyHours[s.id] ?? 0),
    days: days.map((iso) =>
      weekShifts.filter((sh) => sh.date === iso && sh.secretaryId === s.id)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((sh) => ({ start: sh.start, end: sh.end }))
    ),
  }));
  const posterHasGaps = days.some((iso) => {
    const dayShifts = weekShifts.filter((sh) => sh.date === iso);
    return impianti.some((imp) => {
      const { open, close } = officeHours(iso, imp);
      const impShifts = dayShifts.filter((s) => s.impianto === imp.id);
      return impShifts.length === 0 || coverageGaps(impShifts, open, close).length > 0;
    });
  });

  return (
    <>
      <ManagerTop
        active="settimana"
        right={recent > 0 ? (
          <Chip label={`🔔 ${recent} disponibilità aggiornate`} size="small" color="warning" />
        ) : null}
      />
      <Container maxWidth="lg" sx={{ py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Costruzione turni · vista a fasce</Typography>
            <Typography variant="h1" component="h1">{weekLabel(monday)}</Typography>
          </Box>
          <ButtonLink href={`/manager?start=${addDays(monday, -7)}`} variant="outlined" size="small">‹ Settimana prec.</ButtonLink>
          <ButtonLink href="/manager" variant="outlined" size="small">Oggi</ButtonLink>
          <ButtonLink href={`/manager?start=${addDays(monday, 7)}`}  variant="outlined" size="small">Settimana succ. ›</ButtonLink>
        </Box>

        {/* Griglia a fasce */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: "flex", mb: 1.5, flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">Legenda:</Typography>
            {secretaries.map((s) => (
              <span key={s.id} className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span>
            ))}
            <Box sx={{ flex: 1 }} />
            <Chip label="▨ fascia scoperta" color="error" size="small" variant="outlined" />
            <Chip label="colonne affiancate = raddoppio" color="info" size="small" variant="outlined" />
          </Box>
          <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div className="weekgrid">
            <div className="hcell" />
            {days.map((iso) => (
              <Link key={iso} className={`dayhead${isWeekend(iso) ? " we" : ""}`} href={`/manager/giorno/${iso}`}>
                <b>{dayNum(iso)}</b>
                <span>{dayShort(iso)}</span>
              </Link>
            ))}
            <div className="timecol">
              {hourLabels().map((h) => (
                <div key={h.label} className="tlabel" style={{ top: h.top }}>{h.label}</div>
              ))}
            </div>
            {days.map((iso) => {
              const { open: refOpen, close: refClose } = referenceHours(iso, impianti);
              const dayShifts = weekShifts.filter((s) => s.date === iso);
              // Gap visivi: unione tra tutti gli impianti
              const gapsAll = impianti.flatMap((imp) => {
                const { open, close } = officeHours(iso, imp);
                const impShifts = dayShifts.filter((s) => s.impianto === imp.id);
                return coverageGaps(impShifts, open, close).map((g) => ({ ...g, nome: imp.nome }));
              });
              const hasGap = gapsAll.length > 0;
              const { items, lanes } = assignLanes(dayShifts);
              return (
                <Link key={iso} href={`/manager/giorno/${iso}`}
                  className={`daybody${hasGap ? " gap-day" : ""}`}
                  style={{ display: "block" }}>
                  {topPx(refOpen) > 0 && <div className="closed" style={{ top: 0, height: topPx(refOpen) }} />}
                  {topPx(refClose) < GRID_HEIGHT && <div className="closed" style={{ top: topPx(refClose), height: GRID_HEIGHT - topPx(refClose) }} />}
                  {gapsAll.map((g, i) => (
                    <div key={i} className="wgap" style={{ top: topPx(g.start), height: heightPx(g.start, g.end) }}>
                      ▨ {g.nome}<br />{g.start}–{g.end}
                    </div>
                  ))}
                  {items.map(({ shift, lane }) => {
                    const sec = secById.get(shift.secretaryId);
                    const widthPct = 100 / lanes;
                    return (
                      <div key={shift.id} className={`wblock ${sec?.color ?? ""}`}
                        style={{ top: topPx(shift.start), height: heightPx(shift.start, shift.end),
                          left: `calc(${lane * widthPct}% + 3px)`, width: `calc(${widthPct}% - 6px)`, right: "auto" }}>
                        {sec?.name}<small>{shift.start}–{shift.end}</small>
                      </div>
                    );
                  })}
                </Link>
              );
            })}
          </div>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            💡 Tocca un giorno per aggiungere o modificare i turni. Le zone grigie sono fuori orario d&apos;ufficio.
          </Typography>
        </Paper>

        {/* Ore + avvisi */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Paper sx={{ p: 2, flex: 1, minWidth: 380 }}>
            <Typography variant="h3" sx={{ mb: 1.5 }}>Ore allocate (live)</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Segretaria</TableCell>
                  <TableCell align="center">Settimana</TableCell>
                  <TableCell align="right">Mese</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {secretaries.map((s) => {
                  const w = weeklyHours[s.id] ?? 0;
                  const m = monthlyHours[s.id] ?? 0;
                  const wMax = s.weeklyMax || 0;
                  const color = wMax > 0 && w > wMax ? "error" : wMax > 0 && w >= wMax ? "warning" : "success";
                  const lbl   = wMax > 0 && w > wMax ? "oltre" : wMax > 0 && w >= wMax ? "al tetto" : "ok";
                  return (
                    <TableRow key={s.id}>
                      <TableCell><span className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span></TableCell>
                      <TableCell align="center">
                        <Chip label={`${formatHours(w)}${wMax ? ` / ${wMax}` : ""}`} size="small" color={color} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">{formatHours(m)} h</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{lbl}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2, width: 320 }}>
            <Typography variant="h3" sx={{ mb: 1.5 }}>Avvisi settimana</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {days.flatMap((iso) => {
                const dayShifts = weekShifts.filter((s) => s.date === iso);
                return impianti.flatMap((imp) => {
                  const { open, close } = officeHours(iso, imp);
                  const impShifts = dayShifts.filter((s) => s.impianto === imp.id);
                  const gaps = coverageGaps(impShifts, open, close);
                  if (impShifts.length === 0) return [
                    <Chip key={`${iso}-${imp.id}-empty`}
                      label={`⚠ ${dayShort(iso)} ${dayNum(iso)} · ${imp.nome}: nessun turno`}
                      color="error" size="small" sx={{ alignSelf: "flex-start" }} />,
                  ];
                  if (gaps.length > 0) return [
                    <Chip key={`${iso}-${imp.id}-gap`}
                      label={`⚠ ${dayShort(iso)} ${dayNum(iso)} · ${imp.nome}: scoperto ${gaps[0].start}–${gaps[0].end}`}
                      color="error" size="small" sx={{ alignSelf: "flex-start" }} />,
                  ];
                  return [];
                });
              })}
              {days.every((iso) => {
                const dayShifts = weekShifts.filter((s) => s.date === iso);
                return impianti.every((imp) => {
                  const { open, close } = officeHours(iso, imp);
                  const impShifts = dayShifts.filter((s) => s.impianto === imp.id);
                  return impShifts.length > 0 && coverageGaps(impShifts, open, close).length === 0;
                });
              }) && <Chip label="✓ Tutti i giorni coperti" color="success" size="small" sx={{ alignSelf: "flex-start" }} />}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              Totale turni settimana: {formatHours(weekShifts.reduce((a, s) => a + durationHours(s.start, s.end), 0))} h
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ mt: 2 }}>
          <WeekPoster weekLabel={weekLabel(monday)} dayHeaders={posterDayHeaders} secretaries={posterSecretaries} hasGaps={posterHasGaps} />
        </Box>
      </Container>
    </>
  );
}
