import type { Debt, LogEntry, Settings } from "../constants";

export interface UserScope {
  userId?: string;
}

export interface Repo {
  ensureInitialized(scope?: UserScope): Promise<void>;
  loadAll(scope?: UserScope): Promise<{ debts: Debt[]; log: LogEntry[]; settings: Settings }>;
  saveSettings(settings: Settings, scope?: UserScope): Promise<void>;
  putDebt(debt: Debt, scope?: UserScope): Promise<void>;
  deleteDebt(id: string, scope?: UserScope): Promise<void>;
  bulkReplaceDebts(debts: Debt[], scope?: UserScope): Promise<void>;
  addLogEntry(entry: LogEntry, scope?: UserScope): Promise<void>;
  deleteLogEntry(id: string, scope?: UserScope): Promise<void>;
  clearLog(scope?: UserScope): Promise<void>;
  resetAll(scope?: UserScope): Promise<void>;
}
