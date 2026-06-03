"use client";

import { useRef, useState } from "react";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import IosShareIcon from "@mui/icons-material/IosShare";
import { nodeToPngBlob, downloadBlob, shareBlob, slugFileName } from "@/lib/export-image";

export type ExportItem = {
  dayNum: number;
  dayShort: string;
  start: string;
  end: string;
  impianto: string;
  hours: string;
  weekend: boolean;
};

/** Bottone "Salva / Condividi" che genera un'immagine del riepilogo turni del mese. */
export function MyShiftsExport({
  name, colorHex, monthLabel, total, items,
}: {
  name: string;
  colorHex: string;
  monthLabel: string;
  total: string;
  items: ExportItem[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileName = slugFileName(`${name}-${monthLabel}`);
  const title = `Turni ${name} — ${monthLabel}`;

  async function onShare() {
    if (!ref.current) return;
    setBusy(true); setMsg(null);
    try {
      const blob = await nodeToPngBlob(ref.current);
      const shared = await shareBlob(blob, fileName, title);
      if (!shared) { downloadBlob(blob, fileName); setMsg("Immagine salvata ✓"); }
      else setMsg("Condiviso ✓");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Esportazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<IosShareIcon />} disabled={busy || items.length === 0} onClick={onShare}>
        {busy ? "Genero…" : "Salva / Condividi"}
      </Button>

      {/* Nodo esportato: fuori schermo, renderizzato per la cattura immagine. */}
      <div ref={ref} style={{
        position: "absolute", left: -99999, top: 0, width: 420,
        padding: 24, background: "#fff", fontFamily: "system-ui, sans-serif", color: "#111",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ background: colorHex, color: "#fff", fontWeight: 700, padding: "2px 10px", borderRadius: 999, fontSize: 14 }}>{name}</span>
          <span style={{ fontSize: 13, color: "#666" }}>Totale {total} h</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, textTransform: "capitalize", marginBottom: 14 }}>
          Turni · {monthLabel}
        </div>
        {items.length === 0 ? (
          <div style={{ color: "#666" }}>Nessun turno questo mese.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "7px 8px 7px 0", whiteSpace: "nowrap", color: it.weekend ? "#b45309" : "#111" }}>
                    <b>{it.dayNum}</b> {it.dayShort}
                  </td>
                  <td style={{ padding: "7px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>{it.start}–{it.end}</td>
                  <td style={{ padding: "7px 0", textAlign: "right", color: "#666", whiteSpace: "nowrap" }}>
                    {it.hours} h · {it.impianto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Snackbar open={!!msg} autoHideDuration={3000} onClose={() => setMsg(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {msg ? <Alert severity="success" variant="filled" onClose={() => setMsg(null)}>{msg}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
