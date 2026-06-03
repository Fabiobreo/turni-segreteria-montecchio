import { Suspense } from "react";
import { headers } from "next/headers";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { SecretaryRow } from "@/components/SecretaryRow";
import { SecretaryAddForm } from "@/components/SecretaryAddForm";
import { SecretariesListSkeleton } from "@/components/skeletons";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export default async function SecretariesPage() {
  await requireManager();

  return (
    <>
      <ManagerTop active="segretarie" />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", mb: 3, gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Impostazioni</Typography>
            <Typography variant="h1" component="h1">Segretarie</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Modifica nome, contratto e tetto ore settimanale. Il link personale va inviato via WhatsApp.
            </Typography>
          </Box>
          <SecretaryAddForm />
        </Box>

        <Suspense fallback={<SecretariesListSkeleton />}>
          <SecretariesList />
        </Suspense>
      </Container>
    </>
  );
}

/** Elenco segretarie attive con link personale. */
async function SecretariesList() {
  const secretaries = await prisma.secretary.findMany({ where: { active: true }, orderBy: { sort: "asc" } });

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  return (
    <Stack spacing={1.5}>
      {secretaries.map((s) => (
        <SecretaryRow
          key={s.id}
          baseUrl={baseUrl}
          sec={{
            id: s.id, name: s.name, color: s.color,
            contractType: s.contractType, weeklyMax: s.weeklyMax, token: s.token,
          }}
        />
      ))}
      {secretaries.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Nessuna segretaria attiva. Usa il pulsante qui sopra per aggiungerne una.
        </Typography>
      )}
    </Stack>
  );
}
