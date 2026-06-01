"use client";

import Button from "@mui/material/Button";
import PrintIcon from "@mui/icons-material/Print";

export function PrintButton() {
  return (
    <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>
      Stampa / PDF
    </Button>
  );
}
