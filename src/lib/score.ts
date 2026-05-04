import {
  DISCOUNT_BONUS_FACTOR,
  EPSILON,
  TYPE_WEIGHT,
  URGENCY_DECAY,
  URGENCY_MAX,
  VALID_TYPES,
  type Debt,
  type DebtType,
} from "./constants";
import { T } from "../app/theme";
import { clamp, daysUntil, fBRL, fPct } from "./format";

export function urgencyCurve(deadline: number): number {
  if (!isFinite(deadline)) return 0;
  const d = Math.max(0, deadline);
  return URGENCY_MAX * Math.exp(-d / URGENCY_DECAY);
}

function typeWeight(type: unknown): number {
  return VALID_TYPES.includes(type as DebtType)
    ? TYPE_WEIGHT[type as DebtType]
    : 1.0;
}

/**
 * Motor v3.1.
 *   score = effectiveRate + threat × urgency + discountBonus
 *   effectiveRate = (rate × w_type) / (1 − discount/100)   (= 0 durante carência)
 *   threat        = max(0, penaltyRate × w_type − effectiveRate)
 *   urgency       = URGENCY_MAX · exp(−deadline / URGENCY_DECAY)
 *   discountBonus = discount/(100−discount) × urgency × DISCOUNT_BONUS_FACTOR
 *   deadline      = min(dueDays, grace? grace : ∞)
 */
export function calcScore(d: Debt | null | undefined): number {
  if (!d) return -1;
  const remaining = Math.max(0, (d.balance || 0) - (d.paid || 0));
  if (remaining <= EPSILON) return -1;

  const w = typeWeight(d.type);
  const rate = Math.max(0, Number(d.rate) || 0) * w;
  const penaltyRate = Math.max(0, Number(d.penaltyRate) || (Number(d.rate) || 0)) * w;
  const grace = Math.max(0, parseInt(String(d.graceDaysLeft)) || 0);
  const discount = clamp(Number(d.discountPct) || 0, 0, 99.99);
  const dueDays = daysUntil(d.dueDate);

  const baseRate = grace > 0 ? 0 : rate;
  const effectiveRate = discount > 0 ? baseRate / (1 - discount / 100) : baseRate;
  const threat = Math.max(0, penaltyRate - effectiveRate);
  const deadline = Math.min(dueDays, grace > 0 ? grace : Infinity);
  const urgency = urgencyCurve(deadline);

  const discountBonus =
    discount > 0 && urgency > 0
      ? (discount / (100 - discount)) * urgency * DISCOUNT_BONUS_FACTOR
      : 0;

  return effectiveRate + threat * urgency + discountBonus;
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
  const w = typeWeight(d.type);
  const rawRate = Number(d.rate) || 0;
  const rate = rawRate * w;
  const penaltyRate = (Number(d.penaltyRate) || rawRate) * w;
  const grace = parseInt(String(d.graceDaysLeft)) || 0;
  const discount = clamp(Number(d.discountPct) || 0, 0, 99.99);
  const dueDays = daysUntil(d.dueDate);
  const baseRate = grace > 0 ? 0 : rate;
  const effectiveRate = discount > 0 ? baseRate / (1 - discount / 100) : baseRate;

  if (Math.abs(w - 1) > EPSILON) {
    parts.push(`Tipo ×${w.toFixed(2)}`);
  }

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
  const urgency = urgencyCurve(deadline);
  if (threat > 0 && isFinite(deadline)) parts.push(`Ameaça: +${fPct(threat)} em ${deadline}d`);
  if (urgency > EPSILON) parts.push(`Urgência ${urgency.toFixed(1)}/10`);
  if (discount > 0 && urgency > 0) {
    const bonus = (discount / (100 - discount)) * urgency * DISCOUNT_BONUS_FACTOR;
    if (bonus > EPSILON) parts.push(`Bônus quitação: +${bonus.toFixed(1)}`);
  }
  if (isFinite(dueDays)) parts.push(`Vence em ${dueDays}d`);

  return parts.join(" · ");
}
