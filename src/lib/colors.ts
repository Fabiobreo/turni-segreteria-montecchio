/** Palette colori segretarie. Usata sia in componenti client che in Server Components. */
export const COLORS = [
  { key: "mara",  hex: "#2f6df6", label: "Blu" },
  { key: "sonia", hex: "#138a4a", label: "Verde" },
  { key: "bea",   hex: "#c0392b", label: "Rosso" },
  { key: "emma",  hex: "#6a3fc0", label: "Viola" },
  { key: "ari",   hex: "#b7791f", label: "Ambra" },
  { key: "teal",  hex: "#0891b2", label: "Teal" },
  { key: "pink",  hex: "#be185d", label: "Rosa" },
  { key: "slate", hex: "#475569", label: "Grigio" },
];

export function colorHex(key: string): string {
  return COLORS.find((c) => c.key === key)?.hex ?? "#2f6df6";
}

// ───── Varianti stagionali ─────
// Dallo stesso colore base ricavo due tonalità: estivo più vivace (saturo,
// leggermente più chiaro), invernale più "spento" (desaturato e più scuro).
// Così, a colpo d'occhio, il colore del blocco dice anche di che impianto è.

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (x: number) => Math.round(x).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Colore di un blocco-turno secondo la stagione dell'impianto. */
export function seasonColor(baseHex: string, impiantoId: string): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(baseHex));
  if (impiantoId === "estivo")    return rgbToHex(...hslToRgb(h, clamp01(s * 1.18 + 0.04), clamp01(l * 1.04)));
  if (impiantoId === "invernale") return rgbToHex(...hslToRgb(h, clamp01(s * 0.45),        clamp01(l * 0.8)));
  return baseHex;
}
