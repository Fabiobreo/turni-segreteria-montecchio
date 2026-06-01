"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSecretary } from "@/app/manager/actions";
import { ColorPicker } from "./SecretaryRow";
import { COLORS } from "@/lib/colors";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export function SecretaryAddForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", contractType: "a_chiamata" as "fisso" | "a_chiamata", weeklyMax: 0, color: COLORS[5].key });

  function reset() {
    setF({ name: "", contractType: "a_chiamata", weeklyMax: 0, color: COLORS[5].key });
    setError(null); setOpen(false);
  }

  function submit() {
    setError(null);
    if (!f.name.trim()) { setError("Inserisci un nome."); return; }
    startTransition(async () => {
      const res = await addSecretary(f);
      if (!res.ok) { setError(res.error ?? "Errore."); return; }
      reset(); router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="contained" size="small" onClick={() => setOpen(true)}>
        + Aggiungi segretaria
      </Button>
    );
  }

  return (
    <Paper sx={{ p: 2, mt: 2, width: "100%", border: "2px solid", borderColor: "primary.main" }}>
      <Typography variant="h3" sx={{ mb: 2 }}>Nuova segretaria</Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
        <TextField label="Nome" placeholder="Es. Giulia" autoFocus value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submit()} sx={{ width: 180 }} />
        <TextField select label="Contratto" value={f.contractType}
          onChange={(e) => setF({ ...f, contractType: e.target.value as "fisso" | "a_chiamata" })} sx={{ width: 150 }}>
          <MenuItem value="fisso">Fisso</MenuItem>
          <MenuItem value="a_chiamata">A chiamata</MenuItem>
        </TextField>
        <TextField label="Tetto ore/sett." type="number" slotProps={{ htmlInput: { min: 0, max: 60 } }} value={f.weeklyMax}
          onChange={(e) => setF({ ...f, weeklyMax: Number(e.target.value) })} sx={{ width: 130 }} />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Colore</Typography>
        <ColorPicker value={f.color} onChange={(c) => setF({ ...f, color: c })} />
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        <Button size="small" variant="outlined" onClick={reset} disabled={pending}>Annulla</Button>
        <Button size="small" variant="contained" onClick={submit} disabled={pending}>
          {pending ? "Aggiungo…" : "+ Aggiungi"}
        </Button>
      </Box>
    </Paper>
  );
}
