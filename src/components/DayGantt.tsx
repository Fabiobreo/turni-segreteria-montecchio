"use client";

// Griglia "Gantt" del giorno. Una segretaria può avere DUE sotto-righe (una
// per impianto attivo): nome unico a sinistra, sopra un impianto e sotto
// l'altro. La sotto-riga determina l'impianto: trascinando su quella estiva
// crei un turno estivo, su quella invernale un turno invernale, e spostando
// un blocco fra le sotto-righe ne cambi l'impianto.
//
// Su ogni sotto-riga: lo sfondo mostra la disponibilità della segretaria, una
// fascia tratteggiata grigia indica quando QUELL'impianto è chiuso, e i colori
// dei blocchi cambiano con la stagione (estivo vivace, invernale più spento).

import { useEffect, useRef, useState } from "react";
import { toMinutes, toHHMM, formatHours } from "@/lib/time";
import { parseSlots } from "@/lib/validation";
import { officeHours, type ImpiantoConfig } from "@/lib/office";
import { colorHex, seasonColor } from "@/lib/colors";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

type Sec   = { id: string; name: string; color: string; weeklyMax: number };
type Shift = { id: string; secretaryId: string; start: string; end: string; impianto: string };
type Avail = { secretaryId: string; status: string; slots: string | null; note: string | null };
type Gap   = { start: string; end: string };

type Seg = { kind: "ok" | "no" | "unknown"; start: number; end: number };

type Drag =
  | { mode: "create"; secId: string; impId: string; anchorMin: number; curMin: number }
  | { mode: "move"; id: string; secId: string; impId: string; startMin: number; endMin: number;
      grabOffset: number; dur: number; origStartMin: number; origSecId: string; origImpId: string; moved: boolean }
  | { mode: "resize-l" | "resize-r"; id: string; secId: string; impId: string; startMin: number; endMin: number; moved: boolean };

const SNAP   = 15;   // minuti
const GUTTER = 132;  // larghezza colonna nomi (px)

/** Segmenti di disponibilità che coprono [open, close] per una segretaria. */
function availSegments(a: Avail | undefined, oMin: number, cMin: number): Seg[] {
  if (!a || a.status === "non_indicata" || !a.status) return [{ kind: "unknown", start: oMin, end: cMin }];
  if (a.status === "disponibile") return [{ kind: "ok", start: oMin, end: cMin }];
  if (a.status === "non_disponibile") return [{ kind: "no", start: oMin, end: cMin }];
  const slots = parseSlots(a.slots);
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
// Fascia "impianto chiuso": rosso pieno tratteggiato = zona vietata (non ci si
// può creare né spostare un turno sopra).
const CLOSED_BG = "repeating-linear-gradient(45deg,#ef9a9a,#ef9a9a 6px,#e57373 6px,#e57373 12px)";

export function DayGantt({
  open, close, date, secretaries, shifts, availabilities, gapsByImpianto, impianti,
  onCreate, onUpdate, onSelect, onDelete, onChangeImpianto,
}: {
  open: string; close: string; date: string;
  secretaries: Sec[]; shifts: Shift[]; availabilities: Avail[];
  gapsByImpianto: Record<string, Gap[]>;
  impianti: ImpiantoConfig[];
  onCreate: (secId: string, start: string, end: string, impianto: string) => void;
  onUpdate: (id: string, secId: string, start: string, end: string, impianto: string) => void;
  onSelect: (s: Shift) => void;
  onDelete: (id: string) => void;
  onChangeImpianto: (id: string, newImpianto: string) => void;
}) {
  const oMin = toMinutes(open);
  const cMin = toMinutes(close);
  const span = cMin - oMin;
  const pct  = (min: number) => ((min - oMin) / span) * 100;

  // Icona testuale per impianto — dalla config dell'impianto (badge e blocchi).
  const iconById = new Map(impianti.map((i) => [i.id, i.icona]));
  const impIcon = (id: string) => iconById.get(id) || id.slice(0, 1).toUpperCase();

  const availBySec = new Map(availabilities.map((a) => [a.secretaryId, a]));

  // Impianti che generano sotto-righe: gli attivi + quelli che hanno comunque
  // turni oggi (così un turno su impianto disattivato resta visibile).
  const impWithShifts = new Set(shifts.map((s) => s.impianto));
  const laneImpianti = impianti.filter((i) => i.attivo || impWithShifts.has(i.id));
  const split = laneImpianti.length >= 2;
  const LANE_H = split ? 38 : 46;

  // Orari aperto/chiuso per impianto in questo giorno
  const impHours = new Map(laneImpianti.map((imp) => {
    const { open: io, close: ic } = officeHours(date, imp);
    return [imp.id, { oMin: toMinutes(io), cMin: toMinutes(ic) }];
  }));

  // Sequenza piatta delle sotto-righe (per mappare la Y del puntatore → corsia)
  const lanes: { secId: string; impId: string }[] = [];
  for (const sec of secretaries) for (const imp of laneImpianti) lanes.push({ secId: sec.id, impId: imp.id });

  const [drag, setDrag] = useState<Drag | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; shift: Shift } | null>(null);

  const dragRectRef = useRef<DOMRect | null>(null);
  const rowsRef     = useRef<HTMLDivElement | null>(null);

  const snap  = (m: number) => Math.round(m / SNAP) * SNAP;
  const clamp = (m: number) => Math.min(cMin, Math.max(oMin, m));

  /** Minuto corrispondente alla X del puntatore, dal rect catturato al drag-start. */
  function minutesAt(clientX: number): number {
    const rect = dragRectRef.current;
    if (!rect || rect.width === 0) return oMin;
    return clamp(snap(oMin + ((clientX - rect.left) / rect.width) * span));
  }

  /** Estremi consentiti [lo, hi] di una corsia: l'orario di apertura dell'impianto. */
  function laneBounds(impId: string): { lo: number; hi: number } {
    const h = impHours.get(impId);
    return {
      lo: h ? Math.max(oMin, h.oMin) : oMin,
      hi: h ? Math.min(cMin, h.cMin) : cMin,
    };
  }

  /** Corsia (segretaria + impianto) sotto il puntatore. */
  function laneAt(clientY: number): { secId: string; impId: string } {
    const fallback = { secId: secretaries[0]?.id ?? "", impId: laneImpianti[0]?.id ?? "" };
    const el = rowsRef.current;
    if (!el || !lanes.length) return fallback;
    const rect = el.getBoundingClientRect();
    // Passo reale per corsia (include i bordi), così la corsia scelta è precisa.
    const pitch = rect.height / lanes.length;
    const idx   = Math.floor((clientY - rect.top) / pitch);
    return lanes[Math.min(lanes.length - 1, Math.max(0, idx))] ?? fallback;
  }

  type Block = { shift: Shift; sMin: number; eMin: number; dragging: boolean };
  const laneKey = (secId: string, impId: string) => `${secId}|${impId}`;
  const displayByLane = new Map<string, Block[]>();
  for (const lane of lanes) displayByLane.set(laneKey(lane.secId, lane.impId), []);
  for (const sh of shifts) {
    const dragging = !!drag && "id" in drag && drag.id === sh.id;
    const d = dragging ? (drag as Exclude<Drag, { mode: "create" }>) : null;
    const secId = d ? d.secId : sh.secretaryId;
    const impId = d ? d.impId : sh.impianto;
    const sMin  = d ? d.startMin : toMinutes(sh.start);
    const eMin  = d ? d.endMin   : toMinutes(sh.end);
    const bucket = displayByLane.get(laneKey(secId, impId)) ?? displayByLane.get(laneKey(sh.secretaryId, sh.impianto));
    bucket?.push({ shift: sh, sMin, eMin, dragging });
  }

  // listener globali durante il drag
  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      const m    = minutesAt(e.clientX);
      const lane = laneAt(e.clientY);
      setDrag((d) => {
        if (!d) return d;
        if (d.mode === "create") {
          const { lo, hi } = laneBounds(d.impId);
          return { ...d, curMin: Math.min(hi, Math.max(lo, m)) };
        }
        if (d.mode === "move") {
          // Resta dentro l'orario di apertura dell'impianto della corsia di arrivo.
          const { lo, hi } = laneBounds(lane.impId);
          const maxStart = Math.max(lo, hi - d.dur);
          const s = Math.min(maxStart, Math.max(lo, m - d.grabOffset));
          const moved = d.moved || s !== d.origStartMin || lane.secId !== d.origSecId || lane.impId !== d.origImpId;
          return { ...d, secId: lane.secId, impId: lane.impId, startMin: s, endMin: s + d.dur, moved };
        }
        if (d.mode === "resize-l") {
          const { lo } = laneBounds(d.impId);
          return { ...d, startMin: Math.max(lo, Math.min(m, d.endMin - SNAP)), moved: true };
        }
        const { hi } = laneBounds(d.impId); // resize-r
        return { ...d, endMin: Math.min(hi, Math.max(m, d.startMin + SNAP)), moved: true };
      });
    }

    function onUp() {
      const d = drag;
      dragRectRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.mode === "create") {
        const s = Math.min(d.anchorMin, d.curMin);
        const e = Math.max(d.anchorMin, d.curMin);
        if (e - s >= SNAP) onCreate(d.secId, toHHMM(s), toHHMM(e), d.impId);
      } else if (!d.moved) {
        const sh = shifts.find((x) => x.id === d.id);
        if (sh) onSelect(sh);
      } else {
        onUpdate(d.id, d.secId, toHHMM(d.startMin), toHHMM(d.endMin), d.impId);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  const firstHour = Math.ceil(oMin / 60) * 60;
  const hourLines: number[] = [];
  for (let h = firstHour; h <= cMin; h += 60) hourLines.push(h);

  /** Una sotto-riga (track) per la corsia segretaria×impianto. */
  function laneTrack(sec: Sec, impId: string, segs: Seg[]) {
    const hours = impHours.get(impId) ?? { oMin, cMin };
    const gaps  = gapsByImpianto[impId] ?? [];
    const rowShifts = displayByLane.get(laneKey(sec.id, impId)) ?? [];
    return (
      <Box
        sx={{ position: "relative", flex: 1, height: LANE_H, cursor: "copy", touchAction: "none" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-block]")) return;
          dragRectRef.current = e.currentTarget.getBoundingClientRect();
          const { lo, hi } = laneBounds(impId);
          const m = Math.min(hi, Math.max(lo, minutesAt(e.clientX)));
          setDrag({ mode: "create", secId: sec.id, impId, anchorMin: m, curMin: m });
        }}
      >
        {/* sfondo disponibilità (per segretaria) */}
        {segs.map((sg, i) => (
          <Box key={i} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(sg.start)}%`, width: `${pct(sg.end) - pct(sg.start)}%`, background: segBg[sg.kind], pointerEvents: "none" }} />
        ))}
        {/* impianto chiuso (prima dell'apertura / dopo la chiusura) */}
        {hours.oMin > oMin && (
          <Box sx={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${pct(hours.oMin)}%`, background: CLOSED_BG, pointerEvents: "none" }} />
        )}
        {hours.cMin < cMin && (
          <Box sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(hours.cMin)}%`, right: 0, background: CLOSED_BG, pointerEvents: "none" }} />
        )}
        {/* fasce scoperte di questo impianto */}
        {gaps.map((g, i) => (
          <Box key={`g${i}`} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(toMinutes(g.start))}%`, width: `${pct(toMinutes(g.end)) - pct(toMinutes(g.start))}%`, borderLeft: "1px dashed", borderRight: "1px dashed", borderColor: "#e57373", pointerEvents: "none" }} />
        ))}
        {/* linee orarie */}
        {hourLines.map((h) => (
          <Box key={h} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct(h)}%`, width: "1px", bgcolor: "rgba(0,0,0,0.06)", pointerEvents: "none" }} />
        ))}

        {/* draft creazione */}
        {drag?.mode === "create" && drag.secId === sec.id && drag.impId === impId && (() => {
          const s = Math.min(drag.anchorMin, drag.curMin);
          const e = Math.max(drag.anchorMin, drag.curMin);
          return (
            <Box className="block" sx={{ position: "absolute", left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%`, top: 4, height: LANE_H - 8, opacity: 0.6, pointerEvents: "none", backgroundColor: seasonColor(colorHex(sec.color), impId) }}>
              <span style={{ pointerEvents: "none" }}>{toHHMM(s)}–{toHHMM(e)}</span>
            </Box>
          );
        })()}

        {/* turni esistenti */}
        {rowShifts.map(({ shift: sh, sMin, eMin, dragging }) => {
          const wide = pct(eMin) - pct(sMin) > 10;
          return (
            <Box
              key={sh.id}
              data-block="1"
              className="block"
              sx={{
                position: "absolute",
                left: `${pct(sMin)}%`,
                width: `${pct(eMin) - pct(sMin)}%`,
                top: 4, height: LANE_H - 8,
                cursor: "grab",
                opacity: dragging ? 0.85 : 1,
                zIndex: dragging ? 2 : 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                fontSize: "0.7rem",
                backgroundColor: seasonColor(colorHex(sec.color), sh.impianto),
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                const trackEl = e.currentTarget.parentElement as HTMLElement;
                dragRectRef.current = trackEl.getBoundingClientRect();
                const sMin0 = toMinutes(sh.start);
                const eMin0 = toMinutes(sh.end);
                setDrag({
                  mode: "move", id: sh.id, secId: sh.secretaryId, impId: sh.impianto,
                  startMin: sMin0, endMin: eMin0,
                  grabOffset: minutesAt(e.clientX) - sMin0, dur: eMin0 - sMin0,
                  origStartMin: sMin0, origSecId: sh.secretaryId, origImpId: sh.impianto, moved: false,
                });
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
                sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize", flexShrink: 0 }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const trackEl = (e.currentTarget.parentElement as HTMLElement).parentElement as HTMLElement;
                  dragRectRef.current = trackEl.getBoundingClientRect();
                  setDrag({ mode: "resize-l", id: sh.id, secId: sh.secretaryId, impId: sh.impianto, startMin: toMinutes(sh.start), endMin: toMinutes(sh.end), moved: false });
                }}
              />
              {/* contenuto */}
              <Box sx={{ pl: "10px", pr: "10px", pointerEvents: "none", overflow: "hidden", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "2px", fontSize: "0.7rem" }}>
                <span style={{ fontSize: 11 }}>{impIcon(sh.impianto)}</span>
                {wide && <span>{toHHMM(sMin)}–{toHHMM(eMin)} · {formatHours((eMin - sMin) / 60)}h</span>}
              </Box>
              {/* maniglia destra */}
              <Box
                data-block="1"
                sx={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize" }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const trackEl = (e.currentTarget.parentElement as HTMLElement).parentElement as HTMLElement;
                  dragRectRef.current = trackEl.getBoundingClientRect();
                  setDrag({ mode: "resize-r", id: sh.id, secId: sh.secretaryId, impId: sh.impianto, startMin: toMinutes(sh.start), endMin: toMinutes(sh.end), moved: false });
                }}
              />
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box sx={{ userSelect: "none", overflowX: "auto" }}>
    <Box sx={{ minWidth: 480 }}>
      {/* scala oraria */}
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

      {/* righe per segretaria (con eventuali sotto-righe per impianto) */}
      <Box ref={rowsRef} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        {secretaries.map((sec, idx) => {
          const segs = availSegments(availBySec.get(sec.id), oMin, cMin);
          return (
            <Box key={sec.id} sx={{ display: "flex", alignItems: "stretch", borderTop: idx === 0 ? 0 : "1px solid", borderColor: "divider" }}>
              {/* colonna nome (unica, condivisa fra le sotto-righe) */}
              <Box sx={{ width: GUTTER, flexShrink: 0, display: "flex", borderRight: "1px solid", borderColor: "divider", bgcolor: "#fafbfc" }}>
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", px: 1, minWidth: 0 }}>
                  <span className={`chip ${sec.color}`} style={{ display: "inline-block", maxWidth: "100%" }}>{sec.name}</span>
                </Box>
                {split && (
                  <Box sx={{ width: 26, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid", borderColor: "divider" }}>
                    {laneImpianti.map((imp, i) => {
                      const hasGap = (gapsByImpianto[imp.id] ?? []).length > 0;
                      return (
                        <Box key={imp.id} title={`${imp.nome}${hasGap ? " · scoperto" : " · coperto"}`}
                          sx={{ height: LANE_H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1, borderTop: i === 0 ? 0 : "1px dashed", borderColor: "divider" }}>
                          <span style={{ fontSize: 12 }}>{impIcon(imp.id)}</span>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* sotto-righe (track) */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {laneImpianti.map((imp, i) => (
                  <Box key={imp.id} sx={{ borderTop: i === 0 ? 0 : "1px dashed", borderColor: "divider" }}>
                    {laneTrack(sec, imp.id, segs)}
                  </Box>
                ))}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Box sx={{ width: 14, height: 12, borderRadius: "3px", background: CLOSED_BG }} /> impianto chiuso</Box>
      </Box>

      {/* menu contestuale */}
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
        {impianti.filter((imp) => imp.id !== menu?.shift.impianto).length > 0 && [
          <Divider key="div" />,
          ...impianti
            .filter((imp) => imp.id !== menu?.shift.impianto)
            .map((imp) => (
              <MenuItem key={imp.id} onClick={() => { if (menu) onChangeImpianto(menu.shift.id, imp.id); setMenu(null); }}>
                <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
                {impIcon(imp.id)} Sposta a {imp.nome}
              </MenuItem>
            )),
        ]}
      </Menu>
    </Box>
    </Box>
  );
}
