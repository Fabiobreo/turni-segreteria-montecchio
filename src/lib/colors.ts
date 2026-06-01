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
