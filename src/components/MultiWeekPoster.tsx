"use client";

import { useRef, useState } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import { nodeToPngBlob, downloadBlob, shareBlob, slugFileName } from "@/lib/export-image";

export type MWPShift = { start: string; end: string };
export type MWPSecretary = {
  id: string; name: string; color: string; weekHours: string;
  days: MWPShift[][];
};
export type MWPWeek = {
  label: string;
  dayHeaders: { num: number; name: string; weekend: boolean; inMonth: boolean }[];
  secretaries: MWPSecretary[];
  hasGaps: boolean;
};

export function MultiWeekPoster({ monthLabel, weeks }: { monthLabel: string; weeks: MWPWeek[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [startIdx, setStartIdx] = useState(0);
  const [count, setCount] = useState(1);

  const displayed = weeks.slice(startIdx, startIdx + count);
  const title = `Turni Segreteria — ${monthLabel}`;
  const fileName = slugFileName(monthLabel);

  function pickStart(i: number) {
    setStartIdx(i);
    if (i + count > weeks.length) setCount(weeks.length - i);
  }

  async function onDownload() {
    setBusy(true); setMsg(null);
    try { if (!ref.current) return; downloadBlob(await nodeToPngBlob(ref.current), fileName); setMsg("Immagine scaricata ✓"); }
    catch { setMsg("Errore durante la generazione dell'immagine."); }
    finally { setBusy(false); }
  }
  async function onShare() {
    setBusy(true); setMsg(null);
    try {
      if (!ref.current) return;
      const blob = await nodeToPngBlob(ref.current);
      const shared = await shareBlob(blob, fileName, title);
      if (!shared) { downloadBlob(blob, fileName); setMsg("Condivisione diretta non disponibile: immagine scaricata."); }
      else setMsg("Condiviso ✓");
    } catch (e) { if ((e as Error)?.name !== "AbortError") setMsg("Condivisione non riuscita."); }
    finally { setBusy(false); }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h3" sx={{ flex: 1 }}>Griglia condivisibile</Typography>
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={onDownload} disabled={busy}>
          {busy ? "Genero…" : "Scarica PNG"}
        </Button>
        <Button size="small" variant="contained" startIcon={<ShareIcon />} onClick={onShare} disabled={busy}>
          Condividi (WhatsApp)
        </Button>
      </Box>

      {/* selettore settimane */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Da:</Typography>
          <ToggleButtonGroup size="small" exclusive value={startIdx} onChange={(_, v) => v !== null && pickStart(v)}>
            {weeks.map((_, i) => (
              <ToggleButton key={i} value={i} sx={{ fontSize: "0.75rem", px: 1.25, py: 0.5 }}>
                Sett.&nbsp;{i + 1}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Settimane:</Typography>
          <ToggleButtonGroup size="small" exclusive value={count} onChange={(_, v) => v !== null && startIdx + v <= weeks.length && setCount(v)}>
            {[1, 2, 3, 4].map((n) => (
              <ToggleButton key={n} value={n} disabled={startIdx + n > weeks.length} sx={{ fontSize: "0.75rem", px: 1.25, py: 0.5 }}>
                {n}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
          {displayed[0]?.label}{displayed.length > 1 ? ` → ${displayed[displayed.length - 1]?.label}` : ""}
        </Typography>
      </Box>

      {/* poster catturato come immagine */}
      <div ref={ref} className="poster">
        <div className="poster-head">
          <div className="pdot" />
          <div style={{ flex: 1 }}>
            <h2>Turni Segreteria</h2>
            <div className="sub" style={{ textTransform: "capitalize" }}>{monthLabel}</div>
          </div>
        </div>

        {displayed.map((week, wi) => (
          <div key={wi} className={wi > 0 ? "mwp-week-block" : undefined}>
            {displayed.length > 1 && <div className="mwp-week-sep">{week.label}</div>}
            <table className="poster-grid">
              <thead>
                <tr>
                  <th className="who">Segretaria</th>
                  {week.dayHeaders.map((d, i) => (
                    <th key={i} className={d.weekend ? "we" : undefined} style={!d.inMonth ? { opacity: 0.3 } : undefined}>
                      <span className="dn">{d.num}</span>{d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {week.secretaries.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className={`pg-name ${s.color}`}>
                        <span>{s.name}</span>
                        <span className="h">{s.weekHours}h</span>
                      </div>
                    </td>
                    {s.days.map((shifts, i) => (
                      <td key={i} style={!week.dayHeaders[i].inMonth ? { opacity: 0.3 } : undefined}>
                        <div className={`pg-cell${week.dayHeaders[i].weekend ? " we" : ""}${shifts.length === 0 ? " off" : ""}`}>
                          {shifts.length === 0
                            ? <span className="pg-dash">—</span>
                            : shifts.map((sh, j) => <span key={j} className="pg-pill">{sh.start}<br />{sh.end}</span>)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="poster-foot">
          <span>Lun–Ven 08:00–20:30 · Sab–Dom 09:00–19:30</span>
          {displayed.some((w) => w.hasGaps) && <span className="gapnote">⚠ Alcune fasce ancora scoperte</span>}
          <span style={{ marginLeft: "auto" }}>Generato con Gestione Turni</span>
        </div>
      </div>

      {msg && <Typography variant="body2" sx={{ mt: 1 }}>{msg}</Typography>}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        Da telefono <strong>Condividi</strong> apre WhatsApp. Da PC scarica il PNG e allegalo al gruppo.
      </Typography>
    </Paper>
  );
}
