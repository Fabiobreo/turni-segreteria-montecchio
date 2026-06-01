import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { officeHours } from "@/lib/office";
import { hoursBySecretary } from "@/lib/coverage";
import { DayEditor } from "@/components/DayEditor";
import { dayLong, dayNum, monthName, monthKeyOf, addDays, mondayOf, weekDates, weekLabel } from "@/lib/time";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  await requireManager();
  const { date } = await params;
  const { open, close } = officeHours(date);
  const monthKey = monthKeyOf(date);
  const week = weekDates(mondayOf(date));

  const [secretaries, shifts, availabilities, monthShifts, weekShifts] = await Promise.all([
    prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    prisma.shift.findMany({ where: { date }, orderBy: { start: "asc" } }),
    prisma.availability.findMany({ where: { date } }),
    prisma.shift.findMany({ where: { date: { startsWith: monthKey } } }),
    prisma.shift.findMany({ where: { date: { in: week } } }),
  ]);

  const monthlyHours = hoursBySecretary(monthShifts);
  const weeklyHours = hoursBySecretary(weekShifts);
  const title = `${dayLong(date)} ${dayNum(date)} ${monthName(monthKey)} ${monthKey.slice(0, 4)}`;

  return (
    <>
      <ManagerTop />
      <div className="wrap">
        <div className="row" style={{ alignItems: "center", marginBottom: 6 }}>
          <div className="col">
            <div className="small muted">Costruzione giorno · ufficio {open}–{close}</div>
            <h1 style={{ margin: 0, textTransform: "capitalize" }}>{title}</h1>
          </div>
          <Link className="btn" href={`/manager/giorno/${addDays(date, -1)}`}>
            ‹ Giorno prec.
          </Link>
          <Link className="btn" href={`/manager/giorno/${addDays(date, 1)}`}>
            Giorno succ. ›
          </Link>
        </div>

        <DayEditor
          date={date}
          open={open}
          close={close}
          weekLabel={weekLabel(mondayOf(date))}
          secretaries={secretaries.map((s) => ({
            id: s.id, name: s.name, color: s.color, weeklyMax: s.weeklyMax,
          }))}
          shifts={shifts.map((s) => ({ id: s.id, secretaryId: s.secretaryId, start: s.start, end: s.end }))}
          availabilities={availabilities.map((a) => ({
            secretaryId: a.secretaryId, status: a.status, start: a.start, end: a.end, note: a.note,
          }))}
          monthlyHours={monthlyHours}
          weeklyHours={weeklyHours}
        />
      </div>
    </>
  );
}
