import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db, ensureInitialized, resetAll, loadAll, putDebt } from "../../src/lib/db";
import { DEFAULT_SETTINGS, type Debt } from "../../src/lib/constants";

const sampleDebt: Debt = {
  id: "test-1",
  name: "Cartão Teste",
  type: "cartao",
  balance: 1000,
  rate: 10,
  penaltyRate: 10,
  graceDaysLeft: 0,
  dueDate: "",
  discountPct: 0,
  minPayment: 100,
  note: "",
  paid: 0,
  done: false,
};

describe("db", () => {
  beforeEach(async () => {
    await db.debts.clear();
    await db.log.clear();
    await db.settings.clear();
  });

  describe("ensureInitialized", () => {
    it("does not create debts on first run", async () => {
      await ensureInitialized();
      const count = await db.debts.count();
      expect(count).toBe(0);
    });

    it("is idempotent", async () => {
      await ensureInitialized();
      await ensureInitialized();
      await ensureInitialized();
      expect(await db.debts.count()).toBe(0);
      expect(await db.log.count()).toBe(0);
    });

    it("does not overwrite existing settings on second run", async () => {
      await db.settings.put({
        id: "singleton",
        monthlyIncome: 5000,
        monthlyExpenses: 2000,
        autoSort: false,
        motivationalMode: true,
        onboardingComplete: true,
      });
      await ensureInitialized();
      const row = await db.settings.get("singleton");
      expect(row?.monthlyIncome).toBe(5000);
      expect(row?.autoSort).toBe(false);
    });
  });

  describe("resetAll", () => {
    it("clears debts, log, and settings completely", async () => {
      await putDebt(sampleDebt);
      await db.settings.put({
        id: "singleton",
        monthlyIncome: 5000,
        monthlyExpenses: 2000,
        autoSort: true,
        motivationalMode: false,
        onboardingComplete: true,
      });

      await resetAll();

      expect(await db.debts.count()).toBe(0);
      expect(await db.log.count()).toBe(0);
      expect(await db.settings.count()).toBe(0);
    });

    it("does not re-seed any data", async () => {
      await putDebt(sampleDebt);
      await resetAll();
      await ensureInitialized();
      expect(await db.debts.count()).toBe(0);
    });
  });

  describe("loadAll", () => {
    it("returns DEFAULT_SETTINGS when no settings row exists", async () => {
      const { debts, log, settings } = await loadAll();
      expect(debts).toEqual([]);
      expect(log).toEqual([]);
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("defaults onboardingComplete to true for existing rows without the field", async () => {
      await db.settings.put({
        id: "singleton",
        monthlyIncome: 3000,
        monthlyExpenses: 1000,
        autoSort: true,
      } as never);
      const { settings } = await loadAll();
      expect(settings.onboardingComplete).toBe(true);
      expect(settings.motivationalMode).toBe(false);
    });
  });
});
