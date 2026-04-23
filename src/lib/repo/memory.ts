import type { Debt, LogEntry, Settings } from "../constants";
import { DEFAULT_SETTINGS } from "../constants";
import type { Repo } from "./types";

export class MemoryRepo implements Repo {
  private debts = new Map<string, Debt>();
  private logEntries = new Map<string, LogEntry>();
  private settings: Settings | null = null;

  async ensureInitialized(): Promise<void> {}

  async loadAll(): Promise<{ debts: Debt[]; log: LogEntry[]; settings: Settings }> {
    return {
      debts: Array.from(this.debts.values()),
      log: Array.from(this.logEntries.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
      settings: this.settings ?? DEFAULT_SETTINGS,
    };
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.settings = { ...settings };
  }

  async putDebt(debt: Debt): Promise<void> {
    this.debts.set(debt.id, { ...debt });
  }

  async deleteDebt(id: string): Promise<void> {
    this.debts.delete(id);
  }

  async bulkReplaceDebts(debts: Debt[]): Promise<void> {
    this.debts.clear();
    for (const d of debts) this.debts.set(d.id, { ...d });
  }

  async addLogEntry(entry: LogEntry): Promise<void> {
    this.logEntries.set(entry.id, { ...entry });
  }

  async deleteLogEntry(id: string): Promise<void> {
    this.logEntries.delete(id);
  }

  async clearLog(): Promise<void> {
    this.logEntries.clear();
  }

  async resetAll(): Promise<void> {
    this.debts.clear();
    this.logEntries.clear();
    this.settings = null;
  }
}
