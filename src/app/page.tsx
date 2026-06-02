import { isManager } from "@/lib/auth";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import AcUnitOutlinedIcon from "@mui/icons-material/AcUnitOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";

const BRAND = "#2f6df6";

// ─── Helper components ───────────────────────────────────────────────────────

function FeatureCard({
  icon, title, desc, color = BRAND,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        transition: "box-shadow .2s, transform .2s",
        "&:hover": {
          boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box
        sx={{
          width: 44, height: 44, borderRadius: "12px",
          bgcolor: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#1f2430" }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {desc}
      </Typography>
    </Paper>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #2f6df6, #7aa6ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: "0.9rem",
          boxShadow: "0 4px 12px rgba(47,109,246,0.30)",
        }}
      >
        {n}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 0.25, color: "#1f2430" }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {desc}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function Home() {
  const loggedIn = await isManager();

  return (
    <Box sx={{ bgcolor: "#f9fafb", minHeight: "100vh" }}>

      {/* ── NAVBAR (sticky — contiene anche lo stato sessione) ── */}
      <Box
        component="header"
        sx={{
          position: "sticky", top: 0, zIndex: 100,
          bgcolor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: { xs: 64, sm: 72 },
              gap: { xs: 1.5, sm: 2.5 },
            }}
          >
            {/* Brand — cliccabile, porta alla home */}
            <Box
              component="a"
              href="/"
              sx={{
                display: "flex", alignItems: "center",
                gap: { xs: 1, sm: 1.5 },
                textDecoration: "none", flex: 1, minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: { xs: 34, sm: 40 },
                  height: { xs: 34, sm: 40 },
                  borderRadius: { xs: "10px", sm: "12px" },
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #2f6df6, #7aa6ff)",
                  boxShadow: "0 4px 14px rgba(47,109,246,0.32)",
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                    color: "#1f2430",
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Gestione Turni
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "#9ca3af",
                    display: { xs: "none", sm: "block" },
                    lineHeight: 1,
                  }}
                >
                  Segreteria Forus
                </Typography>
              </Box>
            </Box>

            {/* Destra: cambia in base allo stato di login */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              {loggedIn ? (
                <>
                  {/* Badge "Manager" solo su schermi medi+ */}
                  <Chip
                    label="✓ Connessa"
                    size="small"
                    sx={{
                      bgcolor: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0",
                      border: "1px solid", fontWeight: 700, fontSize: "0.72rem",
                      display: { xs: "none", sm: "flex" },
                    }}
                  />
                  <Button
                    href="/manager"
                    variant="contained"
                    size="small"
                    sx={{
                      fontWeight: 700, borderRadius: "9px",
                      whiteSpace: "nowrap",
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                      px: { xs: 1.5, sm: 2 },
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    href="/manager/logout"
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600, borderRadius: "9px",
                      borderColor: "#e5e7eb", color: "#6b7280",
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                      px: { xs: 1.5, sm: 2 },
                      "&:hover": { borderColor: "#ef4444", color: "#ef4444", bgcolor: "#fef2f2" },
                    }}
                  >
                    Esci
                  </Button>
                </>
              ) : (
                <Button
                  href="/manager"
                  variant="contained"
                  size="small"
                  sx={{
                    fontWeight: 700, borderRadius: "9px",
                    whiteSpace: "nowrap",
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 0.875, sm: 1 },
                  }}
                >
                  Area manager
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── HERO ── */}
      <Box
        sx={{
          background: "linear-gradient(140deg, #0c1445 0%, #1a3a8a 55%, #2f6df6 100%)",
          color: "#fff",
          pt: { xs: 9, md: 14 },
          pb: { xs: 10, md: 16 },
          px: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* cerchi decorativi */}
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", background: "rgba(255,255,255,0.035)", top: -160, right: -120 }} />
          <Box sx={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.045)", bottom: -80, left: 60 }} />
          <Box sx={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", background: "rgba(122,166,255,0.12)", top: 80, left: "42%" }} />
        </Box>

        <Container maxWidth="md" sx={{ position: "relative" }}>
          <Chip
            label="Software interno · Forus"
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.2)", mb: 3, fontSize: "0.78rem", fontWeight: 600,
            }}
          />

          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: "2.1rem", sm: "2.8rem", md: "3.4rem" },
              fontWeight: 900,
              lineHeight: 1.13,
              letterSpacing: "-0.02em",
              mb: 2.5,
              color: "#fff",
            }}
          >
            Turni di segreteria,<br />
            <Box component="span" sx={{ color: "#93c5fd" }}>senza fogli Excel.</Box>
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: "1rem", md: "1.15rem" },
              color: "rgba(255,255,255,0.78)",
              maxWidth: 520,
              lineHeight: 1.65,
              mb: 4,
            }}
          >
            Pianifica, assegna e monitora i turni mensili della segreteria in tempo reale.
            Le segretarie indicano la disponibilità dal telefono — la copertura si verifica da sola.
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              href="/manager"
              variant="contained"
              size="large"
              sx={{
                bgcolor: "#fff", color: BRAND, fontWeight: 800, fontSize: "0.95rem",
                px: 3.5, py: 1.25, borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                "&:hover": { bgcolor: "#f0f4ff", boxShadow: "0 6px 28px rgba(0,0,0,0.22)" },
              }}
            >
              Accedi come manager →
            </Button>
            <Button
              href="#come-funziona"
              variant="outlined"
              size="large"
              color="inherit"
              sx={{
                borderColor: "rgba(255,255,255,0.35)",
                fontWeight: 700, fontSize: "0.95rem", px: 3, py: 1.25, borderRadius: "12px",
                opacity: 0.9,
                "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.09)", opacity: 1 },
              }}
            >
              Come funziona
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── STRIP NUMERI ── */}
      <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            }}
          >
            {[
              { n: "5", label: "segretarie" },
              { n: "2", label: "impianti (estivo / invernale)" },
              { n: "7", label: "giorni su 7" },
              { n: "∞", label: "turni configurabili" },
            ].map((item, i) => (
              <Box
                key={i}
                sx={{
                  py: 3, px: 2, textAlign: "center",
                  borderRight: { xs: i % 2 === 0 ? "1px solid #e5e7eb" : 0, sm: i < 3 ? "1px solid #e5e7eb" : 0 },
                  borderBottom: { xs: i < 2 ? "1px solid #e5e7eb" : 0, sm: 0 },
                }}
              >
                <Typography sx={{ fontWeight: 900, fontSize: "2rem", color: BRAND, lineHeight: 1.1 }}>
                  {item.n}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── FEATURES ── */}
      <Box sx={{ py: { xs: 7, md: 10 }, px: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip label="Funzionalità" size="small" sx={{ mb: 1.5, fontWeight: 600 }} />
            <Typography
              variant="h2"
              sx={{ fontWeight: 800, fontSize: { xs: "1.6rem", md: "2rem" }, color: "#1f2430", mb: 1 }}
            >
              Tutto ciò che serve per gestire i turni
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 480, mx: "auto", fontSize: "0.95rem", lineHeight: 1.65 }}>
              Dalla griglia settimanale al riepilogo mensile, ogni informazione sempre aggiornata.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2.5,
            }}
          >
            <FeatureCard
              icon={<CalendarMonthOutlinedIcon />}
              title="Vista settimanale a fasce"
              desc="Griglia interattiva con drag & drop. Crea, sposta e ridimensiona i turni in un colpo solo."
              color="#2f6df6"
            />
            <FeatureCard
              icon={<TaskAltOutlinedIcon />}
              title="Copertura automatica"
              desc="L'app avvisa in tempo reale su fasce scoperte e sovrapposizioni oltre i limiti."
              color="#138a4a"
            />
            <FeatureCard
              icon={<BarChartOutlinedIcon />}
              title="Ore e riepilogo"
              desc="Monitora le ore settimanali e mensili di ogni segretaria rispetto al tetto contrattuale."
              color="#6a3fc0"
            />
            <FeatureCard
              icon={<PhoneAndroidOutlinedIcon />}
              title="Mobile per le segretarie"
              desc="Ogni segretaria ha un link personale. Accede dal telefono, indica disponibilità e vede i propri turni."
              color="#b7791f"
            />
          </Box>

          {/* seconda riga feature */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
              gap: 2.5,
              mt: 2.5,
            }}
          >
            <FeatureCard
              icon={<WbSunnyOutlinedIcon />}
              title="Impianto estivo ☀"
              desc="Turni, orari e copertura dedicati all'impianto estivo, separati da quelli invernali."
              color="#b7791f"
            />
            <FeatureCard
              icon={<AcUnitOutlinedIcon />}
              title="Impianto invernale ❄"
              desc="Gestione parallela dell'impianto invernale. Orari configurabili dalla pagina impostazioni."
              color="#0891b2"
            />
            <FeatureCard
              icon={<BarChartOutlinedIcon />}
              title="Poster & export"
              desc="Genera e condividi il poster settimanale come immagine direttamente da WhatsApp."
              color="#be185d"
            />
          </Box>
        </Container>
      </Box>

      {/* ── COME FUNZIONA ── */}
      <Box
        id="come-funziona"
        sx={{ bgcolor: "#fff", py: { xs: 7, md: 10 }, px: 3, borderTop: "1px solid #e5e7eb" }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip label="Come funziona" size="small" sx={{ mb: 1.5, fontWeight: 600 }} />
            <Typography
              variant="h2"
              sx={{ fontWeight: 800, fontSize: { xs: "1.6rem", md: "2rem" }, color: "#1f2430" }}
            >
              Tre passi per i turni del mese
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 4, md: 6 },
              alignItems: "start",
            }}
          >
            {/* Steps */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
              <Step
                n={1}
                title="Le segretarie indicano la disponibilità"
                desc="Ogni segretaria apre il suo link personale dal telefono e segna i giorni in cui è disponibile per il mese."
              />
              <Divider sx={{ ml: "46px" }} />
              <Step
                n={2}
                title="La manager costruisce i turni"
                desc="Apre la dashboard, vede disponibilità e ore di ciascuna, e assegna i turni trascinando nella griglia per impianto."
              />
              <Divider sx={{ ml: "46px" }} />
              <Step
                n={3}
                title="Copertura verificata in automatico"
                desc="L'app controlla in tempo reale che ogni fascia oraria sia coperta. Gli avvisi segnalano buchi e superamento dei tetti."
              />
            </Box>

            {/* Chi accede */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3, borderRadius: "16px",
                  border: "1px solid #e5e7eb",
                  background: "linear-gradient(135deg, #f5f8ff 0%, #eff6ff 100%)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ p: 0.75, bgcolor: `${BRAND}18`, borderRadius: "8px", color: BRAND, display: "flex" }}>
                    <AdminPanelSettingsOutlinedIcon fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#1f2430" }}>
                    Manager (da PC)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mb: 2 }}>
                  Accede con password all&apos;area manager. Vede la griglia settimanale, le disponibilità,
                  le ore e gli avvisi di copertura per entrambi gli impianti.
                </Typography>
                <Button href="/manager" variant="contained" size="small" sx={{ borderRadius: "8px", fontWeight: 700 }}>
                  Vai alla dashboard →
                </Button>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3, borderRadius: "16px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ p: 0.75, bgcolor: "#138a4a18", borderRadius: "8px", color: "#138a4a", display: "flex" }}>
                    <LinkOutlinedIcon fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#1f2430" }}>
                    Segretarie (da telefono)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  Ogni segretaria riceve il proprio link personale via WhatsApp.
                  Nessuna password, nessuna app da installare — funziona direttamente nel browser.
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── CTA FINALE ── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0c1445 0%, #1a3a8a 55%, #2f6df6 100%)",
          py: { xs: 7, md: 10 },
          px: 3,
          textAlign: "center",
        }}
      >
        <Container maxWidth="sm">
          <Typography
            sx={{
              fontWeight: 900, fontSize: { xs: "1.7rem", md: "2.2rem" },
              color: "#fff", mb: 1.5, lineHeight: 1.2,
            }}
          >
            Pronto per iniziare?
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", mb: 3.5, fontSize: "1rem", lineHeight: 1.6 }}>
            Accedi all&apos;area manager e costruisci i turni del mese in pochi minuti.
          </Typography>
          <Button
            href="/manager"
            variant="contained"
            size="large"
            sx={{
              bgcolor: "#fff", color: BRAND, fontWeight: 800, fontSize: "1rem",
              px: 4, py: 1.5, borderRadius: "14px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.20)",
              "&:hover": { bgcolor: "#f0f4ff" },
            }}
          >
            Accedi come manager →
          </Button>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box
        component="footer"
        sx={{ bgcolor: "#0f172a", py: 3, px: 3 }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 24, height: 24, borderRadius: "7px",
                  background: "linear-gradient(135deg, #2f6df6, #7aa6ff)",
                }}
              />
              <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: "rgba(255,255,255,0.8)" }}>
                Gestione Turni · Forus
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.35)" }}>
              Software interno — accesso riservato
            </Typography>
          </Box>
        </Container>
      </Box>

    </Box>
  );
}
