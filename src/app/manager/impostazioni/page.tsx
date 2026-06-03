import { Suspense } from "react";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { ImpiantoForm } from "./ImpiantoForm";
import { ImpiantiListSkeleton } from "@/components/skeletons";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";

export default async function ImpostazioniPage() {
  await requireManager();

  return (
    <>
      <ManagerTop active="impostazioni" />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="body2" color="text.secondary">Impostazioni</Typography>
        <Typography variant="h1" component="h1" sx={{ mb: 3 }}>Impianti e orari</Typography>

        <Suspense fallback={<ImpiantiListSkeleton />}>
          <ImpiantiList />
        </Suspense>

        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Modifica nome, orari di apertura/chiusura e stato (attivo/inattivo) di ciascun impianto.
            Gli orari cambiano solo dopo aver salvato. I turni già assegnati non vengono modificati.
          </Typography>
        </Box>
      </Container>
    </>
  );
}

/** Elenco impianti con form di modifica orari. */
async function ImpiantiList() {
  const impianti = await prisma.impianto.findMany({ orderBy: { sort: "asc" } });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {impianti.map((imp) => (
        <Paper key={imp.id} sx={{ p: 3 }}>
          <Typography variant="h3" sx={{ mb: 0.5 }}>{imp.nome}</Typography>
          <Typography variant="caption" color="text.secondary">ID: {imp.id}</Typography>
          <Divider sx={{ my: 2 }} />
          <ImpiantoForm impianto={imp} />
        </Paper>
      ))}

      {impianti.length === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            Nessun impianto trovato. Esegui <code>npm run db:seed</code> per creare i due impianti.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
