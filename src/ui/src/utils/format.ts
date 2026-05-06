export function fmtRating(r: number | null | undefined): string {
  if (r == null) return "N/A";
  return r.toFixed(3);
}

export function fmtDelta(d: number): string {
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(3)}`;
}

export function fmtPct(p: number): string {
  return `${(p * 100).toFixed(0)}%`;
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
