const PALETTE = [
  "#7F77DD",
  "#1D9E75",
  "#D85A30",
  "#185FA5",
  "#BA7517",
  "#993556",
  "#639922",
  "#853535",
];

export function nameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
