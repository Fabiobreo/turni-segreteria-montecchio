"use client";

import { useRef, useState } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import { nodeToPngBlob, downloadBlob, shareBlob, slugFileName } from "@/lib/export-image";

export type PosterShift = { start: string; end: string };
export type PosterSecretary = {
  id: string; name: string; color: string; weekHours: string;
  days: PosterShift[][];
};

export function WeekPoster({
  weekLabel, dayHeaders, secretaries, hasGaps,
}: {
  weekLabel: string;
  dayHeaders: { num: number; name: string; weekend: boolean }[];
  secretaries: PosterSecretary[];
  hasGaps: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileName = slugFileName(weekLabel);
  const title = `Turni Segreteria — ${weekLabel}`;

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

  const anyShift = secretaries.some((s) => s.days.some((d) => d.length > 0));

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

      <div ref={ref} className="poster">
        <div className="poster-head">
          <div className="pdot" />
          <div className="col" style={{ flex: 1 }}>
            <h2>Turni Segreteria</h2>
            <div className="sub" style={{ textTransform: "capitalize" }}>{weekLabel}</div>
          </div>
        </div>
        <table className="poster-grid">
          <thead>
            <tr>
              <th className="who">Segretaria</th>
              {dayHeaders.map((d, i) => (
                <th key={i} className={d.weekend ? "we" : undefined}>
                  <span className="dn">{d.num}</span>{d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {secretaries.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className={`pg-name ${s.color}`}>
                    <span>{s.name}</span>
                  </div>
                </td>
                {s.days.map((shifts, i) => (
                  <td key={i}>
                    <div className={`pg-cell${dayHeaders[i].weekend ? " we" : ""}${shifts.length === 0 ? " off" : ""}`}>
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
        <div className="poster-foot">
          <span>Lun–Ven 08:00–20:30 · Sab–Dom 09:00–19:30</span>
          {hasGaps && <span className="gapnote">⚠ Fasce ancora scoperte</span>}
        </div>
      </div>

      {!anyShift && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nessun turno in questa settimana.</Typography>}
      {msg && <Typography variant="body2" sx={{ mt: 1 }}>{msg}</Typography>}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        Da telefono <strong>Condividi</strong> apre WhatsApp. Da PC scarica il PNG e allegalo al gruppo.
      </Typography>
    </Paper>
  );
}
