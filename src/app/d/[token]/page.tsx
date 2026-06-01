import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { monthDates, monthName, monthKeyOf, toISODate } from "@/lib/time";
import { officeHours } from "@/lib/office";

export default async function AvailabilityPage({
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

  const availabilities = await prisma.availability.findMany({
    where: { secretaryId: sec.id, date: { in: dates } },
  });
  const availMap: Record<string, { status: string; start: string | null; end: string | null; note: string | null }> = {};
  for (const a of availabilities) availMap[a.date] = { status: a.status, start: a.start, end: a.end, note: a.note };

  const days = dates.map((iso) => {
    const { open, close } = officeHours(iso);
    return { iso, open, close };
  });

  return (
    <AvailabilityEditor
      key={monthKey}
      token={token}
      name={sec.name}
      monthKey={monthKey}
      monthLabel={`${monthName(monthKey)} ${monthKey.slice(0, 4)}`}
      days={days}
      initial={availMap}
    />
  );
}
