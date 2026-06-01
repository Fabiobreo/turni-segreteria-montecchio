"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShift, deleteShift } from "@/app/manager/actions";
import { toMinutes, durationHours, formatHours } from "@/lib/time";
import { coverageGaps, maxConcurrent, assignLanes } from "@/lib/coverage";

type Sec = { id: string; name: string; color: string; weeklyMax: number };
type Shift = { id: string; secretaryId: string; start: string; end: string };
type Avail = { secretaryId: string; status: string; start: string | null; end: string | null; note: string | null };
type RangeStatus = "si" | "no" | "non_indicata";

export function DayEditor({
  date, open, close, weekLabel, secretaries, shifts, availabilities, monthlyHours, weeklyHours,
}: {
  date: string;
  open: string;
  close: string;
  weekLabel: string;
  secretaries: Sec[];
  shifts: Shift[];
  availabilities: Avail[];
  monthlyHours: Record<string, number>;
  weeklyHours: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; secretaryId: string; start: string; end: string } | null>(null);

  const secById = new Map(secretaries.map((s) => [s.id, s]));
  const availBySec = new Map(availabilities.map((a) => [a.secretaryId, a]));
  const gaps = coverageGaps(shifts, open, close);
  const overCapacity = maxConcurrent(shifts) > 2;
  const { items, lanes } = assignLanes(shifts);
  const trackH = Math.max(34, lanes * 34);

  const oMin = toMinutes(open);
  const span = toMinutes(close) - oMin;
  const pct = (t: string) => ((toMinutes(t) - oMin) / span) * 100;

  // stato disponibilità di una segretaria per una fascia [start,end]
  function availForRange(secId: string, start: string, end: string): RangeStatus {
    const a = availBySec.get(secId);
    if (!a) return "non_indicata";
    if (a.status === "disponibile") return "si";
    if (a.status === "non_disponibile") return "no";
    if (a.status === "parziale" && a.start && a.end) {
      return toMinutes(a.start) <= toMinutes(start) && toMinutes(end) <= toMinutes(a.end) ? "si" : "no";
    }
    return "non_indicata";
  }

  function startAdd(secretaryId = secretaries[0]?.id ?? "", start = open, end = "14:00") {
    setError(null);
    setForm({ id: null, secretaryId, start, end });
  }
  function startEdit(s: Shift) {
    setError(null);
    setForm({ id: s.id, secretaryId: s.secretaryId, start: s.start, end: s.end });
  }

  function submit() {
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const res = await saveShift({
        id: form.id ?? undefined, date, secretaryId: form.secretaryId, start: form.start, end: form.end,
      });
      if (!res.ok) { setError(res.error ?? "Errore"); return; }
      setForm(null);
      router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => { await deleteShift(id); router.refresh(); });
  }

  const warn =
    form && availForRange(form.secretaryId, form.start, form.end) !== "si"
      ? availForRange(form.secretaryId, form.start, form.end) === "no"
        ? "La segretaria selezionata NON è disponibile in questa fascia."
        : "Disponibilità non indicata per questa segretaria in questo giorno."
      : null;

  return (
    <div className="row" style={{ flexWrap: "wrap" }}>
      {/* COLONNA SINISTRA */}
      <div className="col" style={{ minWidth: 440 }}>
        <div className="card pad stack">
          <div className="row" style={{ alignItems: "center" }}>
            <h3 className="col">Copertura del giorno</h3>
            {gaps.length === 0 ? <span className="tag ok">✓ Copertura completa</span> : <span className="tag bad">⚠ {gaps.length} fascia/e scoperta/e</span>}
            {overCapacity && <span className="tag bad">⚠ più di 2 persone</span>}
          </div>

          {/* timeline */}
          <div className="timeline">
            <div className="track" style={{ height: trackH }}>
              {gaps.map((g, i) => (
                <div key={i} className="hole" style={{ left: `${pct(g.start)}%`, width: `${pct(g.end) - pct(g.start)}%` }} />
              ))}
              {items.map(({ shift, lane }) => {
                const sec = secById.get(shift.secretaryId);
                return (
                  <div key={shift.id} className={`block ${sec?.color ?? ""}`} title={`${sec?.name} ${shift.start}–${shift.end}`}
                    style={{ left: `${pct(shift.start)}%`, width: `${pct(shift.end) - pct(shift.start)}%`, top: lane * 34, height: 30 }}>
                    {sec?.name} {shift.start}–{shift.end}
                  </div>
                );
              })}
            </div>
            <div className="scale"><span>{open}</span><span>{close}</span></div>
          </div>

          {/* fasce scoperte con chi è disponibile */}
          {gaps.length > 0 && (
            <div className="stack">
              {gaps.map((g, i) => {
                const free = secretaries.filter((s) => availForRange(s.id, g.start, g.end) === "si");
                const unknown = secretaries.filter((s) => availForRange(s.id, g.start, g.end) === "non_indicata");
                return (
                  <div key={i} className="card pad" style={{ background: "var(--red-soft)", borderColor: "#f3c6c1" }}>
                    <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="tag bad">▨ scoperto {g.start}–{g.end}</span>
                      <span className="small muted">disponibili:</span>
                      {free.length === 0 && unknown.length === 0 && <span className="small">nessuna 😕</span>}
                      {free.map((s) => (
                        <button key={s.id} className={`chip ${s.color}`} style={{ display: "inline", cursor: "pointer", border: 0 }}
                          title={`Assegna ${s.name} ${g.start}–${g.end}`} onClick={() => startAdd(s.id, g.start, g.end)}>
                          + {s.name}
                        </button>
                      ))}
                      {unknown.map((s) => (
                        <button key={s.id} className="tag neutral" style={{ cursor: "pointer", border: 0 }}
                          title={`Disponibilità non indicata — assegna comunque`} onClick={() => startAdd(s.id, g.start, g.end)}>
                          {s.name}?
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <hr className="soft" />

          {/* lista turni */}
          <div className="row" style={{ alignItems: "center" }}>
            <h3 className="col">Turni assegnati</h3>
            <button className="btn sm primary" onClick={() => startAdd()} disabled={pending}>+ Aggiungi turno</button>
          </div>

          {shifts.length === 0 && !form && <p className="muted small">Nessun turno. Aggiungine uno per coprire la giornata.</p>}

          {shifts.map((s) => {
            const sec = secById.get(s.secretaryId);
            if (form?.id === s.id) return <div key={s.id}>{ShiftForm()}</div>;
            return (
              <div key={s.id} className="card pad">
                <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className={`chip ${sec?.color ?? ""}`} style={{ display: "inline" }}>{sec?.name}</span>
                  <b>{s.start}–{s.end}</b>
                  <span className="tag info">{formatHours(durationHours(s.start, s.end))} h</span>
                  <span className="sp" style={{ flex: 1 }} />
                  <button className="btn sm" onClick={() => startEdit(s)} disabled={pending}>Modifica</button>
                  <button className="btn sm ghost" style={{ color: "var(--red)" }} onClick={() => remove(s.id)} disabled={pending}>Rimuovi</button>
                </div>
              </div>
            );
          })}

          {form && form.id === null && ShiftForm()}

          <div className="note">ℹ️ Il raddoppio lo decidi tu: aggiungi un turno sovrapposto nelle fasce da rinforzare.</div>
        </div>
      </div>

      {/* COLONNA DESTRA */}
      <div style={{ width: 380 }}>
        {/* ORE: tetto settimanale + contatore mese */}
        <div className="card pad stack" style={{ marginBottom: 16 }}>
          <h3>Ore allocate</h3>
          <div className="small muted">Settimana: {weekLabel}</div>
          <table>
            <thead>
              <tr><th>Segretaria</th><th>Settimana</th><th>Mese</th></tr>
            </thead>
            <tbody>
              {secretaries.map((s) => {
                const w = weeklyHours[s.id] ?? 0;
                const m = monthlyHours[s.id] ?? 0;
                const wMax = s.weeklyMax || 0;
                const wcls = wMax > 0 && w > wMax ? "bad" : wMax > 0 && w >= wMax ? "warn" : "ok";
                return (
                  <tr key={s.id}>
                    <td><span className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span></td>
                    <td><span className={`tag ${wcls}`}>{formatHours(w)}{wMax ? ` / ${wMax}` : ""}</span></td>
                    <td className="small muted" title="ore lavorate questo mese">{formatHours(m)} h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small muted">Settimana (allocate / tetto) — verde: sotto · giallo: al tetto · rosso: oltre. Mese: ore già lavorate (solo conteggio).</p>
        </div>

        {/* DISPONIBILITÀ del giorno */}
        <div className="card pad stack">
          <h3>Disponibilità del giorno</h3>
          <table>
            <thead><tr><th>Segretaria</th><th>Disp.</th></tr></thead>
            <tbody>
              {secretaries.map((s) => {
                const a = availBySec.get(s.id);
                let dtag = <span className="tag neutral">—</span>;
                let detail = "non indicata";
                if (a?.status === "disponibile") { dtag = <span className="tag ok">Sì</span>; detail = "tutto il giorno"; }
                else if (a?.status === "parziale") { dtag = <span className="tag warn">Parz.</span>; detail = `${a.start}–${a.end}`; }
                else if (a?.status === "non_disponibile") { dtag = <span className="tag bad">No</span>; detail = "non disponibile"; }
                return (
                  <tr key={s.id}>
                    <td>{s.name}<div className="small muted">{detail}{a?.note ? ` · "${a.note}"` : ""}</div></td>
                    <td>{dtag}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function ShiftForm() {
    if (!form) return null;
    return (
      <div className="card pad" style={{ borderStyle: "dashed" }}>
        <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b style={{ width: 70 }}>{form.id ? "Modifica" : "Nuovo"}</b>
          <select className="input" value={form.secretaryId} onChange={(e) => setForm({ ...form, secretaryId: e.target.value })}>
            {secretaries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input" style={{ width: 90 }} type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          <span>–</span>
          <input className="input" style={{ width: 90 }} type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          <span className="tag info">{formatHours(Math.max(0, durationHours(form.start, form.end)))} h</span>
          <button className="btn sm primary" onClick={submit} disabled={pending}>{pending ? "Salvo…" : "Salva"}</button>
          <button className="btn sm ghost" onClick={() => { setForm(null); setError(null); }} disabled={pending}>Annulla</button>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="small muted">Preset:</span>
          <button className="btn sm" onClick={() => setForm({ ...form, start: open, end: "14:00" })}>Mattina {open}–14:00</button>
          <button className="btn sm" onClick={() => setForm({ ...form, start: "14:00", end: close })}>Pomeriggio 14:00–{close}</button>
          <button className="btn sm" onClick={() => setForm({ ...form, start: open, end: close })}>Tutto {open}–{close}</button>
        </div>

        {/* chi è disponibile per la fascia selezionata */}
        <div className="card pad" style={{ marginTop: 8, background: "#fafbfc" }}>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Disponibili per <b>{form.start}–{form.end}</b> (tocca per assegnare):
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {secretaries.map((s) => {
              const st = availForRange(s.id, form.start, form.end);
              const selected = s.id === form.secretaryId;
              const cls = st === "si" ? "ok" : st === "no" ? "bad" : "neutral";
              const icon = st === "si" ? "✓" : st === "no" ? "✕" : "?";
              return (
                <button key={s.id} className={`tag ${cls}`}
                  style={{ cursor: "pointer", border: selected ? "2px solid var(--ink)" : "1px solid transparent" }}
                  onClick={() => setForm({ ...form, secretaryId: s.id })}>
                  {icon} {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {warn && <div className="note" style={{ marginTop: 8 }}>⚠ {warn}</div>}
        {error && <div className="tag bad" style={{ marginTop: 8 }}>{error}</div>}
      </div>
    );
  }
}
