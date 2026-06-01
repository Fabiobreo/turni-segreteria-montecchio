import { redirect } from "next/navigation";
import { login, isManager } from "@/lib/auth";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

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
    <Box sx={{ maxWidth: 400, mx: "auto", px: 3, pt: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
          <div className="brand-dot" />
          <Typography variant="h2" component="h1">Area manager</Typography>
        </Box>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
          Inserisci la password per gestire i turni.
        </Typography>

        <form action={loginAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {errore && <Alert severity="error">Password errata. Riprova.</Alert>}
          <TextField
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            required
            fullWidth
          />
          <Button type="submit" variant="contained" fullWidth>
            Entra
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
