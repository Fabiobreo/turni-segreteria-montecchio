import { cookies } from "next/headers";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerTop } from "@/components/ManagerTop";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { NOTIF_SEEN_COOKIE } from "@/lib/constants";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

const AZIONE: Record<string, { label: string; color: "success" | "info" | "error" }> = {
  create: { label: "Nuova", color: "success" },
  update: { label: "Modifica", color: "info" },
  delete: { label: "Cancellata", color: "error" },
};

function quando(at: Date): string {
  return at.toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function NotifichePage() {
  await requireManager();

  const store = await cookies();
  const seenRaw = store.get(NOTIF_SEEN_COOKIE)?.value;
  const seen = seenRaw ? new Date(seenRaw) : new Date(0);

  const logs = await prisma.auditLog.findMany({
    where: { entity: "availability" },
    orderBy: { at: "desc" },
    take: 100,
  });

  return (
    <>
      <ManagerTop />
      <MarkNotificationsRead />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="body2" color="text.secondary">Notifiche</Typography>
        <Typography variant="h1" component="h1" sx={{ mb: 0.5 }}>Modifiche disponibilità</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Chi ha cambiato cosa e quando. Le voci evidenziate sono nuove dall&apos;ultima visita.
        </Typography>

        {logs.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">Nessuna modifica registrata.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1}>
            {logs.map((log) => {
              const unread = log.at > seen;
              const az = AZIONE[log.action] ?? { label: log.action, color: "info" as const };
              return (
                <Paper
                  key={log.id}
                  sx={{
                    p: 1.75,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    borderLeft: unread ? "4px solid" : "4px solid transparent",
                    borderLeftColor: unread ? "warning.main" : "transparent",
                    bgcolor: unread ? "var(--brand-soft, #fff8e1)" : "background.paper",
                  }}
                >
                  <Chip label={az.label} size="small" color={az.color} variant="outlined" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: unread ? 600 : 400 }}>
                      {log.summary}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {quando(log.at)}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Container>
    </>
  );
}
