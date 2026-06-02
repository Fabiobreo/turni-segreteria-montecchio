"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveImpianto } from "@/app/manager/actions";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

type Imp = {
  id: string;
  nome: string;
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  attivo: boolean;
};

export function ImpiantoForm({ impianto }: { impianto: Imp }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Imp>({ ...impianto });

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveImpianto(form);
      if (!res.ok) { setError("Errore nel salvataggio."); return; }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Nome impianto"
        size="small"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
        sx={{ maxWidth: 320 }}
      />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
          Giorni feriali (lun–ven)
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField label="Apertura" size="small" type="time" value={form.weekdayOpen}
            onChange={(e) => setForm({ ...form, weekdayOpen: e.target.value })} sx={{ width: 130 }} />
          <Typography color="text.secondary">–</Typography>
          <TextField label="Chiusura" size="small" type="time" value={form.weekdayClose}
            onChange={(e) => setForm({ ...form, weekdayClose: e.target.value })} sx={{ width: 130 }} />
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
          Weekend (sab–dom)
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField label="Apertura" size="small" type="time" value={form.weekendOpen}
            onChange={(e) => setForm({ ...form, weekendOpen: e.target.value })} sx={{ width: 130 }} />
          <Typography color="text.secondary">–</Typography>
          <TextField label="Chiusura" size="small" type="time" value={form.weekendClose}
            onChange={(e) => setForm({ ...form, weekendClose: e.target.value })} sx={{ width: 130 }} />
        </Box>
      </Box>

      <FormControlLabel
        control={
          <Switch checked={form.attivo} onChange={(e) => setForm({ ...form, attivo: e.target.checked })} />
        }
        label="Impianto attivo (incluso nella verifica copertura)"
      />

      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
        <Button variant="contained" size="small" onClick={submit} disabled={pending}>
          {pending ? "Salvo…" : "Salva"}
        </Button>
        {saved && <Alert severity="success" sx={{ py: 0.25, fontSize: "0.8rem" }}>Salvato.</Alert>}
        {error && <Alert severity="error" sx={{ py: 0.25, fontSize: "0.8rem" }}>{error}</Alert>}
      </Box>
    </Box>
  );
}
