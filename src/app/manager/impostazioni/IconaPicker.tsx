"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// Icone suggerite per gli impianti (la manager può comunque digitarne una a mano).
const SUGGERITE = ["☀️", "❄️", "🏊", "💧", "🌊", "🏖️", "🎿", "⛱️", "🏢", "🏟️"];

/** Selettore icona: scelte rapide + campo libero per un'emoji a piacere. */
export function IconaPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
        Icona
      </Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        {SUGGERITE.map((emoji) => (
          <Box
            key={emoji}
            component="button"
            type="button"
            onClick={() => onChange(emoji)}
            sx={{
              width: 36, height: 36, fontSize: 18, lineHeight: 1, cursor: "pointer",
              borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: value === emoji ? "primary.main" : "background.paper",
              border: "1px solid", borderColor: value === emoji ? "primary.main" : "divider",
            }}
          >
            {emoji}
          </Box>
        ))}
        <TextField
          size="small"
          label="Altra"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 8))}
          sx={{ width: 80 }}
          slotProps={{ htmlInput: { style: { fontSize: 18, textAlign: "center" } } }}
        />
      </Box>
    </Box>
  );
}
