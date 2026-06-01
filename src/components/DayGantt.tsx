"use client";

// Griglia "Gantt" del giorno: una riga per segretaria, ore in orizzontale.
// Lo sfondo di ogni riga mostra la disponibilità; i turni sono blocchi
// colorati che si creano trascinando sulla riga vuota, si spostano
// trascinando il corpo e si ridimensionano trascinando i bordi.

import { useEffect, useRef, useState } from "react";
import { toMinutes, toHHMM, durationHours, formatHours } from "@/lib/time";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

type Sec   = { id: string; name: string; color: string; weeklyMax: number };
type Shift = { id: string; secretaryId: string; start: string; end: string };
type Avail = { secretaryId: string; status: string; slots: string | null; note: string | null };
type Gap   = { start: string; end: string };

type Seg = { kind: "ok" | "no" | "unknown"; start: number; end: number };

type Drag =
  | { mode: "create"; secId: string; anchorMin: number; curMin: number }
  | { mode: "move"; id: string; secId: string; startMin: number; endMin: number; grabMin: number; moved: boolean }
  | { mode: "resize-l" | "resize-r"; id: string; secId: string; startMin: number; endMin: number; moved: boolean };

const SNAP = 15;     // minuti
const ROW_H = 46;    // altezza riga (px)
const GUTTER = 132;  // larghezza colonna nomi (px)

/** Segmenti di disponibilità che coprono [open, close] per una segretaria. */
function availSegments(a: Avail | undefined, oMin: number, cMin: number): Seg[] {
  if (!a || a.status === "non_indicata" || !a.status) return [{ kind: "unknown", start: oMin, end: cMin }];
  if (a.status === "disponibile") return [{ kind: "ok", start: oMin, end: cMin }];
  if (a.status === "non_disponibile") return [{ kind: "no", start: oMin, end: cMin }];
  // parziale: verde dentro gli slot, rosso fuori
  const slots: { start: string; end: string }[] = a.slots ? JSON.parse(a.slots) : [];
  const norm = slots
    .map((s) => [Math.max(oMin, toMinutes(s.start)), Math.min(cMin, toMinutes(s.end))] as [number, number])
    .filter(([s, e]) => e > s)
    .sort((x, y) => x[0] - y[0]);
  const segs: Seg[] = [];
  let cur = oMin;
  for (const [s, e] of norm) {
    if (s > cur) segs.push({ kind: "no", start: cur, end: s });
    segs.push({ kind: "ok", start: s, end: e });
    cur = Math.max(cur, e);
  }
  if (cur < cMin) segs.push({ kind: "no", start: cur, end: cMin });
  return segs;
}

const segBg: Record<Seg["kind"], string> = {
  ok: "#e9f7ef",
  no: "repeating-linear-gradient(45deg,#fde2e0,#fde2e0 6px,#fff6f5 6px,#fff6f5 12px)",
  unknown: "#f1f5f9",
};

export function DayGantt({
  open, close, secretaries, shifts, availabilities, gaps,
  onCreate, onUpdate, onSelect, onDelete,
}: {
  open: string; close: string;
  secretaries: Sec[]; shifts: Shift[]; availabilities: Avail[]; gaps: Gap[];
  onCreate: (secId: string, start: string, end: string) => void;
  onUpdate: (id: string, secId: string, start: string, end: string) => void;
  onSelect: (s: Shift) => void;
  onDelete: (id: string) => void;
}) {
  const oMin = toMinutes(open);
  const cMin = toMinutes(close);
  const span = cMin - oMin;
  const pct = (min: number) => ((min - oMin) / span) * 100;

  const availBySec = new Map(availabilities.map((a) => [a.secretaryId, a]));

  const [drag, setDrag] = useState<Drag | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; shift: Shift } | null>(null);
  const activeTrack = useRef<HTMLElement | null>(null);
  const rowsRef = useRef<HTMLDivElement | null>(null);

  const snap = (m: number) => Math.round(m / SNAP) * SNAP;
  const clamp = (m: number) => Math.min(cMin, Math.max(oMin, m));

  /** Segretaria della riga sotto il puntatore (per spostare un turno tra righe). */
  function secAt(clientY: number): string {
    const el = rowsRef.current;
    if (!el || secretaries.length === 0) return secretaries[0]?.id ?? "";
    const rect = el.getBoundingClientRect();
    const idx = Math.floor((clientY - rect.top) / ROW_H);
    return secretaries[Math.min(secretaries.length - 1, Math.max(0, idx))].id;
  }

  // turni per riga; il turno in fase di drag viene mostrato nella riga
  // (segretaria) corrente con gli orari aggiornati
  type Block = { shift: Shift; sMin: number; eMin: number; dragging: boolean };
  const displayBySec = new Map<string, Block[]>();
  for (const sec of secretaries) displayBySec.set(sec.id, []);
  for (const sh of shifts) {
    const dragging = !!drag && "id" in drag && drag.id === sh.id;
    const d = dragging ? (drag as Exclude<Drag, { mode: "create" }>) : null;
    const secId = d ? d.secId : sh.secretaryId;
    const sMin = d ? d.startMin : toMinutes(sh.start);
    const eMin = d ? d.endMin : toMinutes(sh.end);
    (displayBySec.get(secId) ?? displayBySec.get(sh.secretaryId))?.push({ shift: sh, sMin, eMin, dragging });
  }

  function minutesAt(clientX: number): number {
    const el = activeTrack.current;
    if (!el) return oMin;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return clamp(snap(oMin + ratio * span));
  }

  // listener globali durante il drag
  useEffect(() => {
    if (!drag) return;
    function onMove(e: PointerEvent) {
      const m = minutesAt(e.clientX);
      const secId = secAt(e.clientY);
      setDrag((d) => {
        if (!d) return d;
        if (d.mode === "create") return { ...d, curMin: m };
        if (d.mode === "move") {
          const dur = d.endMin - d.startMin;
          let s = clamp(m - (d.grabMin - d.startMin));
          s = Math.min(s, cMin - dur);
          s = Math.max(s, oMin);
          const moved = d.moved || Math.abs(s - d.startMin) >= SNAP || secId !== d.secId;
          return { ...d, secId, startMin: s, endMin: s + dur, moved };
        }
        if (d.mode === "resize-l") return { ...d, startMin: Math.min(m, d.endMin - SNAP), moved: true };
        return { ...d, endMin: Math.max(m, d.startMin + SNAP), moved: true }; // resize-r
      });
    }
    function onUp() {
      const d = drag;
      setDrag(null);
      activeTrack.current = null;
      if (!d) return;
      if (d.mode === "create") {
        const s = Math.min(d.anchorMin, d.curMin);
        const e = Math.max(d.anchorMin, d.curMin);
        if (e - s >= SNAP) onCreate(d.secId, toHHMM(s), toHHMM(e));
      } else if (!d.moved) {
        // click senza spostamento → apri il form di dettaglio
        const sh = shifts.find((x) => x.id === d.id);
        if (sh) onSelect(sh);
      } else {
        onUpdate(d.id, d.secId, toHHMM(d.startMin), toHHMM(d.endMin));
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  // linee orarie (ogni ora; etichetta ogni 2 ore)
  const firstHour = Math.ceil(oMin / 60) * 60;
  const hourLines: number[] = [];
  for (let h = firstHour; h <= cMin; h += 60) hourLines.push(h);

  return (
    <Box sx={{ userSelect: "none" }}>
      {/* intestazione scala oraria */}
      <Box sx={{ display: "flex", alignItems: "flex-end", mb: 0.5 }}>
        <Box sx={{ width: GUTTER, flexShrink: 0 }} />
        <Box sx={{ position: "relative", flex: 1, height: 16 }}>
          {hourLines.map((h) => (
            <Box key={h} sx={{ position: "absolute", left: `${pct(h)}%`, transform: "translateX(-50%)", fontSize: 10, color: "text.secondary" }}>
              {(h / 60) % 2 === 0 ? toHHMM(h) : "·"}
            </Box>
          ))}
        </Box>
      </Box>

      {/* righe per segretaria */}
      <Box ref={rowsRef} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        {secretaries.map((sec, idx) => {
          const segs = availSegments(availBySec.get(sec.id), oMin, cMin);
          const rowShifts = displayBySec.get(sec.id) ?? [];
          return (
            <Box key={sec.id} sx={{ display: "flex", alignItems: "stretch", borderTop: idx === 0 ? 0 : "1px solid", borderColor: "divider" }}>
              {/* nome */}
              <Box sx={{ width: GUTTER, flexShrink: 0, px: 1, py: 0.5, display: "flex", alignItems: "center", borderRight: "1px solid", borderColor: "divider", bgcolor: "#fafbfc" }}>
                <span className={`chip ${sec.color}`} style={{ display: "inline-block", maxWidth: "100%" }}>{sec.name}</span>
              </Box>

              {/* track */}
              <Box
                sx={{ position: "relative", flex: 1, height: ROW_H, cursor: "copy", touchAction: "none" }}
                onPointerDown={(e) => {
                  // solo click "vuoto" sulla riga → crea
                  if (e.button !== 0) return;
                  if ((e.target as HTMLElement).dataset.block) return; // gestito dal blocco
                  activeTrack.current = e.currentTarget;
                  const m = minutesAt(e.clientX);
                  setDrag({ mode: "create", secId: sec.id, anchorMin: m, curMin: m });
                }}
              >
                {/* sfondo disponibilità */}
                {segs.map((sg, i) => (
                  <Box key={i} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(sg.start)}%`, width: `${pct(sg.end) - pct(sg.start)}%`, background: segBg[sg.kind] }} />
                ))}
                {/* fasce scoperte (bande verticali) */}
                {gaps.map((g, i) => (
                  <Box key={`g${i}`} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(toMinutes(g.start))}%`, width: `${pct(toMinutes(g.end)) - pct(toMinutes(g.start))}%`, borderLeft: "1px dashed", borderRight: "1px dashed", borderColor: "#e57373", pointerEvents: "none" }} />
                ))}
                {/* linee orarie */}
                {hourLines.map((h) => (
                  <Box key={h} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(h)}%`, width: "1px", bgcolor: "rgba(0,0,0,0.06)", pointerEvents: "none" }} />
                ))}

                {/* blocco draft durante la creazione */}
                {drag?.mode === "create" && drag.secId === sec.id && (() => {
                  const s = Math.min(drag.anchorMin, drag.curMin);
                  const e = Math.max(drag.anchorMin, drag.curMin);
                  return (
                    <Box className={`block ${sec.color}`} style={{ position: "absolute", left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%`, top: 6, height: ROW_H - 12, bottom: "auto", opacity: 0.6 }}>
                      {toHHMM(s)}–{toHHMM(e)}
                    </Box>
                  );
                })()}

                {/* turni esistenti */}
                {rowShifts.map(({ shift: sh, sMin, eMin, dragging }) => {
                  const wide = pct(eMin) - pct(sMin) > 14;
                  return (
                    <Box
                      key={sh.id}
                      data-block="1"
                      className={`block ${sec.color}`}
                      style={{ position: "absolute", left: `${pct(sMin)}%`, width: `${pct(eMin) - pct(sMin)}%`, top: 6, height: ROW_H - 12, bottom: "auto", cursor: "grab", opacity: dragging ? 0.85 : 1, zIndex: dragging ? 2 : 1 }}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        activeTrack.current = e.currentTarget.parentElement as HTMLElement;
                        setDrag({ mode: "move", id: sh.id, secId: sh.secretaryId, startMin: toMinutes(sh.start), endMin: toMinutes(sh.end), grabMin: minutesAt(e.clientX), moved: false });
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenu({ x: e.clientX, y: e.clientY, shift: sh });
                      }}
                    >
                      {/* maniglia sinistra */}
                      <Box
                        data-block="1"
                        sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize" }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          activeTrack.current = (e.currentTarget.parentElement as HTMLElement).parentElement as HTMLElement;
                          setDrag({ mode: "resize-l", id: sh.id, secId: sec.id, startMin: toMinutes(sh.start), endMin: toMinutes(sh.end), moved: false });
                        }}
                      />
                      {wide ? `${sh.start}–${sh.end} · ${formatHours(durationHours(sh.start, sh.end))}h` : ""}
                      {/* maniglia destra */}
                      <Box
                        data-block="1"
                        sx={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize" }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          activeTrack.current = (e.currentTarget.parentElement as HTMLElement).parentElement as HTMLElement;
                          setDrag({ mode: "resize-r", id: sh.id, secId: sec.id, startMin: toMinutes(sh.start), endMin: toMinutes(sh.end), moved: false });
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* legenda */}
      <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap", fontSize: 11, color: "text.secondary", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Box sx={{ width: 14, height: 12, borderRadius: "3px", bgcolor: "#e9f7ef" }} /> disponibile</Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Box sx={{ width: 14, height: 12, borderRadius: "3px", background: segBg.no }} /> non disp.</Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Box sx={{ width: 14, height: 12, borderRadius: "3px", bgcolor: "#f1f5f9" }} /> non indicata</Box>
        <span>· Trascina su una riga per creare un turno · trascina i bordi per regolarlo · clicca un turno per i dettagli · tasto destro per eliminarlo.</span>
      </Box>

      {/* menu contestuale (tasto destro su un turno) */}
      <Menu
        open={menu !== null}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
      >
        <MenuItem onClick={() => { if (menu) onSelect(menu.shift); setMenu(null); }}>
          <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
          Modifica turno
        </MenuItem>
        <MenuItem onClick={() => { if (menu) onDelete(menu.shift.id); setMenu(null); }} sx={{ color: "error.main" }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          Elimina turno
        </MenuItem>
      </Menu>
    </Box>
  );
}
