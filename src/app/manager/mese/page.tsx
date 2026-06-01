import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { officeHours } from "@/lib/office";
import { coverageGaps, hoursBySecretary } from "@/lib/coverage";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey,
  parseDate, isWeekend, formatHours,
} from "@/lib/time";

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  await requireManager();
  const { mese } = await searchParams;
  const monthKey = mese ?? monthKeyOf(toISODate(new Date()));
  const dates = monthDates(monthKey);

  const [secretaries, shifts] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } }, orderBy: { start: "asc" } }),
  ]);
  const secById = new Map(secretaries.map((s) => [s.id, s]));
  const monthlyHours = hoursBySecretary(shifts);

  const firstDow = parseDate(dates[0]).getDay(); // 0=dom
  const leading = (firstDow + 6) % 7; // celle vuote prima del giorno 1 (lun=0)
  const today = toISODate(new Date());

  let built = 0;
  let withGaps = 0;
  for (const iso of dates) {
    const ds = shifts.filter((s) => s.date === iso);
    if (ds.length > 0) {
      built++;
      const { open, close } = officeHours(iso);
      if (coverageGaps(ds, open, close).length > 0) withGaps++;
    }
  }

  return (
    <>
      <ManagerTop active="mese" />
      <div className="wrap">
        <div className="row" style={{ alignItems: "center", marginBottom: 14 }}>
          <div className="col">
            <div className="small muted">Panoramica mese</div>
            <h1 style={{ margin: 0, textTransform: "capitalize" }}>{monthName(monthKey)} {monthKey.slice(0, 4)}</h1>
          </div>
          <Link className="btn" href={`/manager/mese?mese=${addMonthsKey(monthKey, -1)}`}>‹ Mese prec.</Link>
          <Link className="btn" href={`/manager/mese?mese=${addMonthsKey(monthKey, 1)}`}>Mese succ. ›</Link>
        </div>

        <div className="row">
          <div className="col">
            <div className="card pad">
              <div className="row" style={{ marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
                <span className="small muted">Legenda:</span>
                {secretaries.map((s) => (
                  <span key={s.id} className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span>
                ))}
              </div>
              <div className="grid">
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
                  <div key={d} className="gh">{d}</div>
                ))}
                {Array.from({ length: leading }).map((_, i) => (
                  <div key={`lead-${i}`} className="cell out" />
                ))}
                {dates.map((iso) => {
                  const ds = shifts.filter((s) => s.date === iso);
                  const { open, close } = officeHours(iso);
                  const gaps = ds.length ? coverageGaps(ds, open, close) : [];
                  return (
                    <Link
                      key={iso}
                      href={`/manager/giorno/${iso}`}
                      className={`cell${isWeekend(iso) ? " we" : ""}${iso === today ? " today" : ""}`}
                    >
                      <div className="d">{parseDate(iso).getDate()}</div>
                      {ds.map((s) => {
                        const sec = secById.get(s.secretaryId);
                        return (
                          <span key={s.id} className={`chip ${sec?.color ?? ""}`}>
                            {sec?.name} {s.start}–{s.end}
                          </span>
                        );
                      })}
                      {gaps.length > 0 && <div className="gap">⚠ scoperto {gaps[0].start}–{gaps[0].end}</div>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ width: 280 }}>
            <div className="card pad stack">
              <h3>Stato mese</h3>
              <div className="row">
                <div className="col"><div className="kpi">{built}</div><div className="small muted">giorni costruiti</div></div>
                <div className="col"><div className="kpi" style={{ color: "var(--red)" }}>{withGaps}</div><div className="small muted">con buchi</div></div>
              </div>
              <hr className="soft" />
              <div className="small muted">Ore lavorate nel mese</div>
              <table>
                <tbody>
                  {secretaries.map((s) => {
                    const done = monthlyHours[s.id] ?? 0;
                    return (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td><b>{formatHours(done)} h</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Link className="btn" href={`/manager/riepilogo?mese=${monthKey}`}>Riepilogo completo ▸</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
