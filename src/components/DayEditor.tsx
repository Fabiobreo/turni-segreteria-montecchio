"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShift, deleteShift } from "@/app/manager/actions";
import { toMinutes, durationHours, formatHours } from "@/lib/time";
import { coverageGaps, maxConcurrent } from "@/lib/coverage";
import { DayGantt } from "./DayGantt";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

type Sec   = { id: string; name: string; color: string; weeklyMax: number };
type Shift = { id: string; secretaryId: string; start: string; end: string };
type Avail = { secretaryId: string; status: string; slots: string | null; note: string | null };
type RangeStatus = "si" | "no" | "non_indicata";

export function DayEditor({
  date, open, close, weekLabel, secretaries, shifts, availabilities, monthlyHours, weeklyHours,
}: {
  date: string; open: string; close: string; weekLabel: string;
  secretaries: Sec[]; shifts: Shift[]; availabilities: Avail[];
  monthlyHours: Record<string, number>; weeklyHours: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; secretaryId: string; start: string; end: string } | null>(null);

  const secById   = new Map(secretaries.map((s) => [s.id, s]));
  const availBySec = new Map(availabilities.map((a) => [a.secretaryId, a]));
  const gaps       = coverageGaps(shifts, open, close);
  const overCap    = maxConcurrent(shifts) > 2;

  function availForRange(secId: string, start: string, end: string): RangeStatus {
    const a = availBySec.get(secId);
    if (!a) return "non_indicata";
    if (a.status === "disponibile") return "si";
    if (a.status === "non_disponibile") return "no";
    if (a.status === "parziale" && a.slots) {
      const slots: { start: string; end: string }[] = JSON.parse(a.slots);
      const covers = slots.some((s) => toMinutes(s.start) <= toMinutes(start) && toMinutes(end) <= toMinutes(s.end));
      return covers ? "si" : "no";
    }
    return "non_indicata";
  }

  function startAdd(secretaryId = secretaries[0]?.id ?? "", start = open, end = "14:00") {
    setError(null); setForm({ id: null, secretaryId, start, end });
  }
  function startEdit(s: Shift) { setError(null); setForm({ id: s.id, secretaryId: s.secretaryId, start: s.start, end: s.end }); }

  function submit() {
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const res = await saveShift({ id: form.id ?? undefined, date, secretaryId: form.secretaryId, start: form.start, end: form.end });
      if (!res.ok) { setError(res.error ?? "Errore"); return; }
      setForm(null); router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => { await deleteShift(id); router.refresh(); });
  }
  // salvataggio diretto da drag sulla griglia (senza aprire il form)
  function saveDirect(id: string | null, secretaryId: string, start: string, end: string) {
    setError(null);
    startTransition(async () => {
      const res = await saveShift({ id: id ?? undefined, date, secretaryId, start, end });
      if (!res.ok) { setError(res.error ?? "Errore"); return; }
      router.refresh();
    });
  }

  const availWarn = form
    ? availForRange(form.secretaryId, form.start, form.end) === "no"
      ? "La segretaria selezionata NON è disponibile in questa fascia."
      : availForRange(form.secretaryId, form.start, form.end) === "non_indicata"
      ? "Disponibilità non indicata per questa segretaria in questo giorno."
      : null
    : null;

  return (
    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {/* COLONNA SINISTRA */}
      <Box sx={{ flex: 1, minWidth: 440 }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <Typography variant="h3" sx={{ flex: 1 }}>Copertura del giorno</Typography>
            {gaps.length === 0
              ? <Chip label="✓ Copertura completa" color="success" size="small" />
              : <Chip label={`⚠ ${gaps.length} fascia/e scoperta/e`} color="error" size="small" />}
            {overCap && <Chip label="⚠ più di 2 persone" color="error" size="small" />}
          </Box>

          {/* griglia per segretaria (crea/sposta/ridimensiona con il drag) */}
          <DayGantt
            open={open} close={close}
            secretaries={secretaries}
            shifts={shifts}
            availabilities={availabilities}
            gaps={gaps}
            onCreate={(secId, start, end) => saveDirect(null, secId, start, end)}
            onUpdate={(id, secId, start, end) => saveDirect(id, secId, start, end)}
            onSelect={(s) => startEdit(s)}
            onDelete={(id) => remove(id)}
          />

          {/* fasce scoperte con chi è disponibile */}
          {gaps.length > 0 && (
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              {gaps.map((g, i) => {
                const free    = secretaries.filter((s) => availForRange(s.id, g.start, g.end) === "si");
                const unknown = secretaries.filter((s) => availForRange(s.id, g.start, g.end) === "non_indicata");
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: "#fff5f5", borderColor: "#f3c6c1" }}>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      <Chip label={`▨ scoperto ${g.start}–${g.end}`} color="error" size="small" />
                      <Typography variant="caption" color="text.secondary">disponibili:</Typography>
                      {free.length === 0 && unknown.length === 0 && <Typography variant="caption">nessuna 😕</Typography>}
                      {free.map((s) => (
                        <Box key={s.id} component="button" onClick={() => startAdd(s.id, g.start, g.end)}
                          className={`chip ${s.color}`}
                          sx={{ display: "inline", cursor: "pointer", border: 0, fontFamily: "inherit" }}>
                          + {s.name}
                        </Box>
                      ))}
                      {unknown.map((s) => (
                        <Chip key={s.id} label={`${s.name}?`} size="small" onClick={() => startAdd(s.id, g.start, g.end)}
                          sx={{ cursor: "pointer" }} />
                      ))}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
            <Typography variant="h3" sx={{ flex: 1 }}>Turni assegnati</Typography>
            <Button size="small" variant="contained" onClick={() => startAdd()} disabled={pending}>+ Aggiungi turno</Button>
          </Box>

          {shifts.length === 0 && !form && (
            <Typography variant="body2" color="text.secondary">Nessun turno. Aggiungine uno per coprire la giornata.</Typography>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {shifts.map((s) => {
              const sec = secById.get(s.secretaryId);
              if (form?.id === s.id) return <Box key={s.id}>{ShiftForm()}</Box>;
              return (
                <Paper key={s.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <span className={`chip ${sec?.color ?? ""}`} style={{ display: "inline" }}>{sec?.name}</span>
                    <Typography sx={{ fontWeight: 700 }}>{s.start}–{s.end}</Typography>
                    <Chip label={`${formatHours(durationHours(s.start, s.end))} h`} size="small" color="info" />
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="outlined" onClick={() => startEdit(s)} disabled={pending}>Modifica</Button>
                    <Button size="small" variant="text" color="error" onClick={() => remove(s.id)} disabled={pending}>Rimuovi</Button>
                  </Box>
                </Paper>
              );
            })}
            {form && form.id === null && ShiftForm()}
          </Box>

          <Alert severity="info" sx={{ mt: 2, fontSize: "0.8rem" }}>
            Il raddoppio lo decidi tu: aggiungi un turno sovrapposto nelle fasce da rinforzare.
          </Alert>
        </Paper>
      </Box>

      {/* COLONNA DESTRA */}
      <Box sx={{ width: 380, display: "flex", flexDirection: "column", gap: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h3" sx={{ mb: 0.5 }}>Ore allocate</Typography>
          <Typography variant="caption" color="text.secondary">Settimana: {weekLabel}</Typography>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Segretaria</TableCell>
                <TableCell align="center">Settimana</TableCell>
                <TableCell align="right">Mese</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secretaries.map((s) => {
                const w = weeklyHours[s.id] ?? 0;
                const m = monthlyHours[s.id] ?? 0;
                const wMax = s.weeklyMax || 0;
                const color = wMax > 0 && w > wMax ? "error" : wMax > 0 && w >= wMax ? "warning" : "success";
                return (
                  <TableRow key={s.id}>
                    <TableCell><span className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span></TableCell>
                    <TableCell align="center">
                      <Chip label={`${formatHours(w)}${wMax ? ` / ${wMax}` : ""}`} size="small" color={color} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">{formatHours(m)} h</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Verde: sotto tetto · Giallo: al tetto · Rosso: oltre.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>Disponibilità del giorno</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Segretaria</TableCell>
                <TableCell align="right">Disp.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secretaries.map((s) => {
                const a = availBySec.get(s.id);
                let chip = <Chip label="—" size="small" />;
                let detail = "non indicata";
                if (a?.status === "disponibile") { chip = <Chip label="Sì" size="small" color="success" />; detail = "tutto il giorno"; }
                else if (a?.status === "parziale") {
                  chip = <Chip label="Parz." size="small" color="warning" />;
                  const slots: { start: string; end: string }[] = a.slots ? JSON.parse(a.slots) : [];
                  detail = slots.map((s) => `${s.start}–${s.end}`).join(", ") || "orari non specificati";
                }
                else if (a?.status === "non_disponibile") { chip = <Chip label="No" size="small" color="error" />; detail = "non disponibile"; }
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.name}
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {detail}{a?.note ? ` · "${a.note}"` : ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{chip}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );

  function ShiftForm() {
    if (!form) return null;
    return (
      <Paper variant="outlined" sx={{ p: 1.5, borderStyle: "dashed" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, width: 70 }}>{form.id ? "Modifica" : "Nuovo"}</Typography>
          <TextField select size="small" value={form.secretaryId} onChange={(e) => setForm({ ...form, secretaryId: e.target.value })} sx={{ minWidth: 120 }}>
            {secretaries.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} sx={{ width: 110 }} />
          <Typography>–</Typography>
          <TextField size="small" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} sx={{ width: 110 }} />
          <Chip label={`${formatHours(Math.max(0, durationHours(form.start, form.end)))} h`} size="small" color="info" />
          <Button size="small" variant="contained" onClick={submit} disabled={pending}>{pending ? "Salvo…" : "Salva"}</Button>
          <Button size="small" variant="text" onClick={() => { setForm(null); setError(null); }} disabled={pending}>Annulla</Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">Preset:</Typography>
          <Button size="small" variant="outlined" onClick={() => setForm({ ...form, start: open, end: "14:00" })}>Mattina {open}–14:00</Button>
          <Button size="small" variant="outlined" onClick={() => setForm({ ...form, start: "14:00", end: close })}>Pomeriggio 14:00–{close}</Button>
          <Button size="small" variant="outlined" onClick={() => setForm({ ...form, start: open, end: close })}>Tutto {open}–{close}</Button>
        </Box>

        <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: "#fafbfc" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
            Disponibili per <strong>{form.start}–{form.end}</strong> (tocca per assegnare):
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {secretaries.map((s) => {
              const st = availForRange(s.id, form.start, form.end);
              const selected = s.id === form.secretaryId;
              const color = st === "si" ? "success" : st === "no" ? "error" : "default";
              const icon  = st === "si" ? "✓" : st === "no" ? "✕" : "?";
              return (
                <Chip key={s.id} label={`${icon} ${s.name}`} size="small" color={color}
                  onClick={() => setForm({ ...form, secretaryId: s.id })}
                  variant={selected ? "filled" : "outlined"}
                  sx={{ cursor: "pointer" }} />
              );
            })}
          </Box>
        </Paper>

        {availWarn && <Alert severity="warning" sx={{ mt: 1, fontSize: "0.8rem" }}>{availWarn}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 1, fontSize: "0.8rem" }}>{error}</Alert>}
      </Paper>
    );
  }
}
