"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAvailability, setManyAvailability, clearMonth } from "@/app/d/actions";
import { dayShort, dayNum, isWeekend, addMonthsKey } from "@/lib/time";

type Status = "disponibile" | "parziale" | "non_disponibile" | "none";
type Entry = { status: string; start: string | null; end: string | null; note: string | null };
type Day = { iso: string; open: string; close: string };

export function AvailabilityEditor({
  token, name, monthKey, monthLabel, days, initial,
}: {
  token: string;
  name: string;
  monthKey: string;
  monthLabel: string;
  days: Day[];
  initial: Record<string, Entry>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Record<string, Entry>>(initial);

  const statusOf = (iso: string): Status => (data[iso]?.status as Status) ?? "none";
  const setLocal = (iso: string, e: Entry | undefined) =>
    setData((prev) => {
      const next = { ...prev };
      if (e) next[iso] = e;
      else delete next[iso];
      return next;
    });

  function chooseStatus(day: Day, status: "disponibile" | "parziale" | "non_disponibile") {
    const prev = data[day.iso];
    const entry: Entry =
      status === "parziale"
        ? { status, start: prev?.start ?? day.open, end: prev?.end ?? day.close, note: prev?.note ?? null }
        : { status, start: null, end: null, note: prev?.note ?? null };
    setLocal(day.iso, entry);
    startTransition(async () => {
      await setAvailability({ token, date: day.iso, status, start: entry.start, end: entry.end, note: entry.note });
    });
  }

  function savePartial(iso: string, patch: Partial<Entry>) {
    const cur = data[iso];
    if (!cur) return;
    const entry = { ...cur, ...patch };
    setLocal(iso, entry);
    startTransition(async () => {
      await setAvailability({
        token, date: iso, status: "parziale", start: entry.start, end: entry.end, note: entry.note,
      });
    });
  }

  function bulk(filter: (iso: string) => boolean, status: "disponibile" | "non_disponibile") {
    const dates = days.map((d) => d.iso).filter(filter);
    setData((prev) => {
      const next = { ...prev };
      for (const iso of dates) next[iso] = { status, start: null, end: null, note: next[iso]?.note ?? null };
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

  const set = days.filter((d) => statusOf(d.iso) !== "none").length;

  return (
    <div className="mobile">
      <div className="mhead">
        <div className="row" style={{ alignItems: "center" }}>
          <div className="col">
            <div className="small muted">Ciao {name} 👋</div>
            <h2 style={{ margin: 0, textTransform: "capitalize" }}>Disponibilità · {monthLabel}</h2>
          </div>
          <Link className="btn sm" href={`/d/${token}?mese=${addMonthsKey(monthKey, -1)}`}>‹</Link>
          <Link className="btn sm" href={`/d/${token}?mese=${addMonthsKey(monthKey, 1)}`}>›</Link>
        </div>
        <div className="note" style={{ marginTop: 10 }}>
          ⏰ Inserisci preferibilmente entro il <b>25 del mese precedente</b>. Puoi modificare quando vuoi.
        </div>
      </div>

      <div className="mbody stack">
        <div className="card pad">
          <div className="small muted" style={{ marginBottom: 8 }}>Azioni rapide</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <button className="btn sm" disabled={pending} onClick={() => bulk((iso) => !isWeekend(iso), "disponibile")}>
              Lun–Ven disponibili
            </button>
            <button className="btn sm" disabled={pending} onClick={() => bulk((iso) => isWeekend(iso), "non_disponibile")}>
              Weekend non disp.
            </button>
            <button className="btn sm ghost" disabled={pending} onClick={azzera}>Azzera mese</button>
          </div>
        </div>

        <div className="small muted">
          Tocca per ogni giorno: <span className="tag ok">Sì</span> <span className="tag warn">Parz.</span>{" "}
          <span className="tag bad">No</span>
        </div>

        {days.map((day) => {
          const st = statusOf(day.iso);
          const entry = data[day.iso];
          const we = isWeekend(day.iso);
          return (
            <div key={day.iso} className="dayrow" style={st === "parziale" ? { display: "block" } : undefined}>
              <div className="row" style={{ alignItems: "center" }}>
                <div className="date">
                  <b style={we ? { color: "var(--brand)" } : undefined}>{dayNum(day.iso)}</b>
                  <span>{dayShort(day.iso)}</span>
                </div>
                <div className="info">
                  <div className="seg">
                    <button className={st === "disponibile" ? "on-ok" : ""} onClick={() => chooseStatus(day, "disponibile")}>Sì</button>
                    <button className={st === "parziale" ? "on-part" : ""} onClick={() => chooseStatus(day, "parziale")}>Parz.</button>
                    <button className={st === "non_disponibile" ? "on-no" : ""} onClick={() => chooseStatus(day, "non_disponibile")}>No</button>
                  </div>
                </div>
              </div>

              {st === "parziale" && (
                <>
                  <div className="row" style={{ marginTop: 10, gap: 8, alignItems: "center" }}>
                    <span className="small muted">Dalle</span>
                    <input className="input" style={{ width: 110 }} type="time" defaultValue={entry?.start ?? day.open}
                      onBlur={(e) => savePartial(day.iso, { start: e.target.value })} />
                    <span className="small muted">alle</span>
                    <input className="input" style={{ width: 110 }} type="time" defaultValue={entry?.end ?? day.close}
                      onBlur={(e) => savePartial(day.iso, { end: e.target.value })} />
                  </div>
                  <input className="input" style={{ width: "100%", marginTop: 8 }} placeholder="📝 Nota (facoltativa)"
                    defaultValue={entry?.note ?? ""} onBlur={(e) => savePartial(day.iso, { note: e.target.value || null })} />
                </>
              )}
            </div>
          );
        })}

        <div className="card pad center">
          <div className="small muted">Stato mese</div>
          <div><b>{set} giorni</b> impostati · {days.length - set} da compilare</div>
          <div className="small muted" style={{ marginTop: 4 }}>{pending ? "Salvataggio…" : "✓ Salvato automaticamente"}</div>
        </div>
      </div>

      <div className="mtab">
        <Link className="active" href={`/d/${token}`}><span className="ic">📅</span>Disponibilità</Link>
        <Link href={`/d/${token}/turni`}><span className="ic">🗓️</span>I miei turni</Link>
      </div>
    </div>
  );
}
