import { redirect } from "next/navigation";
import { login, isManager } from "@/lib/auth";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const ok = await login(password);
  if (ok) redirect("/manager");
  redirect("/manager/login?errore=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  if (await isManager()) redirect("/manager");
  const { errore } = await searchParams;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #dbeafe 0%, #f0f4ff 40%, #f9fafb 100%)",
        px: 2,
        py: 6,
      }}
    >
      {/* Brand sopra il card */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 56, height: 56, borderRadius: "16px",
            background: "linear-gradient(135deg, #2f6df6, #7aa6ff)",
            boxShadow: "0 8px 24px rgba(47,109,246,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <LockOutlinedIcon sx={{ color: "#fff", fontSize: 28 }} />
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h1" sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#1f2430", lineHeight: 1.2 }}>
            Gestione Turni
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Area manager
          </Typography>
        </Box>
      </Box>

      {/* Card */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 400,
          borderRadius: "20px",
          boxShadow: "0 4px 32px rgba(47,109,246,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Header card */}
        <Box sx={{ bgcolor: "#f5f8ff", borderBottom: "1px solid #e5e7eb", px: 3.5, py: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#1f2430" }}>
            Accedi con la tua password
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sessione valida 30 giorni
          </Typography>
        </Box>

        {/* Form */}
        <Box sx={{ px: 3.5, py: 3 }}>
          <form action={loginAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {errore && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                Password errata. Riprova.
              </Alert>
            )}
            <TextField
              type="password"
              name="password"
              label="Password"
              autoFocus
              required
              fullWidth
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{
                borderRadius: "10px",
                fontWeight: 700,
                py: 1.25,
                fontSize: "1rem",
                boxShadow: "0 4px 14px rgba(47,109,246,0.35)",
                "&:hover": { boxShadow: "0 6px 20px rgba(47,109,246,0.45)" },
              }}
            >
              Entra
            </Button>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
