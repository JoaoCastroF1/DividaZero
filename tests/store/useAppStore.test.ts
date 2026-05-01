import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { useAppStore } from "../../src/store/useAppStore";
import { MemoryRepo, setRepo, resetRepoSingleton } from "../../src/lib/repo";
import { DEFAULT_SETTINGS, type Debt, type Settings } from "../../src/lib/constants";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: overrides.id ?? `d-${Math.random().toString(36).slice(2, 8)}`,
    name: "Dívida Teste",
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

const customSettings: Settings = {
  monthlyIncome: 6000,
  monthlyExpenses: 2000,
  autoSort: true,
  motivationalMode: false,
  onboardingComplete: true,
};

describe("useAppStore", () => {
  let repo: MemoryRepo;

  beforeEach(async () => {
    repo = new MemoryRepo();
    setRepo(repo);
    useAppStore.setState({
      debts: [],
      log: [],
      settings: { ...DEFAULT_SETTINGS },
      loaded: false,
    });
  });

  describe("init", () => {
    it("loads empty state on first run", async () => {
      await useAppStore.getState().init();
      const s = useAppStore.getState();
      expect(s.loaded).toBe(true);
      expect(s.debts).toEqual([]);
      expect(s.log).toEqual([]);
      expect(s.settings).toEqual(DEFAULT_SETTINGS);
    });

    it("loads previously persisted data", async () => {
      const debt = makeDebt({ id: "persisted", name: "Cartão antigo" });
      await repo.putDebt(debt);
      await repo.saveSettings(customSettings);

      await useAppStore.getState().init();
      const s = useAppStore.getState();
      expect(s.debts).toHaveLength(1);
      expect(s.debts[0].name).toBe("Cartão antigo");
      expect(s.settings.monthlyIncome).toBe(6000);
    });
  });

  describe("saveDebt + deleteDebt", () => {
    it("adds a new debt", async () => {
      await useAppStore.getState().init();
      const debt = makeDebt({ id: "new-1", name: "Nova" });
      await useAppStore.getState().saveDebt(debt);

      expect(useAppStore.getState().debts).toHaveLength(1);
      expect(useAppStore.getState().debts[0].name).toBe("Nova");

      // persisted to repo
      const fromRepo = await repo.loadAll();
      expect(fromRepo.debts).toHaveLength(1);
    });

    it("updates an existing debt in place (no duplicate)", async () => {
      await useAppStore.getState().init();
      const debt = makeDebt({ id: "x", name: "Original" });
      await useAppStore.getState().saveDebt(debt);
      await useAppStore.getState().saveDebt({ ...debt, name: "Editada", balance: 5000 });

      const debts = useAppStore.getState().debts;
      expect(debts).toHaveLength(1);
      expect(debts[0].name).toBe("Editada");
      expect(debts[0].balance).toBe(5000);
    });

    it("removes a debt and persists removal", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "k" }));
      await useAppStore.getState().deleteDebt("k");

      expect(useAppStore.getState().debts).toHaveLength(0);
      const fromRepo = await repo.loadAll();
      expect(fromRepo.debts).toHaveLength(0);
    });
  });

  describe("distribute", () => {
    beforeEach(async () => {
      await useAppStore.getState().init();
    });

    it("ignores negative or zero amounts", async () => {
      await useAppStore.getState().saveDebt(makeDebt({ id: "a", balance: 1000, rate: 10 }));
      await useAppStore.getState().distribute(0);
      await useAppStore.getState().distribute(-50);
      expect(useAppStore.getState().log).toHaveLength(0);
      expect(useAppStore.getState().debts[0].paid).toBe(0);
    });

    it("pays in score order (avalanche by default) and creates a log entry", async () => {
      await useAppStore.getState().saveDebt(makeDebt({ id: "low", balance: 1000, rate: 2 }));
      await useAppStore.getState().saveDebt(makeDebt({ id: "high", balance: 1000, rate: 12 }));

      await useAppStore.getState().distribute(500);

      const { debts, log } = useAppStore.getState();
      const high = debts.find((d) => d.id === "high")!;
      const low = debts.find((d) => d.id === "low")!;
      expect(high.paid).toBe(500);
      expect(low.paid).toBe(0);
      expect(log).toHaveLength(1);
      expect(log[0].amount).toBe(500);
      expect(log[0].allocations[0].debtId).toBe("high");
      expect(log[0].leftover).toBe(0);
    });

    it("marks a debt as done when fully paid and overflows to next", async () => {
      await useAppStore.getState().saveDebt(makeDebt({ id: "small", balance: 200, rate: 10 }));
      await useAppStore.getState().saveDebt(makeDebt({ id: "big", balance: 5000, rate: 5 }));

      await useAppStore.getState().distribute(800);

      const { debts } = useAppStore.getState();
      const small = debts.find((d) => d.id === "small")!;
      const big = debts.find((d) => d.id === "big")!;
      expect(small.done).toBe(true);
      expect(small.paid).toBe(200);
      expect(big.paid).toBe(600);
    });

    it("records leftover when no active debts can absorb the amount", async () => {
      await useAppStore
        .getState()
        .saveDebt(makeDebt({ id: "done", balance: 100, paid: 100, done: true, rate: 5 }));
      await useAppStore.getState().distribute(500);

      const { log } = useAppStore.getState();
      expect(log[0].leftover).toBe(500);
      expect(log[0].allocations).toHaveLength(0);
    });
  });

  describe("undoLog (LIFO)", () => {
    beforeEach(async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "a", balance: 1000, rate: 10 }));
    });

    it("reverts the most recent payment", async () => {
      await useAppStore.getState().distribute(300);
      const logId = useAppStore.getState().log[0].id;

      await useAppStore.getState().undoLog(logId);

      expect(useAppStore.getState().debts[0].paid).toBe(0);
      expect(useAppStore.getState().log).toHaveLength(0);
    });

    it("ignores undo of non-latest entries (LIFO contract)", async () => {
      await useAppStore.getState().distribute(100);
      const firstId = useAppStore.getState().log[0].id;
      await useAppStore.getState().distribute(150);

      await useAppStore.getState().undoLog(firstId);

      expect(useAppStore.getState().log).toHaveLength(2);
      expect(useAppStore.getState().debts[0].paid).toBe(250);
    });

    it("restores done=false when undoing a payment that finished a debt", async () => {
      await useAppStore.getState().distribute(1000);
      expect(useAppStore.getState().debts[0].done).toBe(true);

      const logId = useAppStore.getState().log[0].id;
      await useAppStore.getState().undoLog(logId);

      expect(useAppStore.getState().debts[0].done).toBe(false);
      expect(useAppStore.getState().debts[0].paid).toBe(0);
    });
  });

  describe("toggleDone", () => {
    it("marks a debt done and sets paid=balance", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "a", balance: 800, paid: 200 }));
      await useAppStore.getState().toggleDone("a");
      const d = useAppStore.getState().debts[0];
      expect(d.done).toBe(true);
      expect(d.paid).toBe(800);
    });

    it("reverts done flag without exceeding balance", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(
        makeDebt({ id: "a", balance: 800, paid: 800, done: true }),
      );
      await useAppStore.getState().toggleDone("a");
      const d = useAppStore.getState().debts[0];
      expect(d.done).toBe(false);
      expect(d.paid).toBe(800);
    });
  });

  describe("reset", () => {
    it("clears debts, log, and settings to defaults", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().updateSettings(customSettings);
      await useAppStore.getState().saveDebt(makeDebt({ id: "x" }));
      await useAppStore.getState().distribute(100);

      await useAppStore.getState().reset();

      const s = useAppStore.getState();
      expect(s.debts).toEqual([]);
      expect(s.log).toEqual([]);
      expect(s.settings).toEqual(DEFAULT_SETTINGS);
      const fromRepo = await repo.loadAll();
      expect(fromRepo.debts).toEqual([]);
      expect(fromRepo.settings).toEqual(DEFAULT_SETTINGS);
    });

    it("re-triggers onboarding by clearing onboardingComplete", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().updateSettings({ onboardingComplete: true });
      expect(useAppStore.getState().settings.onboardingComplete).toBe(true);

      await useAppStore.getState().reset();
      expect(useAppStore.getState().settings.onboardingComplete).toBe(false);
    });
  });

  describe("updateSettings + replaceAll", () => {
    it("merges patches into current settings", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().updateSettings({ monthlyIncome: 4000 });
      await useAppStore.getState().updateSettings({ motivationalMode: true });

      const s = useAppStore.getState().settings;
      expect(s.monthlyIncome).toBe(4000);
      expect(s.motivationalMode).toBe(true);
      expect(s.autoSort).toBe(true);
    });

    it("replaceAll swaps the entire dataset", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "old" }));

      const newDebts = [makeDebt({ id: "new-1", name: "Nova A" }), makeDebt({ id: "new-2", name: "Nova B" })];
      await useAppStore.getState().replaceAll(newDebts, [], customSettings);

      const s = useAppStore.getState();
      expect(s.debts).toHaveLength(2);
      expect(s.debts.map((d) => d.id).sort()).toEqual(["new-1", "new-2"]);
      expect(s.settings.monthlyIncome).toBe(6000);
    });
  });

  describe("importDebts", () => {
    it("appends debts and persists them", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "existing" }));
      await useAppStore.getState().importDebts([
        makeDebt({ id: "imp-1" }),
        makeDebt({ id: "imp-2" }),
      ]);

      expect(useAppStore.getState().debts).toHaveLength(3);
      const fromRepo = await repo.loadAll();
      expect(fromRepo.debts).toHaveLength(3);
    });

    it("noop on empty list", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "x" }));
      await useAppStore.getState().importDebts([]);
      expect(useAppStore.getState().debts).toHaveLength(1);
    });
  });

  describe("moveUp", () => {
    it("swaps a debt with the one above it", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "a" }));
      await useAppStore.getState().saveDebt(makeDebt({ id: "b" }));
      await useAppStore.getState().saveDebt(makeDebt({ id: "c" }));

      await useAppStore.getState().moveUp("c");

      expect(useAppStore.getState().debts.map((d) => d.id)).toEqual(["a", "c", "b"]);
    });

    it("noop on first item", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "a" }));
      await useAppStore.getState().saveDebt(makeDebt({ id: "b" }));

      await useAppStore.getState().moveUp("a");

      expect(useAppStore.getState().debts.map((d) => d.id)).toEqual(["a", "b"]);
    });
  });

  describe("clearLog", () => {
    it("empties the log without touching debts", async () => {
      await useAppStore.getState().init();
      await useAppStore.getState().saveDebt(makeDebt({ id: "a", balance: 1000, rate: 10 }));
      await useAppStore.getState().distribute(200);

      await useAppStore.getState().clearLog();

      expect(useAppStore.getState().log).toEqual([]);
      expect(useAppStore.getState().debts[0].paid).toBe(200);
    });
  });
});

// Restore the singleton so other test files using getRepo() get a real DexieRepo.
afterAll(() => {
  resetRepoSingleton();
});
