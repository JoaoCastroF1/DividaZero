import { describe, it, expect } from "vitest";
import { calcScore, sortDebts, priorityLabel, urgencyCurve } from "../../src/lib/score";
import {
  TYPE_WEIGHT,
  URGENCY_DECAY,
  URGENCY_MAX,
  type Debt,
} from "../../src/lib/constants";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "x",
    name: "Test",
    type: "emprestimo",
    balance: 1000,
    rate: 5,
    penaltyRate: 5,
    graceDaysLeft: 0,
    dueDate: "",
    discountPct: 0,
    minPayment: 100,
    note: "",
    paid: 0,
    done: false,
    ...overrides,
  };
}

function dueInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

describe("urgencyCurve", () => {
  it("returns URGENCY_MAX at deadline 0", () => {
    expect(urgencyCurve(0)).toBeCloseTo(URGENCY_MAX, 5);
  });

  it("decays exponentially with deadline", () => {
    expect(urgencyCurve(URGENCY_DECAY)).toBeCloseTo(URGENCY_MAX / Math.E, 5);
  });

  it("approaches zero for far deadlines", () => {
    expect(urgencyCurve(120)).toBeLessThan(0.01);
  });

  it("returns 0 for Infinity", () => {
    expect(urgencyCurve(Infinity)).toBe(0);
  });

  it("is continuous around former cliff thresholds", () => {
    // Old curve jumped 1.5 → 0 at d=30/31. Now diff must be small.
    expect(Math.abs(urgencyCurve(30) - urgencyCurve(31))).toBeLessThan(0.05);
    expect(Math.abs(urgencyCurve(3) - urgencyCurve(4))).toBeLessThan(1);
  });
});

describe("calcScore", () => {
  it("returns -1 when remaining is zero (paid >= balance)", () => {
    expect(calcScore(makeDebt({ paid: 1000 }))).toBe(-1);
    expect(calcScore(makeDebt({ done: true, paid: 1000 }))).toBe(-1);
  });

  it("returns -1 for null/undefined", () => {
    expect(calcScore(null)).toBe(-1);
    expect(calcScore(undefined)).toBe(-1);
  });

  it("returns weighted rate for simple case (no discount, no urgency, emprestimo w=1.0)", () => {
    expect(calcScore(makeDebt({ rate: 5 }))).toBeCloseTo(5, 5);
  });

  it("applies discount to effective rate (emprestimo w=1.0)", () => {
    expect(calcScore(makeDebt({ rate: 5, discountPct: 20 }))).toBeCloseTo(6.25, 5);
  });

  it("zero base rate during grace period but threat × urgency applies", () => {
    // grace=30, w_emprestimo=1, threat = 5*1 - 0 = 5, urgency = 10*exp(-30/8.5)
    const expected = 5 * urgencyCurve(30);
    expect(calcScore(makeDebt({ rate: 5, graceDaysLeft: 30 }))).toBeCloseTo(expected, 5);
  });

  it("grace with no penaltyRate yields zero score", () => {
    expect(calcScore(makeDebt({ rate: 0, penaltyRate: 0, graceDaysLeft: 30 }))).toBe(0);
  });

  it("threat × urgency boosts score when due soon", () => {
    // 2 days due, rate=0 grace=0, penalty=10, type=emprestimo (w=1)
    // threat = 10, urgency = 10*exp(-2/8.5) ≈ 7.896, score ≈ 78.96
    const d = makeDebt({ rate: 0, penaltyRate: 10, graceDaysLeft: 0, dueDate: dueInDays(2) });
    const expected = 10 * urgencyCurve(2);
    expect(calcScore(d)).toBeCloseTo(expected, 1);
  });

  it("no urgency boost when far from due date", () => {
    // 120 days: urgency ≈ 0, score ≈ rate
    expect(calcScore(makeDebt({ rate: 5, dueDate: dueInDays(120) }))).toBeCloseTo(5, 1);
  });
});

describe("type weighting", () => {
  it("cheque_especial has higher score than emprestimo for same fields", () => {
    const ce = makeDebt({ type: "cheque_especial", rate: 5 });
    const ep = makeDebt({ type: "emprestimo", rate: 5 });
    expect(calcScore(ce)).toBeGreaterThan(calcScore(ep));
    expect(calcScore(ce)).toBeCloseTo(5 * TYPE_WEIGHT.cheque_especial, 5);
  });

  it("financiamento has lower score than emprestimo for same fields", () => {
    const fi = makeDebt({ type: "financiamento", rate: 5 });
    const ep = makeDebt({ type: "emprestimo", rate: 5 });
    expect(calcScore(fi)).toBeLessThan(calcScore(ep));
    expect(calcScore(fi)).toBeCloseTo(5 * TYPE_WEIGHT.financiamento, 5);
  });

  it("ordering between same-type debts is preserved by rate", () => {
    const a = makeDebt({ id: "a", type: "cartao", rate: 8 });
    const b = makeDebt({ id: "b", type: "cartao", rate: 3 });
    expect(calcScore(a)).toBeGreaterThan(calcScore(b));
  });
});

describe("discount bonus", () => {
  it("adds bonus when discount and urgency both > 0", () => {
    const d = makeDebt({ rate: 5, discountPct: 50, dueDate: dueInDays(5) });
    const score = calcScore(d);
    // expected: effective rate (10) + threat*urgency (penalty=5*1=5, eff=10, threat=0) + bonus
    // bonus = (50/50) * urgency(5) * 0.5 = urgency(5) * 0.5
    const u = urgencyCurve(5);
    const expected = 10 + 0 + 1 * u * 0.5;
    expect(score).toBeCloseTo(expected, 4);
  });

  it("no bonus when no urgency window (no dueDate, no grace)", () => {
    const a = makeDebt({ rate: 5, discountPct: 50, dueDate: "", graceDaysLeft: 0 });
    const b = makeDebt({ rate: 5, discountPct: 0, dueDate: "", graceDaysLeft: 0 });
    // a still gets effectiveRate boost from discount; but no bonus term
    expect(calcScore(a)).toBeCloseTo(5 / 0.5, 5);
    expect(calcScore(b)).toBeCloseTo(5, 5);
  });

  it("higher discount with same window produces higher score", () => {
    const small = makeDebt({ rate: 5, discountPct: 10, dueDate: dueInDays(5) });
    const big = makeDebt({ rate: 5, discountPct: 50, dueDate: dueInDays(5) });
    expect(calcScore(big)).toBeGreaterThan(calcScore(small));
  });
});

describe("calcScore monotonicity", () => {
  it("is non-decreasing in rate when all else fixed", () => {
    let prev = -Infinity;
    for (const r of [0, 1, 2, 5, 10, 20, 50]) {
      const s = calcScore(makeDebt({ rate: r, penaltyRate: r }));
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = s;
    }
  });

  it("is non-decreasing as deadline gets closer", () => {
    let prev = -Infinity;
    for (const d of [120, 60, 30, 14, 7, 3, 1]) {
      const s = calcScore(
        makeDebt({ rate: 0, penaltyRate: 10, graceDaysLeft: 0, dueDate: dueInDays(d) }),
      );
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = s;
    }
  });
});

describe("sortDebts", () => {
  it("puts done debts at the end", () => {
    const a = makeDebt({ id: "a", done: true, rate: 10 });
    const b = makeDebt({ id: "b", rate: 1 });
    const sorted = sortDebts([a, b]);
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("a");
  });

  it("sorts by score desc (higher rate first)", () => {
    const a = makeDebt({ id: "a", rate: 3 });
    const b = makeDebt({ id: "b", rate: 8 });
    const c = makeDebt({ id: "c", rate: 5 });
    const sorted = sortDebts([a, b, c]);
    expect(sorted.map((d) => d.id)).toEqual(["b", "c", "a"]);
  });

  it("tie-breaks by smaller remaining balance", () => {
    const a = makeDebt({ id: "a", rate: 5, balance: 5000 });
    const b = makeDebt({ id: "b", rate: 5, balance: 1000 });
    const sorted = sortDebts([a, b]);
    expect(sorted[0].id).toBe("b");
  });
});

describe("priorityLabel", () => {
  it("returns QUITADO when remaining is zero (paid >= balance)", () => {
    expect(priorityLabel(-1, makeDebt({ paid: 1000, done: true })).t).toBe("QUITADO");
  });

  it("returns URGENTE for score >= 50", () => {
    expect(priorityLabel(50, makeDebt()).t).toBe("URGENTE");
  });

  it("returns ALTO for score 10-49", () => {
    expect(priorityLabel(10, makeDebt()).t).toBe("ALTO");
  });

  it("returns MÉDIO for score 4-9", () => {
    expect(priorityLabel(5, makeDebt()).t).toBe("MÉDIO");
  });

  it("returns NORMAL for score 1-3", () => {
    expect(priorityLabel(2, makeDebt()).t).toBe("NORMAL");
  });

  it("returns BAIXO for score < 1", () => {
    expect(priorityLabel(0.5, makeDebt()).t).toBe("BAIXO");
  });
});
