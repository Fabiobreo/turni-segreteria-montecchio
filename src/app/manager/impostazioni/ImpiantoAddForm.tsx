"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createImpianto } from "@/app/manager/actions";
import { IconaPicker } from "./IconaPicker";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

const DEFAULTS = {
  nome: "",
  icona: "🏢",
  weekdayOpen: "08:00",
  weekdayClose: "20:30",
  weekendOpen: "09:00",
  weekendClose: "19:30",
  attivo: true,
};

export function ImpiantoAddForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ ...DEFAULTS });

  function reset() {
    setF({ ...DEFAULTS });
    setError(null);
    setOpen(false);
  }

  function submit() {
    setError(null);
    if (!f.nome.trim()) { setError("Inserisci un nome."); return; }
    startTransition(async () => {
      const res = await createImpianto(f);
      if (!res.ok) { setError(res.error ?? "Errore."); return; }
      reset(); router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="contained" size="small" onClick={() => setOpen(true)}>
        + Aggiungi impianto
      </Button>
    );
  }

  return (
    <Paper sx={{ p: 3, width: "100%", border: "2px solid", borderColor: "primary.main" }}>
      <Typography variant="h3" sx={{ mb: 2 }}>Nuovo impianto</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Nome impianto" placeholder="Es. Piscina comunale" autoFocus size="small"
          value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submit()} sx={{ maxWidth: 320 }} />

        <IconaPicker value={f.icona} onChange={(icona) => setF({ ...f, icona })} />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
            Giorni feriali (lun–ven)
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <TextField label="Apertura" size="small" type="time" value={f.weekdayOpen}
              onChange={(e) => setF({ ...f, weekdayOpen: e.target.value })} sx={{ width: 130 }} />
            <Typography color="text.secondary">–</Typography>
            <TextField label="Chiusura" size="small" type="time" value={f.weekdayClose}
              onChange={(e) => setF({ ...f, weekdayClose: e.target.value })} sx={{ width: 130 }} />
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
            Weekend (sab–dom)
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <TextField label="Apertura" size="small" type="time" value={f.weekendOpen}
              onChange={(e) => setF({ ...f, weekendOpen: e.target.value })} sx={{ width: 130 }} />
            <Typography color="text.secondary">–</Typography>
            <TextField label="Chiusura" size="small" type="time" value={f.weekendClose}
              onChange={(e) => setF({ ...f, weekendClose: e.target.value })} sx={{ width: 130 }} />
          </Box>
        </Box>

        <FormControlLabel
          control={<Switch checked={f.attivo} onChange={(e) => setF({ ...f, attivo: e.target.checked })} />}
          label="Impianto attivo (incluso nella verifica copertura)"
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={reset} disabled={pending}>Annulla</Button>
          <Button size="small" variant="contained" onClick={submit} disabled={pending}>
            {pending ? "Aggiungo…" : "+ Aggiungi"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
