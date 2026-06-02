import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey,
  dayShort, dayNum, durationHours, formatHours,
} from "@/lib/time";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { COLORS } from "@/lib/colors";

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

  const [myShifts, allShifts, others, impianti] = await Promise.all([
    prisma.shift.findMany({ where: { secretaryId: sec.id, date: { in: dates } }, orderBy: [{ date: "asc" }, { start: "asc" }] }),
    prisma.shift.findMany({ where: { date: { in: dates } } }),
    prisma.secretary.findMany(),
    prisma.impianto.findMany({ orderBy: { sort: "asc" } }),
  ]);
  const nomeImpianto = new Map(impianti.map((i) => [i.id, i.nome]));

  const nameById = new Map(others.map((o) => [o.id, o.name]));
  const total = myShifts.reduce((a, s) => a + durationHours(s.start, s.end), 0);
  const colorHex = COLORS.find((c) => c.key === sec.color)?.hex ?? "#2f6df6";

  return (
    <Box sx={{ maxWidth: 460, mx: "auto", minHeight: "100vh", bgcolor: "background.default" }}>

      {/* HEADER */}
      <Box sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Chip label={sec.name} size="small" sx={{ bgcolor: colorHex, color: "#fff", fontWeight: 700 }} />
              </Box>
              <Typography variant="h2" sx={{ textTransform: "capitalize" }}>
                I miei turni · {monthName(monthKey)} {monthKey.slice(0, 4)}
              </Typography>
            </Box>
            <IconButton component="a" href={`/d/${token}/turni?mese=${addMonthsKey(monthKey, -1)}`} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton component="a" href={`/d/${token}/turni?mese=${addMonthsKey(monthKey, 1)}`} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={`Ore questo mese: ${formatHours(total)} h`}
              color="info"
              size="small"
            />
          </Box>
        </Box>
      </Box>

      {/* CORPO */}
      <Box sx={{ px: 2, pt: 2, pb: 12 }}>
        {myShifts.length === 0 ? (
          <Alert severity="info">Nessun turno assegnato per questo mese.</Alert>
        ) : (
          <Stack spacing={1.25}>
            {myShifts.map((s) => {
              const colleagues = allShifts
                .filter((x) => x.date === s.date && x.secretaryId !== sec.id)
                .map((x) => `${nameById.get(x.secretaryId)} ${x.start}–${x.end}`);
              return (
                <Paper
                  key={s.id}
                  sx={{
                    p: 2,
                    borderLeft: "4px solid",
                    borderLeftColor: colorHex,
                    borderRadius: "0 12px 12px 0",
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <Box sx={{ width: 48, textAlign: "center", flexShrink: 0 }}>
                      <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>
                        {dayNum(s.date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>
                        {dayShort(s.date)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{s.start} – {s.end}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {nomeImpianto.get(s.impianto) ?? s.impianto}
                        {" · "}{formatHours(durationHours(s.start, s.end))} ore
                        {colleagues.length ? ` · con ${colleagues.join(", ")}` : " · da sola"}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${formatHours(durationHours(s.start, s.end))} h`}
                      size="small"
                      sx={{ bgcolor: colorHex + "22", color: colorHex, fontWeight: 700 }}
                    />
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2 }}>
          I turni li imposta la manager. Qui li vedi sempre aggiornati.
        </Typography>
      </Box>

      {/* TAB BAR */}
      <BottomNavigation
        value={1}
        sx={{
          position: "fixed", bottom: 0,
          left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 460,
          borderTop: "1px solid #e5e7eb",
          bgcolor: "background.paper",
          zIndex: 10,
        }}
      >
        <BottomNavigationAction
          showLabel
          label="Disponibilità"
          icon={<CalendarMonthIcon />}
          component="a"
          href={`/d/${token}`}
        />
        <BottomNavigationAction showLabel label="I miei turni" icon={<EventNoteIcon />} />
      </BottomNavigation>
    </Box>
  );
}
