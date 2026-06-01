import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { ButtonLink } from "@/components/ButtonLink";
import { logoutAction } from "@/app/manager/actions";
import { ACTIVE_SEASON } from "@/lib/office";

type Tab = "settimana" | "mese" | "riepilogo" | "segretarie";

export function ManagerTop({ active, right }: { active?: Tab; right?: React.ReactNode }) {
  const navLink = (tab: Tab, href: string, label: string) => (
    <ButtonLink
      key={tab}
      href={href}
      size="small"
      variant={active === tab ? "contained" : "text"}
      disableElevation
      sx={{ textTransform: "none", fontWeight: 600 }}
    >
      {label}
    </ButtonLink>
  );

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 1.5, flexWrap: "wrap", minHeight: { xs: 56 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <div className="brand-dot" />
          <Typography sx={{ fontWeight: 700, fontSize: "0.9375rem" }} noWrap>
            Gestione Turni
          </Typography>
          <Chip label="Manager" size="small" color="primary" variant="outlined" sx={{ fontSize: 11 }} />
        </Box>

        <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
          {navLink("settimana", "/manager",           "Settimana")}
          {navLink("mese",      "/manager/mese",       "Mese")}
          {navLink("riepilogo", "/manager/riepilogo",  "Riepilogo ore")}
          {navLink("segretarie","/manager/segretarie", "Segretarie")}
        </Box>

        <Box sx={{ flex: 1 }} />
        {right}

        <Chip
          label={ACTIVE_SEASON}
          size="small"
          sx={{ textTransform: "capitalize", bgcolor: "#f3f4f6", fontSize: 11 }}
        />

        <form action={logoutAction}>
          <Button type="submit" size="small" variant="text" sx={{ color: "text.secondary" }}>
            Esci
          </Button>
        </form>
      </Toolbar>
    </AppBar>
  );
}
