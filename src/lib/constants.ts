export const EPSILON = 0.01;
export const STORAGE_KEY_LEGACY = "debt-app-v9";
export const PERSIST_DEBOUNCE_MS = 400;

export const TYPES = {
  cheque_especial: { label: "Cheque Esp.", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  cartao: { label: "Cartão", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  emprestimo: { label: "Empréstimo", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  financiamento: { label: "Financ.", color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
} as const;

export type DebtType = keyof typeof TYPES;

export const VALID_TYPES = Object.keys(TYPES) as DebtType[];

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  rate: number;
  penaltyRate: number;
  graceDaysLeft: number;
  dueDate: string;
  discountPct: number;
  minPayment: number;
  note: string;
  paid: number;
  done: boolean;
}

export interface Settings {
  monthlyIncome: number;
  monthlyExpenses: number;
  autoSort: boolean;
}

export interface Allocation {
  debtId: string;
  name: string;
  pay: number;
  prevPaid: number;
  prevDone: boolean;
}

export interface LogEntry {
  id: string;
  date: string;
  amount: number;
  allocations: Allocation[];
  leftover: number;
}

export const DEFAULT_SETTINGS: Settings = {
  monthlyIncome: 27500,
  monthlyExpenses: 11500,
  autoSort: true,
};

export const INITIAL_DEBTS: Debt[] = [
  { id: "d1", name: "Cheque Esp. Caixa", type: "cheque_especial", balance: 1828.44, rate: 8, penaltyRate: 8, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 1828.44, note: "QUITADO 14/04.", done: true, paid: 1828.44 },
  { id: "d4", name: "Fatura Inter Gold", type: "cartao", balance: 6464.78, rate: 0, penaltyRate: 14, graceDaysLeft: 0, dueDate: "2026-04-20", discountPct: 0, minPayment: 969.72, note: "QUITADO 15/04.", done: true, paid: 6464.78 },
  { id: "d5", name: "Fatura Personnalité", type: "cartao", balance: 5513.06, rate: 0, penaltyRate: 14, graceDaysLeft: 0, dueDate: "2026-04-20", discountPct: 0, minPayment: 826.96, note: "QUITADO 15/04.", done: true, paid: 5513.06 },
  { id: "d2", name: "Cheque Esp. Itaú", type: "cheque_especial", balance: 4200, rate: 0, penaltyRate: 8, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 4200, note: "QUITADO 15/04.", done: true, paid: 4200 },
  { id: "d3", name: "Cheque Esp. SICOOB", type: "cheque_especial", balance: 3295, rate: 0, penaltyRate: 8, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 3295, note: "QUITADO 15/04.", done: true, paid: 3295 },
  { id: "d7", name: "InfinityPay", type: "emprestimo", balance: 2030.58, rate: 4, penaltyRate: 4, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 507.65, note: "QUITADO 15/04.", done: true, paid: 2030.58 },
  { id: "d9a", name: "MP 21/mar", type: "emprestimo", balance: 4560.72, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 760, note: "QUITADO 15/04. Desc 27%.", done: true, paid: 4560.72 },
  { id: "d6", name: "MP Dinheiro Express", type: "emprestimo", balance: 1237.70, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 1237.70, note: "Parcela única.", done: false, paid: 0 },
  { id: "d8", name: "MP Parcelas Fixas", type: "emprestimo", balance: 5484.72, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 914.12, note: "Simular desconto.", done: false, paid: 0 },
  { id: "d9b", name: "MP 20/mar", type: "emprestimo", balance: 1301.25, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 433.75, note: "Simular desconto.", done: false, paid: 0 },
  { id: "d9c", name: "MP 22/mar", type: "emprestimo", balance: 779.40, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 259.80, note: "Simular desconto.", done: false, paid: 0 },
  { id: "d9d", name: "MP Extra 09/abr", type: "emprestimo", balance: 1900.46, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 633.49, note: "Simular desconto.", done: false, paid: 0 },
  { id: "d9e", name: "MP 13/mar (A)", type: "emprestimo", balance: 232.80, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 232.80, note: "Quitar rápido.", done: false, paid: 0 },
  { id: "d9f", name: "MP 13/mar (B)", type: "emprestimo", balance: 232.80, rate: 5.5, penaltyRate: 5.5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 232.80, note: "Quitar rápido.", done: false, paid: 0 },
  { id: "d10", name: "99Pay", type: "emprestimo", balance: 11930.60, rate: 5, penaltyRate: 5, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 703.92, note: "17 parcelas.", done: false, paid: 0 },
  { id: "d11", name: "SICOOB #1", type: "emprestimo", balance: 5331.08, rate: 2.69, penaltyRate: 2.69, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 727, note: "8 parcelas.", done: false, paid: 0 },
  { id: "d12", name: "SICOOB #2", type: "emprestimo", balance: 18896.83, rate: 2.76, penaltyRate: 2.76, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 1141, note: "21 parcelas.", done: false, paid: 0 },
  { id: "d13", name: "Financ. CEF", type: "financiamento", balance: 61337.66, rate: 1.01, penaltyRate: 1.01, graceDaysLeft: 0, dueDate: "", discountPct: 0, minPayment: 929.41, note: "SAC 12,73% a.a.", done: false, paid: 0 },
];
