"use client";

import { useRef, useState } from "react";
import { nodeToPngBlob, downloadBlob, shareBlob, slugFileName } from "@/lib/export-image";

export type PosterShift = { start: string; end: string };
export type PosterSecretary = {
  id: string;
  name: string;
  color: string;
  /** 7 celle (lun..dom); ogni cella è la lista dei turni di quel giorno */
  days: PosterShift[][];
  weekHours: string; // ore totali settimana già formattate
};

export function WeekPoster({
  weekLabel,
  dayHeaders, // 7 etichette { num, name, weekend }
  secretaries,
  hasGaps,
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
    try {
      if (!ref.current) return;
      downloadBlob(await nodeToPngBlob(ref.current), fileName);
      setMsg("Immagine scaricata ✓");
    } catch { setMsg("Errore durante la generazione dell'immagine."); }
    finally { setBusy(false); }
  }

  async function onShare() {
    setBusy(true); setMsg(null);
    try {
      if (!ref.current) return;
      const blob = await nodeToPngBlob(ref.current);
      const shared = await shareBlob(blob, fileName, title);
      if (!shared) { downloadBlob(blob, fileName); setMsg("Condivisione diretta non disponibile qui: immagine scaricata, allegala su WhatsApp."); }
      else setMsg("Condiviso ✓");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Condivisione non riuscita.");
    } finally { setBusy(false); }
  }

  const anyShift = secretaries.some((s) => s.days.some((d) => d.length > 0));

  return (
    <div className="card pad">
      <div className="row" style={{ alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 className="col" style={{ margin: 0 }}>Griglia condivisibile</h2>
        <button className="btn" onClick={onDownload} disabled={busy}>{busy ? "Genero…" : "⬇️ Scarica PNG"}</button>
        <button className="btn primary" onClick={onShare} disabled={busy}>📷 Condividi (WhatsApp)</button>
      </div>

      {/* nodo catturato come immagine */}
      <div ref={ref} className="poster">
        <div className="poster-head">
          <div className="pdot" />
          <div className="col">
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
                  <span className="dn">{d.num}</span>
                  {d.name}
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
                    <span className="h">{s.weekHours}h</span>
                  </div>
                </td>
                {s.days.map((shifts, i) => (
                  <td key={i}>
                    <div className={`pg-cell${dayHeaders[i].weekend ? " we" : ""}${shifts.length === 0 ? " off" : ""}`}>
                      {shifts.length === 0 ? (
                        <span className="pg-dash">—</span>
                      ) : (
                        shifts.map((sh, j) => (
                          <span key={j} className="pg-pill">{sh.start}<br />{sh.end}</span>
                        ))
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="poster-foot">
          <span>Orari ufficio: Lun–Ven 08:00–20:30 · Sab–Dom 09:00–19:30</span>
          {hasGaps && <span className="gapnote">⚠ Attenzione: ci sono fasce ancora scoperte</span>}
          <span style={{ marginLeft: "auto" }}>Generato con Gestione Turni</span>
        </div>
      </div>

      {!anyShift && <p className="small muted" style={{ marginTop: 10 }}>Nessun turno in questa settimana: la griglia è vuota.</p>}
      {msg && <p className="small" style={{ marginTop: 10 }}>{msg}</p>}
      <p className="small muted" style={{ marginTop: 6 }}>
        Da telefono <b>Condividi</b> apre WhatsApp con l&apos;immagine. Da PC scarica il PNG e allegalo al gruppo.
      </p>
    </div>
  );
}
