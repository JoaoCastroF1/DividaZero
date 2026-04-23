import Dexie, { type Table } from "dexie";
import type { Debt, LogEntry, Settings } from "./constants";
import { DEFAULT_SETTINGS, INITIAL_DEBTS, STORAGE_KEY_LEGACY } from "./constants";
import { normalizeDebt } from "./validation";

export interface SettingsRow extends Settings {
  id: "singleton";
}

class DividaZeroDB extends Dexie {
  debts!: Table<Debt, string>;
  log!: Table<LogEntry, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("dividazero");
    this.version(1).stores({
      debts: "id, done, balance",
      log: "id, date",
      settings: "id",
    });
  }
}

export const db = new DividaZeroDB();

export async function loadAll(): Promise<{ debts: Debt[]; log: LogEntry[]; settings: Settings }> {
  const [debts, log, settingsRow] = await Promise.all([
    db.debts.toArray(),
    db.log.orderBy("date").reverse().toArray(),
    db.settings.get("singleton"),
  ]);
  return {
    debts,
    log,
    settings: settingsRow
      ? { monthlyIncome: settingsRow.monthlyIncome, monthlyExpenses: settingsRow.monthlyExpenses, autoSort: settingsRow.autoSort }
      : DEFAULT_SETTINGS,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ id: "singleton", ...settings });
}

export async function bulkReplaceDebts(debts: Debt[]): Promise<void> {
  await db.transaction("rw", db.debts, async () => {
    await db.debts.clear();
    if (debts.length > 0) await db.debts.bulkAdd(debts);
  });
}

export async function putDebt(debt: Debt): Promise<void> {
  await db.debts.put(debt);
}

export async function deleteDebt(id: string): Promise<void> {
  await db.debts.delete(id);
}

export async function addLogEntry(entry: LogEntry): Promise<void> {
  await db.log.add(entry);
}

export async function deleteLogEntry(id: string): Promise<void> {
  await db.log.delete(id);
}

export async function clearLog(): Promise<void> {
  await db.log.clear();
}

export async function resetAll(): Promise<void> {
  await db.transaction("rw", db.debts, db.log, db.settings, async () => {
    await db.debts.clear();
    await db.log.clear();
    await db.settings.clear();
    await db.debts.bulkAdd(INITIAL_DEBTS);
    await db.settings.put({ id: "singleton", ...DEFAULT_SETTINGS });
  });
}

async function migrateFromLegacy(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    const debts = Array.isArray(parsed.debts) ? parsed.debts.map(normalizeDebt).filter(Boolean) as Debt[] : [];
    const log = Array.isArray(parsed.log)
      ? (parsed.log as Array<Partial<LogEntry>>).map((e, i) => ({
          id: e.id || `legacy-${i}`,
          date: e.date || new Date().toISOString(),
          amount: Number(e.amount) || 0,
          allocations: Array.isArray(e.allocations)
            ? e.allocations.map((a) => ({
                debtId: (a as { debtId?: string; id?: string }).debtId || (a as { id?: string }).id || "",
                name: (a as { name?: string }).name || "",
                pay: Number((a as { pay?: number }).pay) || 0,
                prevPaid: Number((a as { prevPaid?: number }).prevPaid) || 0,
                prevDone: Boolean((a as { prevDone?: boolean }).prevDone),
              }))
            : [],
          leftover: Number(e.leftover) || 0,
        }))
      : [];
    const settings = parsed.settings && typeof parsed.settings === "object"
      ? { ...DEFAULT_SETTINGS, ...parsed.settings }
      : DEFAULT_SETTINGS;

    await db.transaction("rw", db.debts, db.log, db.settings, async () => {
      if (debts.length > 0) await db.debts.bulkAdd(debts);
      if (log.length > 0) await db.log.bulkAdd(log);
      await db.settings.put({ id: "singleton", ...settings });
    });
    localStorage.removeItem(STORAGE_KEY_LEGACY);
    return true;
  } catch {
    return false;
  }
}

export async function ensureSeeded(): Promise<void> {
  const settingsRow = await db.settings.get("singleton");
  if (settingsRow) return;

  const existingDebts = await db.debts.count();
  if (existingDebts > 0) {
    await db.settings.put({ id: "singleton", ...DEFAULT_SETTINGS });
    return;
  }

  const migrated = await migrateFromLegacy();
  if (migrated) return;

  await db.transaction("rw", db.debts, db.settings, async () => {
    await db.debts.bulkAdd(INITIAL_DEBTS);
    await db.settings.put({ id: "singleton", ...DEFAULT_SETTINGS });
  });
}
