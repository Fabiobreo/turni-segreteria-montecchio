import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary:    { main: "#2f6df6" },
    success:    { main: "#138a4a" },
    error:      { main: "#c0392b" },
    warning:    { main: "#b7791f" },
    background: { default: "#f4f5f7", paper: "#ffffff" },
    text:       { primary: "#1f2430", secondary: "#6b7280" },
    divider:    "#e5e7eb",
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 14,
    h1: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: "1rem",     fontWeight: 600 },
    body1: { fontSize: "0.875rem" },
    body2: { fontSize: "0.8125rem" },
    caption: { fontSize: "0.75rem" },
  },
  shape: { borderRadius: 10 },
  shadows: [
    "none",
    "0 1px 2px rgba(16,24,40,.06), 0 4px 12px rgba(16,24,40,.06)",
    ...Array(23).fill("0 1px 2px rgba(16,24,40,.06), 0 4px 12px rgba(16,24,40,.06)"),
  ] as ReturnType<typeof createTheme>["shadows"],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": { boxSizing: "border-box" },
        "input, select, button": { fontFamily: "inherit" },
        a: { color: "#2f6df6" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 10, fontSize: "0.875rem" },
        sizeSmall: { padding: "4px 10px", fontSize: "0.8125rem" },
        sizeMedium: { padding: "7px 14px" },
        outlined: { borderColor: "#e5e7eb", color: "#1f2430", backgroundColor: "#fff",
          "&:hover": { borderColor: "#cdd3db", backgroundColor: "#fafbfc" } },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 1 },
      styleOverrides: { root: { backgroundImage: "none", borderRadius: 14 } },
    },
    MuiCard: {
      defaultProps: { elevation: 1 },
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff", color: "#1f2430" },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
      styleOverrides: {
        root: { "& .MuiOutlinedInput-root": { borderRadius: 10, backgroundColor: "#fff" } },
      },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10, fontSize: "0.8125rem" } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".03em",
          color: "#6b7280", backgroundColor: "#fafbfc", fontWeight: 600, padding: "9px 12px" },
        body: { fontSize: "0.875rem", padding: "9px 12px" },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "#e5e7eb" } },
    },
  },
});

export default theme;
