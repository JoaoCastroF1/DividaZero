import Dexie, { type Table } from "dexie";
import type { Debt, LogEntry, Settings } from "../constants";
import { DEFAULT_SETTINGS, STORAGE_KEY_LEGACY } from "../constants";
import { normalizeDebt } from "../validation";
import type { Repo } from "./types";

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

export class DexieRepo implements Repo {
  readonly db: DividaZeroDB;

  constructor(db?: DividaZeroDB) {
    this.db = db ?? new DividaZeroDB();
  }

  async ensureInitialized(): Promise<void> {
    const settingsRow = await this.db.settings.get("singleton");
    if (settingsRow) return;
    await this.migrateFromLegacy();
  }

  async loadAll(): Promise<{ debts: Debt[]; log: LogEntry[]; settings: Settings }> {
    const [debts, log, settingsRow] = await Promise.all([
      this.db.debts.toArray(),
      this.db.log.orderBy("date").reverse().toArray(),
      this.db.settings.get("singleton"),
    ]);
    return {
      debts,
      log,
      settings: settingsRow
        ? {
            monthlyIncome: settingsRow.monthlyIncome,
            monthlyExpenses: settingsRow.monthlyExpenses,
            autoSort: settingsRow.autoSort,
            motivationalMode: settingsRow.motivationalMode ?? false,
            onboardingComplete: settingsRow.onboardingComplete ?? true,
          }
        : { ...DEFAULT_SETTINGS },
    };
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.db.settings.put({ id: "singleton", ...settings });
  }

  async putDebt(debt: Debt): Promise<void> {
    await this.db.debts.put(debt);
  }

  async deleteDebt(id: string): Promise<void> {
    await this.db.debts.delete(id);
  }

  async bulkReplaceDebts(debts: Debt[]): Promise<void> {
    await this.db.transaction("rw", this.db.debts, async () => {
      await this.db.debts.clear();
      if (debts.length > 0) await this.db.debts.bulkAdd(debts);
    });
  }

  async addLogEntry(entry: LogEntry): Promise<void> {
    await this.db.log.add(entry);
  }

  async deleteLogEntry(id: string): Promise<void> {
    await this.db.log.delete(id);
  }

  async clearLog(): Promise<void> {
    await this.db.log.clear();
  }

  async resetAll(): Promise<void> {
    await this.db.transaction("rw", this.db.debts, this.db.log, this.db.settings, async () => {
      await this.db.debts.clear();
      await this.db.log.clear();
      await this.db.settings.clear();
    });
  }

  private async migrateFromLegacy(): Promise<boolean> {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY_LEGACY) : null;
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

      await this.db.transaction("rw", this.db.debts, this.db.log, this.db.settings, async () => {
        if (debts.length > 0) await this.db.debts.bulkAdd(debts);
        if (log.length > 0) await this.db.log.bulkAdd(log);
        await this.db.settings.put({ id: "singleton", ...settings });
      });
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      return true;
    } catch {
      return false;
    }
  }
}
