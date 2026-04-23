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
  motivationalMode: boolean;
  onboardingComplete: boolean;
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
  monthlyIncome: 0,
  monthlyExpenses: 0,
  autoSort: true,
  motivationalMode: false,
  onboardingComplete: false,
};
