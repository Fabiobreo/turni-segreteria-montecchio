import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import CalendarViewWeekRoundedIcon from "@mui/icons-material/CalendarViewWeekRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { ButtonLink } from "@/components/ButtonLink";
import { logoutAction } from "@/app/manager/actions";

type Tab = "settimana" | "mese" | "riepilogo" | "segretarie" | "impostazioni";

const TABS: { tab: Tab; href: string; label: string; short: string; icon: React.ReactNode }[] = [
  { tab: "settimana",    href: "/manager",              label: "Settimana",     short: "Settimana", icon: <CalendarViewWeekRoundedIcon /> },
  { tab: "mese",         href: "/manager/mese",         label: "Mese",          short: "Mese",      icon: <CalendarMonthRoundedIcon /> },
  { tab: "riepilogo",    href: "/manager/riepilogo",    label: "Riepilogo ore", short: "Riepilogo", icon: <BarChartRoundedIcon /> },
  { tab: "segretarie",   href: "/manager/segretarie",   label: "Segretarie",    short: "Segretarie", icon: <GroupRoundedIcon /> },
  { tab: "impostazioni", href: "/manager/impostazioni", label: "Impostazioni",  short: "Impostazioni", icon: <SettingsRoundedIcon /> },
];

export function ManagerTop({ active, right }: { active?: Tab; right?: React.ReactNode }) {
  const navLink = (
    { tab, href, label, icon }: { tab: Tab; href: string; label: string; icon: React.ReactNode },
    withIcon = true,
  ) => {
    const isActive = active === tab;
    return (
      <ButtonLink
        key={tab}
        href={href}
        size="small"
        disableElevation
        startIcon={withIcon ? icon : undefined}
        sx={{
          textTransform: "none",
          fontWeight: isActive ? 700 : 500,
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontSize: "0.8125rem",
          borderRadius: 2,
          px: 1.25,
          py: 0.5,
          "& .MuiButton-startIcon": { mr: 0.5, "& svg": { fontSize: 18 } },
          color: isActive ? "primary.main" : "text.secondary",
          bgcolor: isActive ? "var(--brand-soft)" : "transparent",
          "&:hover": {
            bgcolor: isActive ? "var(--brand-soft)" : "action.hover",
            color: isActive ? "primary.main" : "text.primary",
          },
        }}
      >
        {label}
      </ButtonLink>
    );
  };

  const logoutBtn = (
    <form action={logoutAction}>
      <Button
        type="submit"
        size="small"
        startIcon={<LogoutRoundedIcon />}
        sx={{
          color: "text.secondary",
          fontSize: "0.8125rem",
          fontWeight: 500,
          textTransform: "none",
          borderRadius: 2,
          px: 1.25,
          "& .MuiButton-startIcon": { mr: 0.5, "& svg": { fontSize: 18 } },
          "&:hover": { color: "error.main", bgcolor: "action.hover" },
        }}
      >
        Esci
      </Button>
    </form>
  );

  const brand = (dot = 26) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <div className="brand-dot" style={{ width: dot, height: dot, flexShrink: 0 }} />
      <Typography
        sx={{ fontWeight: 700, fontSize: "0.9375rem", color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        Gestione Turni
      </Typography>
    </Box>
  );

  return (
    <AppBar position="sticky" elevation={0}>
      {/* ─── DESKTOP: tutto in una Toolbar ─────────────────────────────── */}
      <Toolbar
        disableGutters
        sx={{
          display: { xs: "none", sm: "flex" },
          gap: 1,
          px: { sm: 2, md: 3 },
          minHeight: "56px !important",
        }}
      >
        {/* Brand */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
          {brand()}
          <Chip
            label="Manager"
            size="small"
            sx={{
              bgcolor: "var(--brand-soft)", color: "primary.main", fontWeight: 600,
              fontSize: 10, height: 20, "& .MuiChip-label": { px: 0.75 },
            }}
          />
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />

        {/* Nav links */}
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            flex: 1,
            minWidth: 0,
            alignItems: "center",
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {TABS.map((t) => navLink(t))}
        </Box>

        {/* Notifiche opzionali + Esci */}
        {right && <Box sx={{ flexShrink: 0 }}>{right}</Box>}
        {logoutBtn}
      </Toolbar>

      {/* ─── MOBILE: due righe ─────────────────────────────────────────── */}
      <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column" }}>
        {/* Riga 1: brand + right + esci */}
        <Box sx={{ display: "flex", alignItems: "center", height: 52, px: 2, gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>{brand(24)}</Box>
          {right && <Box sx={{ flexShrink: 0 }}>{right}</Box>}
          {logoutBtn}
        </Box>

        <Divider />

        {/* Riga 2: nav scorribile */}
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            px: 1.5,
            py: 0.75,
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {TABS.map((t) => navLink({ ...t, label: t.short }, false))}
        </Box>
      </Box>
    </AppBar>
  );
}
