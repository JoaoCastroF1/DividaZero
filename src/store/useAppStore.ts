import { create } from "zustand";
import { EPSILON, type Debt, type LogEntry, type Settings, DEFAULT_SETTINGS } from "../lib/constants";
import { sortDebts } from "../lib/score";
import { uid } from "../lib/format";
import { createRepo } from "../lib/repo";

const repo = createRepo();

interface AppState {
  debts: Debt[];
  log: LogEntry[];
  settings: Settings;
  loaded: boolean;

  init: () => Promise<void>;
  distribute: (amount: number) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  saveDebt: (debt: Debt) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  importDebts: (debts: Debt[]) => Promise<void>;
  moveUp: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
  clearLog: () => Promise<void>;
  undoLog: (id: string) => Promise<void>;
  replaceAll: (debts: Debt[], log: LogEntry[], settings: Settings) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  debts: [],
  log: [],
  settings: DEFAULT_SETTINGS,
  loaded: false,

  init: async () => {
    await repo.ensureInitialized();
    const { debts, log, settings } = await repo.loadAll();
    set({ debts, log, settings, loaded: true });
  },

  distribute: async (amount: number) => {
    if (amount <= 0) return;
    const { debts, settings, log } = get();
    let remaining = amount;
    const next = debts.map((d) => ({ ...d }));
    const order = settings.autoSort ? sortDebts(next) : next;
    const map = new Map(next.map((d) => [d.id, d]));
    const allocations: LogEntry["allocations"] = [];

    for (const s of order) {
      if (remaining <= EPSILON) break;
      const d = map.get(s.id);
      if (!d || d.done) continue;
      const owed = Math.max(0, d.balance - (d.paid || 0));
      if (owed <= EPSILON) continue;
      const prevPaid = d.paid || 0;
      const prevDone = d.done;
      const pay = Math.min(remaining, owed);
      d.paid = prevPaid + pay;
      remaining -= pay;
      allocations.push({ debtId: d.id, name: d.name, pay, prevPaid, prevDone });
      if (d.balance - d.paid <= EPSILON) d.done = true;
    }

    const entry: LogEntry = {
      id: uid(),
      date: new Date().toISOString(),
      amount,
      allocations,
      leftover: remaining,
    };

    await repo.bulkReplaceDebts(next);
    await repo.addLogEntry(entry);
    set({ debts: next, log: [entry, ...log].slice(0, 100) });
  },

  toggleDone: async (id: string) => {
    const { debts } = get();
    const target = debts.find((d) => d.id === id);
    if (!target) return;
    const newDone = !target.done;
    const updated: Debt = {
      ...target,
      done: newDone,
      paid: newDone ? target.balance : Math.min(target.paid || 0, target.balance),
    };
    await repo.putDebt(updated);
    set({ debts: debts.map((d) => (d.id === id ? updated : d)) });
  },

  saveDebt: async (debt: Debt) => {
    const { debts } = get();
    const exists = debts.some((d) => d.id === debt.id);
    await repo.putDebt(debt);
    set({
      debts: exists
        ? debts.map((d) => (d.id === debt.id ? debt : d))
        : [...debts, debt],
    });
  },

  deleteDebt: async (id: string) => {
    const { debts } = get();
    await repo.deleteDebt(id);
    set({ debts: debts.filter((d) => d.id !== id) });
  },

  importDebts: async (newDebts: Debt[]) => {
    if (newDebts.length === 0) return;
    const { debts } = get();
    const next = [...debts, ...newDebts];
    for (const d of newDebts) await repo.putDebt(d);
    set({ debts: next });
  },

  moveUp: async (id: string) => {
    const { debts } = get();
    const idx = debts.findIndex((d) => d.id === id);
    if (idx <= 0) return;
    const next = [...debts];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    await repo.bulkReplaceDebts(next);
    set({ debts: next });
  },

  updateSettings: async (patch: Partial<Settings>) => {
    const { settings } = get();
    const next = { ...settings, ...patch };
    await repo.saveSettings(next);
    set({ settings: next });
  },

  reset: async () => {
    await repo.resetAll();
    const { debts, log, settings } = await repo.loadAll();
    set({ debts, log, settings });
  },

  clearLog: async () => {
    await repo.clearLog();
    set({ log: [] });
  },

  undoLog: async (id: string) => {
    const { debts, log } = get();
    if (log[0]?.id !== id) return;
    const entry = log[0];
    const map = new Map(debts.map((d) => [d.id, { ...d }]));
    for (const a of entry.allocations) {
      const d = map.get(a.debtId);
      if (!d) continue;
      d.paid = a.prevPaid;
      d.done = a.prevDone;
    }
    const next = debts.map((d) => map.get(d.id) || d);
    await repo.bulkReplaceDebts(next);
    await repo.deleteLogEntry(id);
    set({ debts: next, log: log.slice(1) });
  },

  replaceAll: async (debts: Debt[], log: LogEntry[], settings: Settings) => {
    await repo.bulkReplaceDebts(debts);
    await repo.clearLog();
    for (const e of log) await repo.addLogEntry(e);
    await repo.saveSettings(settings);
    set({ debts, log, settings });
  },
}));
