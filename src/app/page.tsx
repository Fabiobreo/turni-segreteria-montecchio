import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function Home() {
  return (
    <Box sx={{ maxWidth: 520, mx: "auto", px: 3, pt: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <div className="brand-dot" />
          <Typography variant="h2" component="h1">Gestione Turni — Segreteria</Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Le segretarie accedono dal proprio link personale. La manager entra nell&apos;area
          completa con la password.
        </Typography>
        <Button href="/manager" variant="contained" size="medium">
          Area manager →
        </Button>
      </Paper>
    </Box>
  );
}
