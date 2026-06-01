import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { PrintButton } from "@/components/PrintButton";
import { MultiWeekPoster, type MWPWeek } from "@/components/MultiWeekPoster";
import { officeHours, ACTIVE_SEASON } from "@/lib/office";
import { coverageGaps, hoursBySecretary } from "@/lib/coverage";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey, addDays,
  mondayOf, weekDates, weekLabel, dayShort, dayNum,
  isWeekend, formatHours, durationHours,
} from "@/lib/time";

export default async function RiepilogoPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  await requireManager();
  const { mese } = await searchParams;
  const monthKey = mese ?? monthKeyOf(toISODate(new Date()));
  const dates = monthDates(monthKey);
  const monthDatesSet = new Set(dates);

  const [secretaries, shifts] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } }, orderBy: { start: "asc" } }),
  ]);
  const monthlyHours = hoursBySecretary(shifts);

  const totalHours = shifts.reduce((a, s) => a + durationHours(s.start, s.end), 0);
  const daysWithGaps = dates.filter((iso) => {
    const ds = shifts.filter((s) => s.date === iso);
    if (!ds.length) return false;
    const { open, close } = officeHours(iso);
    return coverageGaps(ds, open, close).length > 0;
  });
  const label = `${monthName(monthKey)} ${monthKey.slice(0, 4)}`;

  // Settimane del mese per la griglia condivisibile.
  // Prima settimana: lunedì che contiene il primo giorno del mese.
  // Giorni fuori dal mese (es. aprile nella prima settimana di maggio) restano grigi.
  const posterWeeks: MWPWeek[] = [];
  let wStart = mondayOf(dates[0]);
  while (wStart <= dates[dates.length - 1]) {
    const wd = weekDates(wStart);
    const weekShifts = shifts.filter((s) => wd.includes(s.date));
    const weeklyHours = hoursBySecretary(weekShifts);
    posterWeeks.push({
      label: weekLabel(wStart),
      dayHeaders: wd.map((iso) => ({
        num: dayNum(iso),
        name: dayShort(iso),
        weekend: isWeekend(iso),
        inMonth: monthDatesSet.has(iso),
      })),
      secretaries: secretaries.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        weekHours: formatHours(weeklyHours[s.id] ?? 0),
        days: wd.map((iso) =>
          weekShifts
            .filter((sh) => sh.date === iso && sh.secretaryId === s.id)
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((sh) => ({ start: sh.start, end: sh.end }))
        ),
      })),
      hasGaps: wd.some((iso) => {
        if (!monthDatesSet.has(iso)) return false;
        const ds = weekShifts.filter((sh) => sh.date === iso);
        const { open, close } = officeHours(iso);
        return ds.length === 0 || coverageGaps(ds, open, close).length > 0;
      }),
    });
    wStart = addDays(wStart, 7);
  }

  return (
    <>
      <ManagerTop active="riepilogo" />
      <div className="wrap">
        <div className="row" style={{ alignItems: "center", marginBottom: 14 }}>
          <div className="col">
            <div className="small muted">Riepilogo mensile</div>
            <h1 style={{ margin: 0, textTransform: "capitalize" }}>{label}</h1>
          </div>
          <Link className="btn" href={`/manager/riepilogo?mese=${addMonthsKey(monthKey, -1)}`}>‹</Link>
          <Link className="btn" href={`/manager/riepilogo?mese=${addMonthsKey(monthKey, 1)}`}>›</Link>
          <PrintButton />
        </div>

        <div className="row">
          <div className="col">
            <div className="card pad">
              <h3>Ore lavorate per segretaria</h3>
              <table>
                <thead>
                  <tr><th>Segretaria</th><th>Contratto</th><th>Tetto/sett.</th><th>Ore mese</th></tr>
                </thead>
                <tbody>
                  {secretaries.map((s) => {
                    const done = monthlyHours[s.id] ?? 0;
                    return (
                      <tr key={s.id}>
                        <td><span className={`chip ${s.color}`} style={{ display: "inline" }}>{s.name}</span></td>
                        <td>{s.contractType === "fisso" ? "Fisso" : "A chiamata"}</td>
                        <td>{s.weeklyMax ? `${s.weeklyMax} h` : "—"}</td>
                        <td><b>{formatHours(done)} h</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="small muted">Conteggio delle ore effettivamente assegnate nel mese. Il limite è settimanale (vedi colonna Tetto).</p>
            </div>
          </div>

          <div style={{ width: 300 }}>
            <div className="card pad stack center">
              <h3>Totali</h3>
              <div><div className="kpi">{formatHours(totalHours)} h</div><div className="small muted">ore pianificate</div></div>
              <hr className="soft" />
              <div>
                <div className="kpi" style={{ color: daysWithGaps.length ? "var(--red)" : "var(--green)" }}>
                  {daysWithGaps.length}
                </div>
                <div className="small muted">giorni con fasce scoperte</div>
              </div>
              {daysWithGaps.length > 0 && (
                <div className="note" style={{ textAlign: "left" }}>
                  Risolvi i giorni {daysWithGaps.map((d) => dayNum(d)).join(", ")} prima di condividere.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <MultiWeekPoster monthLabel={label} weeks={posterWeeks} />
        </div>
      </div>
    </>
  );
}
