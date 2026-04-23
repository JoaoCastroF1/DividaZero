import { z } from "zod";
import { VALID_TYPES, type Debt, type DebtType, type Settings, type LogEntry } from "./constants";
import { clamp, parseNumber, uid } from "./format";

export const debtSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório").max(80),
  type: z.enum(VALID_TYPES as [DebtType, ...DebtType[]]),
  balance: z.number().positive("Saldo deve ser maior que zero"),
  rate: z.number().min(0),
  penaltyRate: z.number().min(0),
  graceDaysLeft: z.number().int().min(0),
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida").or(z.literal("")),
  discountPct: z.number().min(0).max(99.99),
  minPayment: z.number().min(0),
  note: z.string().max(200).default(""),
  paid: z.number().min(0).default(0),
  done: z.boolean().default(false),
});

export function normalizeDebt(raw: unknown): Debt | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.name || "").trim() || "Dívida sem nome";
  const typeRaw = r.type as string;
  const type: DebtType = VALID_TYPES.includes(typeRaw as DebtType) ? (typeRaw as DebtType) : "emprestimo";
  const balance = Math.max(0, parseNumber(r.balance));
  if (balance <= 0) return null;
  const rate = Math.max(0, parseNumber(r.rate));
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(r.dueDate || "")) ? String(r.dueDate) : "";
  return {
    id: (r.id as string) || uid(),
    name: name.slice(0, 80),
    type,
    balance,
    rate,
    penaltyRate: Math.max(0, parseNumber(r.penaltyRate ?? rate)),
    graceDaysLeft: Math.max(0, parseInt(String(r.graceDaysLeft)) || 0),
    dueDate,
    discountPct: clamp(parseNumber(r.discountPct), 0, 99.99),
    minPayment: Math.max(0, parseNumber(r.minPayment)),
    note: String(r.note || "").slice(0, 200),
    paid: Math.max(0, Math.min(balance, parseNumber(r.paid))),
    done: Boolean(r.done),
  };
}

export const exportSchema = z.object({
  version: z.literal(1),
  debts: z.array(z.unknown()),
  log: z.array(z.unknown()),
  settings: z.object({
    monthlyIncome: z.number(),
    monthlyExpenses: z.number(),
    autoSort: z.boolean(),
  }),
});

export interface ExportData {
  version: 1;
  debts: Debt[];
  log: LogEntry[];
  settings: Settings;
}
