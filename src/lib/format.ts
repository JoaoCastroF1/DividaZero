export function fBRL(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fPct(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return "0,00%";
  return n.toFixed(2).replace(".", ",") + "%";
}

export function uid(): string {
  return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function parseNumber(s: unknown): number {
  if (typeof s === "number") return isFinite(s) ? s : 0;
  if (s == null) return 0;
  let str = String(s).trim();
  if (!str) return 0;
  str = str.replace(/[^\d,.-]/g, "");
  if (!str) return 0;
  const hasComma = str.includes(",");
  const hasDot = str.includes(".");
  if (hasComma && hasDot) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    str = str.replace(",", ".");
  }
  const n = parseFloat(str);
  return isFinite(n) ? n : 0;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr || typeof dateStr !== "string") return Infinity;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return Infinity;
  const [, yStr, mStr, dStr] = match;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (m < 1 || m > 12 || d < 1 || d > 31) return Infinity;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  return diff < 0 ? 0 : diff;
}
