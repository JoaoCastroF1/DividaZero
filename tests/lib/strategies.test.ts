import { describe, it, expect } from "vitest";
import { simulate, compareStrategies } from "../../src/lib/strategies";
import type { Debt } from "../../src/lib/constants";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "x",
    name: "Test",
    type: "emprestimo",
    balance: 1000,
    rate: 0,
    penaltyRate: 0,
    graceDaysLeft: 0,
    dueDate: "",
    discountPct: 0,
    minPayment: 0,
    note: "",
    paid: 0,
    done: false,
    ...overrides,
  };
}

describe("simulate", () => {
  it("pays off single zero-rate debt in expected months", () => {
    const debts = [makeDebt({ id: "a", balance: 1000 })];
    const result = simulate(debts, 200, "avalanche", 100);
    expect(result.payoffMonth).toBe(5);
    expect(result.totalInterestPaid).toBe(0);
  });

  it("avalanche prioritizes higher rate", () => {
    const debts = [
      makeDebt({ id: "low", balance: 5000, rate: 2, minPayment: 100 }),
      makeDebt({ id: "high", balance: 1000, rate: 10, minPayment: 100 }),
    ];
    const result = simulate(debts, 500, "avalanche", 100);
    expect(result.payoffOrder[0].debtId).toBe("high");
  });

  it("snowball prioritizes smaller balance", () => {
    const debts = [
      makeDebt({ id: "big", balance: 5000, rate: 10, minPayment: 100 }),
      makeDebt({ id: "small", balance: 500, rate: 2, minPayment: 50 }),
    ];
    const result = simulate(debts, 500, "snowball", 100);
    expect(result.payoffOrder[0].debtId).toBe("small");
  });

  it("avalanche saves more interest than snowball", () => {
    const debts = [
      makeDebt({ id: "a", balance: 10000, rate: 10, minPayment: 200 }),
      makeDebt({ id: "b", balance: 2000, rate: 2, minPayment: 50 }),
    ];
    const avalanche = simulate(debts, 500, "avalanche", 200);
    const snowball = simulate(debts, 500, "snowball", 200);
    expect(avalanche.totalInterestPaid).toBeLessThan(snowball.totalInterestPaid);
  });

  it("flags insufficientBudget when minimums exceed budget", () => {
    const debts = [
      makeDebt({ id: "a", balance: 10000, rate: 10, minPayment: 1000 }),
    ];
    const result = simulate(debts, 50, "avalanche", 12);
    expect(result.insufficientBudget).toBe(true);
  });

  it("excludes already-done debts from simulation", () => {
    const debts = [
      makeDebt({ id: "done", balance: 1000, done: true, paid: 1000 }),
      makeDebt({ id: "active", balance: 500, minPayment: 100 }),
    ];
    const result = simulate(debts, 200, "avalanche", 20);
    expect(result.payoffOrder.map((o) => o.debtId)).toEqual(["active"]);
  });

  it("respects paid amount in initial balance", () => {
    const debts = [
      makeDebt({ id: "a", balance: 1000, paid: 500 }),
    ];
    const result = simulate(debts, 100, "avalanche", 20);
    expect(result.payoffMonth).toBe(5);
  });
});

describe("compareStrategies", () => {
  it("returns all three strategies", () => {
    const debts = [makeDebt({ id: "a", balance: 1000, rate: 5, minPayment: 50 })];
    const result = compareStrategies(debts, 200, 100);
    expect(result.avalanche).toBeDefined();
    expect(result.snowball).toBeDefined();
    expect(result.score).toBeDefined();
  });
});

describe("simulate (tight budget priority)", () => {
  it("minimum payments follow strategy order when budget < total minimums", () => {
    // Two debts: rare (low rate) listed first in array, common (high rate) second.
    // Avalanche should pay the high-rate one first when budget is tight.
    const debts = [
      makeDebt({ id: "low", balance: 5000, rate: 2, minPayment: 100 }),
      makeDebt({ id: "high", balance: 5000, rate: 30, minPayment: 100 }),
    ];
    // Budget covers exactly one minimum.
    const result = simulate(debts, 100, "avalanche", 1);
    // After 1 month, the high-rate debt should have been credited the 100, low-rate untouched.
    const high = result.months[1];
    expect(high.paidThisMonth).toBeCloseTo(100, 5);
    // unfundedMinimums should flag "low"
    expect(result.unfundedMinimums.map((u) => u.debtId)).toContain("low");
    expect(result.unfundedMinimums.map((u) => u.debtId)).not.toContain("high");
  });

  it("populates unfundedMinimums when total minimums exceed budget", () => {
    const debts = [
      makeDebt({ id: "a", balance: 5000, rate: 5, minPayment: 100 }),
      makeDebt({ id: "b", balance: 5000, rate: 5, minPayment: 100 }),
      makeDebt({ id: "c", balance: 5000, rate: 5, minPayment: 100 }),
    ];
    const result = simulate(debts, 150, "avalanche", 1);
    // 150 covers exactly 1.5 minimums → 1 fully covered, 1 partial, 1 short.
    expect(result.unfundedMinimums.length).toBeGreaterThanOrEqual(1);
    const totalShortfall = result.unfundedMinimums.reduce((s, u) => s + u.shortfall, 0);
    expect(totalShortfall).toBeGreaterThan(0);
    expect(result.insufficientBudget).toBe(true);
  });

  it("empty unfundedMinimums when budget covers all minimums", () => {
    const debts = [
      makeDebt({ id: "a", balance: 1000, rate: 0, minPayment: 50 }),
      makeDebt({ id: "b", balance: 1000, rate: 0, minPayment: 50 }),
    ];
    const result = simulate(debts, 200, "avalanche", 12);
    expect(result.unfundedMinimums).toEqual([]);
    expect(result.insufficientBudget).toBe(false);
  });
});
