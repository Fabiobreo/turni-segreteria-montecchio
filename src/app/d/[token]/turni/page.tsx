import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  monthDates, monthName, monthKeyOf, toISODate, addMonthsKey,
  dayShort, dayNum, durationHours, formatHours,
} from "@/lib/time";

export default async function MyShiftsPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mese?: string }>;
}) {
  const { token } = await params;
  const { mese } = await searchParams;
  const sec = await prisma.secretary.findUnique({ where: { token } });
  if (!sec || !sec.active) notFound();

  const monthKey = mese ?? monthKeyOf(toISODate(new Date()));
  const dates = monthDates(monthKey);

  const [myShifts, allShifts, others] = await Promise.all([
    prisma.shift.findMany({ where: { secretaryId: sec.id, date: { in: dates } }, orderBy: [{ date: "asc" }, { start: "asc" }] }),
    prisma.shift.findMany({ where: { date: { in: dates } } }),
    prisma.secretary.findMany(),
  ]);

  const nameById = new Map(others.map((o) => [o.id, o.name]));
  const total = myShifts.reduce((a, s) => a + durationHours(s.start, s.end), 0);

  return (
    <div className="mobile">
      <div className="mhead">
        <div className="row" style={{ alignItems: "center" }}>
          <div className="col">
            <div className="small muted">{sec.name}</div>
            <h2 style={{ margin: 0, textTransform: "capitalize" }}>I miei turni · {monthName(monthKey)} {monthKey.slice(0, 4)}</h2>
          </div>
          <Link className="btn sm" href={`/d/${token}/turni?mese=${addMonthsKey(monthKey, -1)}`}>‹</Link>
          <Link className="btn sm" href={`/d/${token}/turni?mese=${addMonthsKey(monthKey, 1)}`}>›</Link>
        </div>
        <div className="row" style={{ marginTop: 8, gap: 8 }}>
          <span className="tag info">Ore lavorate questo mese: {formatHours(total)}h</span>
        </div>
      </div>

      <div className="mbody stack">
        {myShifts.length === 0 && <p className="muted center">Nessun turno assegnato per questo mese.</p>}

        {myShifts.map((s) => {
          // colleghi presenti nello stesso giorno
          const colleagues = allShifts
            .filter((x) => x.date === s.date && x.secretaryId !== sec.id)
            .map((x) => `${nameById.get(x.secretaryId)} ${x.start}–${x.end}`);
          return (
            <div key={s.id} className="card pad">
              <div className="row">
                <div className="date" style={{ width: 54 }}>
                  <b style={{ fontSize: 20 }}>{dayNum(s.date)}</b>
                  <span className="small muted">{dayShort(s.date)}</span>
                </div>
                <div className="col">
                  <b>{s.start} – {s.end}</b>
                  <div className="small muted">
                    {formatHours(durationHours(s.start, s.end))} ore
                    {colleagues.length ? ` · con ${colleagues.join(", ")}` : " · da sola"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <p className="center small muted">I turni li imposta la manager. Qui li vedi sempre aggiornati.</p>
      </div>

      <div className="mtab">
        <Link href={`/d/${token}`}><span className="ic">📅</span>Disponibilità</Link>
        <Link className="active" href={`/d/${token}/turni`}><span className="ic">🗓️</span>I miei turni</Link>
      </div>
    </div>
  );
}
