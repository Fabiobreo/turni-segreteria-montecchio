import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { monthDates, monthName, monthKeyOf, toISODate } from "@/lib/time";
import { parseSlots } from "@/lib/validation";
import { referenceHours } from "@/lib/office";

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

  const [availabilities, impianti] = await Promise.all([
    prisma.availability.findMany({ where: { secretaryId: sec.id, date: { in: dates } } }),
    prisma.impianto.findMany({ orderBy: { sort: "asc" } }),
  ]);

  type Slot = { start: string; end: string };
  const availMap: Record<string, { status: string; slots: Slot[]; note: string | null }> = {};
  for (const a of availabilities) {
    availMap[a.date] = {
      status: a.status,
      slots: parseSlots(a.slots),
      note: a.note,
    };
  }

  const days = dates.map((iso) => {
    const { open, close } = referenceHours(iso, impianti);
    return { iso, open, close };
  });

  return (
    <AvailabilityEditor
      key={monthKey}
      token={token}
      name={sec.name}
      secColor={sec.color}
      monthKey={monthKey}
      monthLabel={`${monthName(monthKey)} ${monthKey.slice(0, 4)}`}
      days={days}
      initial={availMap}
    />
  );
}
