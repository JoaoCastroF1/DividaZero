import { EPSILON, type Debt } from "./constants";
import { calcScore } from "./score";

export type Strategy = "avalanche" | "snowball" | "score";

export interface MonthSnapshot {
  month: number;
  totalRemaining: number;
  interestAccrued: number;
  paidThisMonth: number;
  quitadas: string[];
}

export interface SimulationResult {
  strategy: Strategy;
  months: MonthSnapshot[];
  payoffMonth: number | null;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: { debtId: string; name: string; month: number }[];
  insufficientBudget: boolean;
}

interface SimDebt {
  id: string;
  name: string;
  balance: number;
  rate: number;
  penaltyRate: number;
  graceDaysLeft: number;
  dueDate: string;
  discountPct: number;
  minPayment: number;
  paid: number;
  done: boolean;
  type: Debt["type"];
  note: string;
}

function pickOrder(debts: SimDebt[], strategy: Strategy): SimDebt[] {
  const active = debts.filter((d) => !d.done);
  if (strategy === "avalanche") {
    return [...active].sort((a, b) => b.rate - a.rate || a.balance - b.balance);
  }
  if (strategy === "snowball") {
    return [...active].sort((a, b) => a.balance - b.balance);
  }
  return [...active].sort((a, b) => {
    const sa = calcScore(a as unknown as Debt);
    const sb = calcScore(b as unknown as Debt);
    if (Math.abs(sa - sb) > EPSILON) return sb - sa;
    return a.balance - b.balance;
  });
}

export function simulate(
  debts: Debt[],
  monthlyBudget: number,
  strategy: Strategy,
  maxMonths = 600,
): SimulationResult {
  const sim: SimDebt[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: Math.max(0, d.balance - (d.paid || 0)),
    rate: d.rate || 0,
    penaltyRate: d.penaltyRate || d.rate || 0,
    graceDaysLeft: d.graceDaysLeft || 0,
    dueDate: d.dueDate,
    discountPct: d.discountPct || 0,
    minPayment: d.minPayment || 0,
    paid: 0,
    done: d.done || (d.balance - (d.paid || 0)) <= EPSILON,
    type: d.type,
    note: d.note,
  }));

  const months: MonthSnapshot[] = [];
  const payoffOrder: { debtId: string; name: string; month: number }[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let payoffMonth: number | null = null;
  let insufficientBudget = false;

  const initialRemaining = sim.reduce((s, d) => s + (d.done ? 0 : d.balance), 0);
  months.push({
    month: 0,
    totalRemaining: initialRemaining,
    interestAccrued: 0,
    paidThisMonth: 0,
    quitadas: [],
  });

  for (let m = 1; m <= maxMonths; m++) {
    let monthInterest = 0;
    for (const d of sim) {
      if (d.done) continue;
      if (d.rate > 0) {
        const interest = d.balance * (d.rate / 100);
        d.balance += interest;
        monthInterest += interest;
      }
    }
    totalInterestPaid += monthInterest;

    let budget = monthlyBudget;
    const minTotal = sim.filter((d) => !d.done).reduce((s, d) => s + Math.min(d.minPayment, d.balance), 0);
    if (minTotal > budget + EPSILON) {
      insufficientBudget = true;
    }

    for (const d of sim) {
      if (d.done || budget <= EPSILON) continue;
      const min = Math.min(d.minPayment, d.balance);
      const pay = Math.min(min, budget);
      d.balance -= pay;
      d.paid += pay;
      budget -= pay;
    }

    const order = pickOrder(sim, strategy);
    for (const target of order) {
      if (budget <= EPSILON) break;
      if (target.done) continue;
      const pay = Math.min(target.balance, budget);
      target.balance -= pay;
      target.paid += pay;
      budget -= pay;
    }

    const quitadasThis: string[] = [];
    for (const d of sim) {
      if (!d.done && d.balance <= EPSILON) {
        d.done = true;
        d.balance = 0;
        quitadasThis.push(d.id);
        payoffOrder.push({ debtId: d.id, name: d.name, month: m });
      }
    }

    const paidThisMonth = monthlyBudget - budget;
    totalPaid += paidThisMonth;

    const remaining = sim.reduce((s, d) => s + d.balance, 0);
    months.push({
      month: m,
      totalRemaining: remaining,
      interestAccrued: monthInterest,
      paidThisMonth,
      quitadas: quitadasThis,
    });

    if (remaining <= EPSILON) {
      payoffMonth = m;
      break;
    }

    if (insufficientBudget && paidThisMonth <= EPSILON) {
      break;
    }
  }

  return {
    strategy,
    months,
    payoffMonth,
    totalInterestPaid,
    totalPaid,
    payoffOrder,
    insufficientBudget,
  };
}

export function compareStrategies(
  debts: Debt[],
  monthlyBudget: number,
  maxMonths = 600,
): Record<Strategy, SimulationResult> {
  return {
    avalanche: simulate(debts, monthlyBudget, "avalanche", maxMonths),
    snowball: simulate(debts, monthlyBudget, "snowball", maxMonths),
    score: simulate(debts, monthlyBudget, "score", maxMonths),
  };
}

export function projectPayoffDate(months: number | null, from: Date = new Date()): Date | null {
  if (months == null) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}
