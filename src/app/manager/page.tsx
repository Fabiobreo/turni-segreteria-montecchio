import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { WeekPoster } from "@/components/WeekPoster";
import { officeHours } from "@/lib/office";
import { coverageGaps, assignLanes, hoursBySecretary } from "@/lib/coverage";
import { topPx, heightPx, hourLabels, GRID_HEIGHT } from "@/lib/grid";
import {
  mondayOf, weekDates, weekLabel, addDays, toISODate, dayShort, dayNum,
  isWeekend, monthKeyOf, formatHours, durationHours,
} from "@/lib/time";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  await requireManager();
  const { start } = await searchParams;
  const monday = mondayOf(start ?? toISODate(new Date()));
  const days = weekDates(monday);
  const monthKey = monthKeyOf(monday);

  const [secretaries, weekShifts, weekAvail, monthShifts, recent] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date: { in: days } } }),
    prisma.availability.findMany({ where: { date: { in: days } } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } } }),
    prisma.availability.count({
      where: { updatedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const secById = new Map(secretaries.map((s) => [s.id, s]));
  const monthlyHours = hoursBySecretary(monthShifts);
  const weeklyHours = hoursBySecretary(weekShifts);

  // dati per la griglia condivisibile (segretarie × 7 giorni)
  const posterDayHeaders = days.map((iso) => ({
    num: dayNum(iso),
    name: dayShort(iso),
    weekend: isWeekend(iso),
  }));
  const posterSecretaries = secretaries.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    weekHours: formatHours(weeklyHours[s.id] ?? 0),
    days: days.map((iso) =>
      weekShifts
        .filter((sh) => sh.date === iso && sh.secretaryId === s.id)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((sh) => ({ start: sh.start, end: sh.end }))
    ),
  }));
  const posterHasGaps = days.some((iso) => {
    const { open, close } = officeHours(iso);
    const ds = weekShifts.filter((sh) => sh.date === iso);
    return ds.length === 0 || coverageGaps(ds, open, close).length > 0;
  });

  return (
    <>
      <ManagerTop
        active="settimana"
        right={
          recent > 0 ? (
            <span className="tag warn">🔔 {recent} disponibilità aggiornate di recente</span>
          ) : null
        }
      />
      <div className="wrap" style={{ maxWidth: 1280 }}>
        <div className="row" style={{ alignItems: "center", marginBottom: 14 }}>
          <div className="col">
            <div className="small muted">Costruzione turni · vista a fasce</div>
            <h1 style={{ margin: 0 }}>{weekLabel(monday)}</h1>
          </div>
          <Link className="btn" href={`/manager?start=${addDays(monday, -7)}`}>
            ‹ Settimana prec.
          </Link>
          <Link className="btn" href="/manager">
            Oggi
          </Link>
          <Link className="btn" href={`/manager?start=${addDays(monday, 7)}`}>
            Settimana succ. ›
          </Link>
        </div>

        <div className="card pad">
          <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span className="small muted">Legenda:</span>
            {secretaries.map((s) => (
              <span key={s.id} className={`chip ${s.color}`} style={{ display: "inline" }}>
                {s.name}
              </span>
            ))}
            <span className="sp" style={{ flex: 1 }} />
            <span className="tag bad">▨ fascia scoperta</span>
            <span className="tag info">colonne affiancate = raddoppio</span>
          </div>

          <div className="weekgrid">
            <div className="hcell" />
            {days.map((iso) => (
              <Link key={iso} className={`dayhead${isWeekend(iso) ? " we" : ""}`} href={`/manager/giorno/${iso}`}>
                <b>{dayNum(iso)}</b>
                <span>{dayShort(iso)}</span>
              </Link>
            ))}

            {/* asse orario */}
            <div className="timecol">
              {hourLabels().map((h) => (
                <div key={h.label} className="tlabel" style={{ top: h.top }}>
                  {h.label}
                </div>
              ))}
            </div>

            {/* colonne giorni */}
            {days.map((iso) => {
              const { open, close } = officeHours(iso);
              const dayShifts = weekShifts.filter((s) => s.date === iso);
              const gaps = coverageGaps(dayShifts, open, close);
              const { items, lanes } = assignLanes(dayShifts);
              const hasGap = gaps.length > 0;
              return (
                <Link
                  key={iso}
                  href={`/manager/giorno/${iso}`}
                  className={`daybody${hasGap ? " gap-day" : ""}`}
                  style={{ display: "block" }}
                >
                  {/* fasce fuori orario (weekend) */}
                  {topPx(open) > 0 && <div className="closed" style={{ top: 0, height: topPx(open) }} />}
                  {topPx(close) < GRID_HEIGHT && (
                    <div className="closed" style={{ top: topPx(close), height: GRID_HEIGHT - topPx(close) }} />
                  )}
                  {/* buchi di copertura */}
                  {gaps.map((g, i) => (
                    <div
                      key={i}
                      className="wgap"
                      style={{ top: topPx(g.start), height: heightPx(g.start, g.end) }}
                    >
                      ▨ scoperto
                      <br />
                      {g.start}–{g.end}
                    </div>
                  ))}
                  {/* turni */}
                  {items.map(({ shift, lane }) => {
                    const sec = secById.get(shift.secretaryId);
                    const widthPct = 100 / lanes;
                    return (
                      <div
                        key={shift.id}
                        className={`wblock ${sec?.color ?? ""}`}
                        style={{
                          top: topPx(shift.start),
                          height: heightPx(shift.start, shift.end),
                          left: `calc(${lane * widthPct}% + 3px)`,
                          width: `calc(${widthPct}% - 6px)`,
                          right: "auto",
                        }}
                      >
                        {sec?.name}
                        <small>
                          {shift.start}–{shift.end}
                        </small>
                      </div>
                    );
                  })}
                </Link>
              );
            })}
          </div>

          <p className="small muted" style={{ marginTop: 12 }}>
            💡 Tocca un giorno per aggiungere o modificare i turni. Le zone grigie sono fuori orario
            d&apos;ufficio (weekend 09:00–19:30).
          </p>
        </div>

        {/* ore + avvisi */}
        <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
          <div className="card pad col" style={{ minWidth: 380 }}>
            <h3>Ore allocate (live)</h3>
            <table>
              <thead>
                <tr>
                  <th>Segretaria</th>
                  <th>Settimana</th>
                  <th>Mese</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {secretaries.map((s) => {
                  const w = weeklyHours[s.id] ?? 0;
                  const m = monthlyHours[s.id] ?? 0;
                  const wMax = s.weeklyMax || 0;
                  const wcls = wMax > 0 && w > wMax ? "bad" : wMax > 0 && w >= wMax ? "warn" : "ok";
                  const label =
                    wMax > 0 && w > wMax ? "oltre il tetto sett." : wMax > 0 && w >= wMax ? "al tetto sett." : "ok";
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span>
                      </td>
                      <td>
                        <span className={`tag ${wcls}`}>{formatHours(w)}{wMax ? ` / ${wMax}` : ""}</span>
                      </td>
                      <td className="small muted" title="ore lavorate questo mese">{formatHours(m)} h</td>
                      <td className="small muted">{label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="small muted">
              Settimana (allocate / tetto) in evidenza · Mese: ore già lavorate (solo conteggio). Tetti modificabili in{" "}
              <Link href="/manager/segretarie">Segretarie</Link>.
            </p>
          </div>

          <div className="card pad" style={{ width: 320 }}>
            <h3>Avvisi settimana</h3>
            <div className="stack">
              {days.flatMap((iso) => {
                const { open, close } = officeHours(iso);
                const dayShifts = weekShifts.filter((s) => s.date === iso);
                const gaps = coverageGaps(dayShifts, open, close);
                const out: React.ReactNode[] = [];
                if (dayShifts.length === 0) {
                  out.push(
                    <span key={`${iso}-empty`} className="tag bad">
                      ⚠ {dayShort(iso)} {dayNum(iso)} · nessun turno
                    </span>
                  );
                } else if (gaps.length > 0) {
                  out.push(
                    <span key={`${iso}-gap`} className="tag bad">
                      ⚠ {dayShort(iso)} {dayNum(iso)} · scoperto {gaps[0].start}–{gaps[0].end}
                      {gaps.length > 1 ? " …" : ""}
                    </span>
                  );
                }
                return out;
              })}
              {days.every((iso) => {
                const { open, close } = officeHours(iso);
                const dayShifts = weekShifts.filter((s) => s.date === iso);
                return dayShifts.length > 0 && coverageGaps(dayShifts, open, close).length === 0;
              }) && <span className="tag ok">✓ Tutti i giorni coperti</span>}
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
              Totale turni settimana:{" "}
              {formatHours(weekShifts.reduce((a, s) => a + durationHours(s.start, s.end), 0))} h
            </p>
          </div>
        </div>

        {/* griglia condivisibile (segretarie × giorni) */}
        <div style={{ marginTop: 16 }}>
          <WeekPoster
            weekLabel={weekLabel(monday)}
            dayHeaders={posterDayHeaders}
            secretaries={posterSecretaries}
            hasGaps={posterHasGaps}
          />
        </div>
      </div>
    </>
  );
}
