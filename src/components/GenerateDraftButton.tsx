"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateWeekShifts } from "@/app/manager/actions";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

/** Genera una bozza di turni per la settimana, sostituendo quelli esistenti. */
export function GenerateDraftButton({ monday }: { monday: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  function run() {
    setConfirm(false);
    startTransition(async () => {
      const res = await generateWeekShifts({ monday });
      if (res.ok) {
        setToast({ msg: `Bozza generata: ${res.count} turni proposti. Rifinisci a mano dove serve.`, severity: "success" });
        router.refresh();
      } else {
        setToast({ msg: res.error ?? "Errore nella generazione.", severity: "error" });
      }
    });
  }

  return (
    <>
      <Button variant="contained" size="small" color="secondary" disabled={pending} onClick={() => setConfirm(true)}>
        {pending ? "Genero…" : "✨ Genera bozza"}
      </Button>

      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>Generare la bozza della settimana?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Verranno <strong>sostituiti tutti i turni di questa settimana</strong>{" "}
            con una proposta automatica basata sulle disponibilità, sui tetti ore e sugli orari d&apos;ufficio.
            Una sola persona per fascia (il raddoppio lo aggiungi tu). L&apos;azione non è reversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)} disabled={pending}>Annulla</Button>
          <Button variant="contained" color="secondary" onClick={run} disabled={pending}>
            {pending ? "Genero…" : "Genera bozza"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={toast?.severity === "error" ? null : 5000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">{toast.msg}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
