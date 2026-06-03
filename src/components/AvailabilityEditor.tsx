"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAvailability, setManyAvailability, clearMonth, copyWeekAvailability } from "@/app/d/actions";
import { dayShort, dayNum, isWeekend, addMonthsKey, mondayOf, weekLabel, addDays, toISODate } from "@/lib/time";
import { COLORS } from "@/lib/colors";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export type Slot  = { start: string; end: string };
type Status = "disponibile" | "parziale" | "non_disponibile" | "none";
type Entry  = { status: string; slots: Slot[]; note: string | null };
type Day    = { iso: string; open: string; close: string };

export function AvailabilityEditor({
  token, name, secColor, monthKey, monthLabel, days, initial,
}: {
  token: string;
  name: string;
  secColor: string;
  monthKey: string;
  monthLabel: string;
  days: Day[];
  initial: Record<string, Entry>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Record<string, Entry>>(initial);

  // Raggruppa i giorni del mese per settimana (lunedì → domenica).
  const weeks: { monday: string; days: Day[] }[] = [];
  for (const day of days) {
    const monday = mondayOf(day.iso);
    const last = weeks[weeks.length - 1];
    if (last && last.monday === monday) last.days.push(day);
    else weeks.push({ monday, days: [day] });
  }

  // Tab attivo: di default la settimana che contiene oggi (se nel mese), altrimenti la prima.
  const [tab, setTab] = useState(() => {
    const todayIso = toISODate(new Date());
    const i = weeks.findIndex((w) => w.days.some((d) => d.iso === todayIso));
    return i >= 0 ? i : 0;
  });
  const week = weeks[tab] ?? weeks[0];

  const statusOf = (iso: string): Status => (data[iso]?.status as Status) ?? "none";

  function setLocal(iso: string, e: Entry | undefined) {
    setData((prev) => {
      const next = { ...prev };
      if (e) next[iso] = e; else delete next[iso];
      return next;
    });
  }

  // Sceglie uno stato per un giorno; se parziale, inizializza con una fascia di default
  function chooseStatus(day: Day, status: "disponibile" | "parziale" | "non_disponibile") {
    const prev = data[day.iso];
    const entry: Entry =
      status === "parziale"
        ? { status, slots: prev?.slots?.length ? prev.slots : [{ start: day.open, end: day.close }], note: prev?.note ?? null }
        : { status, slots: [], note: prev?.note ?? null };
    setLocal(day.iso, entry);
    startTransition(async () => {
      await setAvailability({ token, date: day.iso, status, slots: status === "parziale" ? JSON.stringify(entry.slots) : null, note: entry.note });
    });
  }

  // Aggiorna una fascia (onChange → aggiorna stato locale; onBlur → salva)
  function changeSlotField(iso: string, idx: number, field: "start" | "end", val: string) {
    const entry = data[iso];
    if (!entry) return;
    const slots = entry.slots.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    setLocal(iso, { ...entry, slots });
  }

  function persistSlots(iso: string) {
    // Legge data dalla closure — sicuro perché onBlur è un evento separato
    // da onChange, quindi React ha già committato l'aggiornamento di stato.
    const entry = data[iso];
    if (!entry) return;
    startTransition(async () => {
      await setAvailability({ token, date: iso, status: "parziale", slots: JSON.stringify(entry.slots), note: entry.note });
    });
  }

  function addSlot(iso: string, day: Day) {
    const entry = data[iso];
    if (!entry) return;
    const last = entry.slots[entry.slots.length - 1];
    const newSlot: Slot = last ? { start: last.end, end: day.close } : { start: day.open, end: day.close };
    const slots = [...entry.slots, newSlot];
    setLocal(iso, { ...entry, slots });
    startTransition(async () => {
      await setAvailability({ token, date: iso, status: "parziale", slots: JSON.stringify(slots), note: entry.note });
    });
  }

  function removeSlot(iso: string, idx: number) {
    const entry = data[iso];
    if (!entry || entry.slots.length <= 1) return;
    const slots = entry.slots.filter((_, i) => i !== idx);
    setLocal(iso, { ...entry, slots });
    startTransition(async () => {
      await setAvailability({ token, date: iso, status: "parziale", slots: JSON.stringify(slots), note: entry.note });
    });
  }

  function saveNote(iso: string, note: string | null) {
    const entry = data[iso];
    if (!entry) return;
    setLocal(iso, { ...entry, note });
    startTransition(async () => {
      await setAvailability({ token, date: iso, status: "parziale", slots: JSON.stringify(entry.slots), note });
    });
  }

  function bulk(filter: (iso: string) => boolean, status: "disponibile" | "non_disponibile") {
    const dates = days.map((d) => d.iso).filter(filter);
    setData((prev) => {
      const next = { ...prev };
      for (const iso of dates) next[iso] = { status, slots: [], note: next[iso]?.note ?? null };
      return next;
    });
    startTransition(async () => {
      await setManyAvailability({ token, dates, status });
      router.refresh();
    });
  }

  function azzera() {
    const dates = days.map((d) => d.iso);
    setData({});
    startTransition(async () => {
      await clearMonth({ token, dates });
      router.refresh();
    });
  }

  /**
   * Copia la disponibilità dalla settimana di calendario precedente su quella corrente.
   * Lato server: la sorgente può essere nel mese prima (1ª settimana) e la destinazione
   * può sforare nel mese dopo (ultima settimana).
   */
  function copyFromPrevious() {
    if (!week) return;
    const fromMonday = addDays(week.monday, -7);
    startTransition(async () => {
      const res = await copyWeekAvailability({ token, fromMonday, toMonday: week.monday, monthKey });
      if (res.ok) {
        const applied = res.result ?? [];
        const removed = res.cleared ?? [];
        setData((prev) => {
          const next = { ...prev };
          for (const r of applied) next[r.date] = { status: r.status, slots: r.slots, note: r.note };
          for (const iso of removed) delete next[iso];
          return next;
        });
      }
    });
  }

  const set = days.filter((d) => statusOf(d.iso) !== "none").length;
  const progress = days.length > 0 ? (set / days.length) * 100 : 0;
  const colorHex = COLORS.find((c) => c.key === secColor)?.hex ?? "#2f6df6";

  return (
    <Box sx={{ maxWidth: 460, mx: "auto", minHeight: "100vh", bgcolor: "background.default" }}>

      {/* ── HEADER STICKY ── */}
      <Box sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Chip label={name} size="small" sx={{ bgcolor: colorHex, color: "#fff", fontWeight: 700 }} />
                <Typography variant="caption" color="text.secondary">👋 Ciao!</Typography>
              </Box>
              <Typography variant="h2" sx={{ textTransform: "capitalize" }}>{monthLabel}</Typography>
            </Box>
            <IconButton component={Link} href={`/d/${token}?mese=${addMonthsKey(monthKey, -1)}`} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton component={Link} href={`/d/${token}?mese=${addMonthsKey(monthKey, 1)}`} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* ── CORPO ── */}
      <Box sx={{ px: 2, pt: 2, pb: 12 }}>

        {/* Azioni rapide */}
        <Paper sx={{ p: 1.5, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Azioni rapide
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button size="small" variant="outlined" disabled={pending} onClick={() => bulk(() => true, "disponibile")}>
              Tutti disponibili
            </Button>
            <Button size="small" variant="outlined" disabled={pending} onClick={() => bulk((iso) => !isWeekend(iso), "disponibile")}>
              Lun–Ven disp.
            </Button>
            <Button size="small" variant="outlined" disabled={pending} onClick={() => bulk((iso) => isWeekend(iso), "non_disponibile")}>
              Weekend non disp.
            </Button>
            <Button size="small" variant="text" color="error" disabled={pending} onClick={azzera}>Azzera</Button>
          </Box>
        </Paper>

        {/* Barra progresso */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {set} di {days.length} giorni compilati
            </Typography>
            {set === days.length
              ? <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>✓ Mese completo!</Typography>
              : <Typography variant="caption" color="text.secondary">{days.length - set} mancanti</Typography>
            }
          </Box>
          <LinearProgress variant="determinate" value={progress}
            color={set === days.length ? "success" : "primary"}
            sx={{ borderRadius: 1, height: 6 }} />
        </Box>

        {/* Tab settimane */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 1, minHeight: 40, "& .MuiTab-root": { minHeight: 40, minWidth: 64, py: 0.5 } }}
        >
          {weeks.map((w, i) => {
            const compilati = w.days.filter((d) => statusOf(d.iso) !== "none").length;
            const completa = compilati === w.days.length;
            return (
              <Tab
                key={w.monday}
                label={`${dayNum(w.days[0].iso)}–${dayNum(w.days[w.days.length - 1].iso)}${completa ? " ✓" : ""}`}
                sx={{ fontWeight: i === tab ? 700 : 500, color: completa ? "success.main" : undefined }}
              />
            );
          })}
        </Tabs>

        {/* Header settimana + copia dalla precedente */}
        {week && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textTransform: "capitalize" }}>
              {weekLabel(week.monday)}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
              disabled={pending}
              onClick={copyFromPrevious}
              title="Copia la settimana di calendario precedente (anche dal mese prima)"
            >
              Copia dalla precedente
            </Button>
          </Box>
        )}

        {/* Lista giorni della settimana selezionata */}
        <Stack spacing={0.75}>
          {(week?.days ?? []).map((day) => {
            const st    = statusOf(day.iso);
            const entry = data[day.iso];
            const we    = isWeekend(day.iso);
            const leftClr =
              st === "disponibile"     ? "#138a4a" :
              st === "non_disponibile" ? "#c0392b" :
              st === "parziale"        ? "#b7791f" : "#e5e7eb";

            return (
              <Box key={day.iso} sx={{
                bgcolor: "background.paper",
                border: "1px solid #e5e7eb",
                borderLeftWidth: 4,
                borderLeftColor: leftClr,
                borderRadius: "0 12px 12px 0",
                overflow: "hidden",
                transition: "border-left-color .2s",
              }}>
                {/* Riga data + toggle */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1.25 }}>
                  <Box sx={{ width: 42, textAlign: "center", flexShrink: 0 }}>
                    <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1, color: we ? "primary.main" : "text.primary" }}>
                      {dayNum(day.iso)}
                    </Typography>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: we ? 700 : 400, color: we ? "primary.main" : "text.secondary" }}>
                      {dayShort(day.iso)}
                    </Typography>
                  </Box>

                  <ToggleButtonGroup
                    value={st === "none" ? null : st}
                    exclusive
                    size="small"
                    onChange={(_, v) => { if (v) chooseStatus(day, v); }}
                    sx={{ flex: 1, "& .MuiToggleButton-root": { flex: 1, py: 0.5, fontSize: "0.8rem", fontWeight: 600 } }}
                  >
                    <ToggleButton value="disponibile"     color="success">Sì</ToggleButton>
                    <ToggleButton value="parziale"        color="warning">Parz.</ToggleButton>
                    <ToggleButton value="non_disponibile" color="error">No</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Espansione parziale — fasce orarie multiple */}
                <Collapse in={st === "parziale"}>
                  <Divider />
                  <Box sx={{ px: 1.5, pb: 1.25, pt: 1 }}>

                    {/* Lista fasce */}
                    <Stack spacing={0.75}>
                      {(entry?.slots ?? []).map((slot, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <TextField
                            type="time" size="small"
                            value={slot.start}
                            onChange={(e) => changeSlotField(day.iso, idx, "start", e.target.value)}
                            onBlur={() => persistSlots(day.iso)}
                            sx={{ width: 110 }}
                          />
                          <Typography variant="caption" color="text.secondary">–</Typography>
                          <TextField
                            type="time" size="small"
                            value={slot.end}
                            onChange={(e) => changeSlotField(day.iso, idx, "end", e.target.value)}
                            onBlur={() => persistSlots(day.iso)}
                            sx={{ width: 110 }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeSlot(day.iso, idx)}
                            disabled={entry?.slots?.length === 1}
                            sx={{ color: "text.secondary", ml: "auto" }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>

                    {/* Aggiungi fascia */}
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<AddIcon />}
                      onClick={() => addSlot(day.iso, day)}
                      sx={{ mt: 0.75, fontSize: "0.8rem" }}
                    >
                      Aggiungi fascia
                    </Button>

                    {/* Nota */}
                    <TextField
                      placeholder="📝 Nota facoltativa"
                      size="small"
                      fullWidth
                      defaultValue={entry?.note ?? ""}
                      onBlur={(e) => saveNote(day.iso, e.target.value || null)}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>

        {/* Stato salvataggio */}
        <Box sx={{ mt: 2, textAlign: "center", py: 1.5 }}>
          {pending
            ? <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">Salvataggio…</Typography>
              </Box>
            : <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                ✓ Salvato automaticamente
              </Typography>
          }
        </Box>
      </Box>

      {/* ── TAB BAR ── */}
      <BottomNavigation value={0} sx={{
        position: "fixed", bottom: 0,
        left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 460,
        borderTop: "1px solid #e5e7eb",
        bgcolor: "background.paper",
        zIndex: 10,
      }}>
        <BottomNavigationAction showLabel label="Disponibilità" icon={<CalendarMonthIcon />} />
        <BottomNavigationAction showLabel label="I miei turni" icon={<EventNoteIcon />}
          component={Link} href={`/d/${token}/turni`} />
      </BottomNavigation>
    </Box>
  );
}
