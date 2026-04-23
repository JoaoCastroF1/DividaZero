import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { DexieRepo, MemoryRepo, type Repo } from "../../src/lib/repo";
import { DEFAULT_SETTINGS, type Debt, type Settings } from "../../src/lib/constants";

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

const customSettings: Settings = {
  monthlyIncome: 5000,
  monthlyExpenses: 2000,
  autoSort: false,
  motivationalMode: true,
  onboardingComplete: true,
};

const suites: { name: string; create: () => Promise<Repo> }[] = [
  {
    name: "DexieRepo",
    create: async () => {
      const repo = new DexieRepo();
      await repo.resetAll();
      return repo;
    },
  },
  {
    name: "MemoryRepo",
    create: async () => new MemoryRepo(),
  },
];

for (const { name, create } of suites) {
  describe(`Repo contract: ${name}`, () => {
    let repo: Repo;

    beforeEach(async () => {
      repo = await create();
    });

    describe("ensureInitialized", () => {
      it("does not create debts on first run", async () => {
        await repo.ensureInitialized();
        const { debts } = await repo.loadAll();
        expect(debts).toEqual([]);
      });

      it("is idempotent", async () => {
        await repo.ensureInitialized();
        await repo.ensureInitialized();
        const { debts, log } = await repo.loadAll();
        expect(debts).toEqual([]);
        expect(log).toEqual([]);
      });

      it("does not overwrite existing settings", async () => {
        await repo.saveSettings(customSettings);
        await repo.ensureInitialized();
        const { settings } = await repo.loadAll();
        expect(settings.monthlyIncome).toBe(5000);
        expect(settings.autoSort).toBe(false);
      });
    });

    describe("resetAll", () => {
      it("clears debts, log, and settings completely", async () => {
        await repo.putDebt(sampleDebt);
        await repo.saveSettings(customSettings);
        await repo.addLogEntry({
          id: "log-1",
          date: new Date().toISOString(),
          amount: 100,
          allocations: [],
          leftover: 0,
        });

        await repo.resetAll();

        const { debts, log, settings } = await repo.loadAll();
        expect(debts).toEqual([]);
        expect(log).toEqual([]);
        expect(settings).toEqual(DEFAULT_SETTINGS);
      });

      it("does not re-seed any data", async () => {
        await repo.putDebt(sampleDebt);
        await repo.resetAll();
        await repo.ensureInitialized();
        const { debts } = await repo.loadAll();
        expect(debts).toEqual([]);
      });
    });

    describe("loadAll", () => {
      it("returns DEFAULT_SETTINGS when no settings row exists", async () => {
        const { debts, log, settings } = await repo.loadAll();
        expect(debts).toEqual([]);
        expect(log).toEqual([]);
        expect(settings).toEqual(DEFAULT_SETTINGS);
      });
    });

    describe("CRUD", () => {
      it("putDebt / deleteDebt", async () => {
        await repo.putDebt(sampleDebt);
        let { debts } = await repo.loadAll();
        expect(debts).toHaveLength(1);
        expect(debts[0].name).toBe("Cartão Teste");

        await repo.deleteDebt(sampleDebt.id);
        ({ debts } = await repo.loadAll());
        expect(debts).toHaveLength(0);
      });

      it("bulkReplaceDebts replaces the entire set", async () => {
        await repo.putDebt(sampleDebt);
        await repo.bulkReplaceDebts([
          { ...sampleDebt, id: "new-1", name: "Novo A" },
          { ...sampleDebt, id: "new-2", name: "Novo B" },
        ]);
        const { debts } = await repo.loadAll();
        expect(debts).toHaveLength(2);
        expect(debts.map((d) => d.id).sort()).toEqual(["new-1", "new-2"]);
      });

      it("reads are isolated — mutating returned value does not affect repo", async () => {
        await repo.putDebt(sampleDebt);
        const first = await repo.loadAll();
        first.debts[0].paid = 9999;
        first.debts[0].name = "MUTATED";
        first.settings.monthlyIncome = 123456;

        const second = await repo.loadAll();
        expect(second.debts[0].paid).toBe(0);
        expect(second.debts[0].name).toBe("Cartão Teste");
        expect(second.settings.monthlyIncome).toBe(0);
      });

      it("log entries ordered by date desc", async () => {
        await repo.addLogEntry({
          id: "old",
          date: "2026-01-01T00:00:00Z",
          amount: 100,
          allocations: [],
          leftover: 0,
        });
        await repo.addLogEntry({
          id: "new",
          date: "2026-06-01T00:00:00Z",
          amount: 200,
          allocations: [],
          leftover: 0,
        });
        const { log } = await repo.loadAll();
        expect(log.map((e) => e.id)).toEqual(["new", "old"]);
      });
    });
  });
}
