import { describe, it, expect } from "vitest";
import { calcScore, sortDebts, priorityLabel } from "../../src/lib/score";
import type { Debt } from "../../src/lib/constants";

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

describe("calcScore", () => {
  it("returns -1 when remaining is zero (paid >= balance)", () => {
    expect(calcScore(makeDebt({ paid: 1000 }))).toBe(-1);
    expect(calcScore(makeDebt({ done: true, paid: 1000 }))).toBe(-1);
  });

  it("returns -1 for null/undefined", () => {
    expect(calcScore(null)).toBe(-1);
    expect(calcScore(undefined)).toBe(-1);
  });

  it("returns rate for simple case (no discount, no urgency)", () => {
    expect(calcScore(makeDebt({ rate: 5 }))).toBeCloseTo(5, 5);
  });

  it("applies discount to effective rate", () => {
    // 5% / (1 - 0.20) = 5 / 0.8 = 6.25
    expect(calcScore(makeDebt({ rate: 5, discountPct: 20 }))).toBeCloseTo(6.25, 5);
  });

  it("zero base rate during grace period but threat × urgency applies", () => {
    // grace=30 → deadline=30 → urgency=1.5; penaltyRate=5 (default from rate), threat=5-0=5
    // score = 0 + 5 * 1.5 = 7.5
    expect(calcScore(makeDebt({ rate: 5, graceDaysLeft: 30 }))).toBeCloseTo(7.5, 5);
  });

  it("grace with no penaltyRate yields zero score", () => {
    expect(calcScore(makeDebt({ rate: 0, penaltyRate: 0, graceDaysLeft: 30 }))).toBe(0);
  });

  it("threat × urgency boosts score when due soon", () => {
    // Due in 2 days, penaltyRate 10, rate 0 (grace) → threat=10, urgency=10 → score = 0 + 10*10 = 100
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    const dueDate = `${yyyy}-${mm}-${dd}`;
    const d = makeDebt({ rate: 0, penaltyRate: 10, graceDaysLeft: 0, dueDate });
    expect(calcScore(d)).toBeCloseTo(100, 0);
  });

  it("no urgency boost when far from due date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    const dueDate = `${yyyy}-${mm}-${dd}`;
    expect(calcScore(makeDebt({ rate: 5, dueDate }))).toBeCloseTo(5, 5);
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
