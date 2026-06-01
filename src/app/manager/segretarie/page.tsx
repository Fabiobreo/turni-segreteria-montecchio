import { headers } from "next/headers";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { SecretaryRow } from "@/components/SecretaryRow";

export default async function SecretariesPage() {
  await requireManager();
  const secretaries = await prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } });

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  return (
    <>
      <ManagerTop active="segretarie" />
      <div className="wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="small muted">Impostazioni</div>
          <h1 style={{ margin: 0 }}>Segretarie</h1>
          <p className="muted small">
            Nome, contratto e <b>tetto ore settimanali</b> usato negli avvisi durante la costruzione.
            Da qui copi anche il link personale da inviare a ciascuna.
          </p>
        </div>
        <div className="stack">
          {secretaries.map((s) => (
            <SecretaryRow
              key={s.id}
              baseUrl={baseUrl}
              sec={{
                id: s.id, name: s.name, color: s.color, contractType: s.contractType,
                weeklyMax: s.weeklyMax, token: s.token,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
