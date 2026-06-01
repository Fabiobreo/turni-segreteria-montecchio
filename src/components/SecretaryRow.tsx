"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSecretary, deleteSecretary } from "@/app/manager/actions";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";

export { COLORS } from "@/lib/colors";
import { COLORS } from "@/lib/colors";

type Sec = { id: string; name: string; color: string; contractType: string; weeklyMax: number; token: string };

export function SecretaryRow({ sec, baseUrl }: { sec: Sec; baseUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [f, setF] = useState({ name: sec.name, contractType: sec.contractType, weeklyMax: sec.weeklyMax, color: sec.color });
  const link = `${baseUrl}/d/${sec.token}`;

  function cancel() {
    setF({ name: sec.name, contractType: sec.contractType, weeklyMax: sec.weeklyMax, color: sec.color });
    setEditing(false); setSaved(false);
  }

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateSecretary({ id: sec.id, name: f.name, contractType: f.contractType as "fisso" | "a_chiamata", weeklyMax: Number(f.weeklyMax), color: f.color });
      setSaved(true); setEditing(false); router.refresh();
    });
  }

  const colorHex = COLORS.find((c) => c.key === (editing ? f.color : sec.color))?.hex ?? "#999";

  return (
    <Paper sx={{ p: 2 }}>
      {/* riga principale */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Chip
          label={editing ? (f.name || sec.name) : sec.name}
          sx={{ bgcolor: colorHex, color: "#fff", fontWeight: 700, fontSize: "0.875rem", height: 32 }}
        />
        {!editing && (
          <>
            <Typography variant="body2" color="text.secondary">
              {sec.contractType === "fisso" ? "Fisso" : "A chiamata"}
            </Typography>
            <Typography variant="body2" color="text.secondary">·</Typography>
            <Typography variant="body2" color="text.secondary">
              {sec.weeklyMax ? `${sec.weeklyMax} h/sett` : "Nessun tetto"}
            </Typography>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        {!editing && (
          <>
            <Button size="small" variant="outlined" onClick={() => setEditing(true)}>✏️ Modifica</Button>
            <Button size="small" variant="outlined" color="error" onClick={() => setConfirmDelete(true)}>Elimina</Button>
          </>
        )}
      </Box>

      {/* form modifica */}
      {editing && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
            <TextField label="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} sx={{ width: 160 }} />
            <TextField select label="Contratto" value={f.contractType} onChange={(e) => setF({ ...f, contractType: e.target.value })} sx={{ width: 150 }}>
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button size="small" variant="outlined" onClick={cancel} disabled={pending}>Annulla</Button>
            <Button size="small" variant="contained" onClick={save} disabled={pending}>
              {pending ? "Salvo…" : "Salva"}
            </Button>
          </Box>
        </Box>
      )}

      {/* link personale */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">🔗</Typography>
        <Typography component="code" variant="caption" sx={{ bgcolor: "#f3f4f6", px: 1, py: 0.25, borderRadius: 1.5, wordBreak: "break-all" }}>
          {link}
        </Typography>
        <CopyButton text={link} />
      </Box>

      {saved && <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.5 }}>✓ Modifiche salvate</Typography>}

      {/* Dialog conferma eliminazione */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Eliminare {sec.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Questa azione elimina la segretaria e <strong>tutti i suoi turni e disponibilità</strong>.
            Non è reversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={pending}>Annulla</Button>
          <Button
            color="error"
            variant="contained"
            disabled={pending}
            onClick={() => {
              setConfirmDelete(false);
              startTransition(async () => {
                await deleteSecretary(sec.id);
                router.refresh();
              });
            }}
          >
            {pending ? "Elimino…" : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {COLORS.map((c) => (
        <Box
          key={c.key}
          component="button"
          type="button"
          onClick={() => onChange(c.key)}
          title={c.label}
          sx={{
            width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer",
            bgcolor: c.hex,
            outline: value === c.key ? `3px solid ${c.hex}` : "3px solid transparent",
            outlineOffset: 2,
            opacity: value === c.key ? 1 : 0.5,
            transition: "opacity .15s, outline .15s",
            p: 0,
          }}
        />
      ))}
    </Box>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button size="small" variant="text" sx={{ fontSize: "0.75rem", py: 0 }}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }
        catch {}
      }}>
      {done ? "✓ Copiato" : "Copia link"}
    </Button>
  );
}
