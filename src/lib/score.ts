import { EPSILON, type Debt } from "./constants";
import { T } from "../app/theme";
import { clamp, daysUntil, fBRL, fPct } from "./format";

export function calcScore(d: Debt | null | undefined): number {
  if (!d) return -1;
  const remaining = Math.max(0, (d.balance || 0) - (d.paid || 0));
  if (remaining <= EPSILON) return -1;

  const rate = Math.max(0, Number(d.rate) || 0);
  const penaltyRate = Math.max(0, Number(d.penaltyRate) || rate);
  const grace = Math.max(0, parseInt(String(d.graceDaysLeft)) || 0);
  const discount = clamp(Number(d.discountPct) || 0, 0, 99.99);
  const dueDays = daysUntil(d.dueDate);

  const baseRate = grace > 0 ? 0 : rate;
  const effectiveRate = discount > 0 ? baseRate / (1 - discount / 100) : baseRate;
  const threat = Math.max(0, penaltyRate - effectiveRate);
  const deadline = Math.min(dueDays, grace > 0 ? grace : Infinity);

  let urgency: number;
  if (deadline <= 3) urgency = 10;
  else if (deadline <= 7) urgency = 5;
  else if (deadline <= 14) urgency = 3;
  else if (deadline <= 30) urgency = 1.5;
  else urgency = 0;

  return effectiveRate + threat * urgency;
}

export function sortDebts<D extends Debt>(list: D[]): D[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const sa = calcScore(a);
    const sb = calcScore(b);
    if (Math.abs(sa - sb) > EPSILON) return sb - sa;
    const ra = Math.max(0, (a.balance || 0) - (a.paid || 0));
    const rb = Math.max(0, (b.balance || 0) - (b.paid || 0));
    return ra - rb;
  });
}

export interface PriorityLabel {
  t: string;
  c: string;
}

export function priorityLabel(score: number, d: Debt): PriorityLabel {
  const remaining = Math.max(0, (d.balance || 0) - (d.paid || 0));
  if (remaining <= EPSILON) return { t: "QUITADO", c: T.ok };
  if (score >= 50) return { t: "URGENTE", c: T.danger };
  if (score >= 10) return { t: "ALTO", c: "#f97316" };
  if (score >= 4) return { t: "MÉDIO", c: T.warn };
  if (score >= 1) return { t: "NORMAL", c: T.muted };
  return { t: "BAIXO", c: T.dim };
}

export function explainScore(d: Debt): string {
  const remaining = Math.max(0, (d.balance || 0) - (d.paid || 0));
  if (remaining <= EPSILON) return "Dívida quitada.";

  const parts: string[] = [];
  const rate = Number(d.rate) || 0;
  const penaltyRate = Number(d.penaltyRate) || rate;
  const grace = parseInt(String(d.graceDaysLeft)) || 0;
  const discount = clamp(Number(d.discountPct) || 0, 0, 99.99);
  const dueDays = daysUntil(d.dueDate);
  const baseRate = grace > 0 ? 0 : rate;
  const effectiveRate = discount > 0 ? baseRate / (1 - discount / 100) : baseRate;

  if (grace > 0) {
    parts.push(`Carência: ${grace}d sem juros`);
    if (penaltyRate > 0) parts.push(`Após: ${fPct(penaltyRate)} a.m.`);
  } else if (rate > 0) {
    parts.push(`Taxa: ${fPct(rate)} a.m. (${fBRL((rate / 100 / 30) * remaining)}/dia)`);
  }

  if (discount > 0) {
    parts.push(`Desc. ${discount}%: efetiva ${fPct(effectiveRate)} (R$1 elimina ${fBRL(1 / (1 - discount / 100))})`);
  }

  const threat = Math.max(0, penaltyRate - effectiveRate);
  const deadline = Math.min(dueDays, grace > 0 ? grace : Infinity);
  if (threat > 0 && isFinite(deadline)) parts.push(`Ameaça: +${fPct(threat)} em ${deadline}d`);
  if (isFinite(dueDays)) parts.push(`Vence em ${dueDays}d`);

  return parts.join(" · ");
}
