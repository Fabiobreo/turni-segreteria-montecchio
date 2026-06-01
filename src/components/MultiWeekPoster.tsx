"use client";

import { useRef, useState } from "react";
import { nodeToPngBlob, downloadBlob, shareBlob, slugFileName } from "@/lib/export-image";

export type MWPShift = { start: string; end: string };
export type MWPSecretary = {
  id: string;
  name: string;
  color: string;
  weekHours: string;
  days: MWPShift[][];
};
export type MWPWeek = {
  label: string;
  dayHeaders: { num: number; name: string; weekend: boolean; inMonth: boolean }[];
  secretaries: MWPSecretary[];
  hasGaps: boolean;
};

export function MultiWeekPoster({
  monthLabel,
  weeks,
}: {
  monthLabel: string;
  weeks: MWPWeek[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [startIdx, setStartIdx] = useState(0);
  const [count, setCount] = useState(1);

  const maxCount = weeks.length - startIdx;
  const displayed = weeks.slice(startIdx, startIdx + count);
  const title = `Turni Segreteria — ${monthLabel}`;
  const fileName = slugFileName(monthLabel);

  function pickStart(i: number) {
    setStartIdx(i);
    if (i + count > weeks.length) setCount(weeks.length - i);
  }

  function pickCount(n: number) {
    if (startIdx + n > weeks.length) return;
    setCount(n);
  }

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
      if (!shared) { downloadBlob(blob, fileName); setMsg("Condivisione diretta non disponibile: immagine scaricata, allegala su WhatsApp."); }
      else setMsg("Condiviso ✓");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Condivisione non riuscita.");
    } finally { setBusy(false); }
  }

  return (
    <div className="card pad">
      {/* intestazione + pulsanti export */}
      <div className="row" style={{ alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 className="col" style={{ margin: 0 }}>Griglia condivisibile</h2>
        <button className="btn" onClick={onDownload} disabled={busy}>{busy ? "Genero…" : "⬇️ Scarica PNG"}</button>
        <button className="btn primary" onClick={onShare} disabled={busy}>📷 Condividi (WhatsApp)</button>
      </div>

      {/* selettore settimane */}
      <div className="mwp-controls">
        <div className="mwp-ctrl-group">
          <span className="small muted">Da:</span>
          {weeks.map((w, i) => (
            <button
              key={i}
              className={`btn mwp-btn${startIdx === i ? " primary" : ""}`}
              onClick={() => pickStart(i)}
              title={w.label}
            >
              Sett.&nbsp;{i + 1}
            </button>
          ))}
        </div>
        <div className="mwp-ctrl-group">
          <span className="small muted">Settimane:</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`btn mwp-btn${count === n ? " primary" : ""}`}
              onClick={() => pickCount(n)}
              disabled={startIdx + n > weeks.length}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="small muted mwp-range">{displayed[0]?.label}{displayed.length > 1 ? ` → ${displayed[displayed.length - 1]?.label}` : ""}</span>
      </div>

      {/* nodo catturato come immagine */}
      <div ref={ref} className="poster">
        <div className="poster-head">
          <div className="pdot" />
          <div className="col">
            <h2>Turni Segreteria</h2>
            <div className="sub" style={{ textTransform: "capitalize" }}>{monthLabel}</div>
          </div>
        </div>

        {displayed.map((week, wi) => (
          <div key={wi} className={wi > 0 ? "mwp-week-block" : undefined}>
            {displayed.length > 1 && (
              <div className="mwp-week-sep">{week.label}</div>
            )}
            <table className="poster-grid">
              <thead>
                <tr>
                  <th className="who">Segretaria</th>
                  {week.dayHeaders.map((d, i) => (
                    <th
                      key={i}
                      className={d.weekend ? "we" : undefined}
                      style={!d.inMonth ? { opacity: 0.3 } : undefined}
                    >
                      <span className="dn">{d.num}</span>
                      {d.name}
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
          </div>
        ))}

        <div className="poster-foot">
          <span>Lun–Ven 08:00–20:30 · Sab–Dom 09:00–19:30</span>
          {displayed.some((w) => w.hasGaps) && (
            <span className="gapnote">⚠ Alcune fasce ancora scoperte</span>
          )}
          <span style={{ marginLeft: "auto" }}>Generato con Gestione Turni</span>
        </div>
      </div>

      {msg && <p className="small" style={{ marginTop: 10 }}>{msg}</p>}
      <p className="small muted" style={{ marginTop: 6 }}>
        Da telefono <b>Condividi</b> apre WhatsApp con l&apos;immagine. Da PC scarica il PNG e allegalo al gruppo.
      </p>
    </div>
  );
}
