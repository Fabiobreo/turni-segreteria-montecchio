import Link from "next/link";
import { ButtonLink } from "@/components/ButtonLink";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { referenceHours } from "@/lib/office";
import { hoursBySecretary } from "@/lib/coverage";
import { DayEditor } from "@/components/DayEditor";
import { dayLong, dayNum, monthName, monthKeyOf, addDays, mondayOf, weekDates, weekLabel } from "@/lib/time";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  await requireManager();
  const { date } = await params;
  const monthKey = monthKeyOf(date);
  const week = weekDates(mondayOf(date));

  const [secretaries, shifts, availabilities, monthShifts, weekShifts, impianti] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date }, orderBy: { start: "asc" } }),
    prisma.availability.findMany({ where: { date } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } } }),
    prisma.shift.findMany({ where: { date: { in: week } } }),
    prisma.impianto.findMany({ orderBy: { sort: "asc" } }),
  ]);

  const { open, close } = referenceHours(date, impianti);
  const monthlyHours = hoursBySecretary(monthShifts);
  const weeklyHours  = hoursBySecretary(weekShifts);
  const title = `${dayLong(date)} ${dayNum(date)} ${monthName(monthKey)} ${monthKey.slice(0, 4)}`;

  return (
    <>
      <ManagerTop />
      <Container maxWidth="lg" sx={{ py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
              Costruzione giorno · {open}–{close}
            </Typography>
            <Typography variant="h1" component="h1" sx={{ textTransform: "capitalize", fontSize: { xs: "1.35rem", sm: "1.75rem" } }}>{title}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <ButtonLink href={`/manager/giorno/${addDays(date, -1)}`} variant="outlined" size="small">‹</ButtonLink>
            <ButtonLink href={`/manager/giorno/${addDays(date, 1)}`}  variant="outlined" size="small">›</ButtonLink>
          </Box>
        </Box>

        <DayEditor
          date={date} open={open} close={close}
          weekLabel={weekLabel(mondayOf(date))}
          impianti={impianti}
          secretaries={secretaries.map((s) => ({ id: s.id, name: s.name, color: s.color, weeklyMax: s.weeklyMax }))}
          shifts={shifts.map((s) => ({ id: s.id, secretaryId: s.secretaryId, start: s.start, end: s.end, impianto: s.impianto }))}
          availabilities={availabilities.map((a) => ({ secretaryId: a.secretaryId, status: a.status, slots: a.slots, note: a.note }))}
          monthlyHours={monthlyHours}
          weeklyHours={weeklyHours}
        />
      </Container>
    </>
  );
}
