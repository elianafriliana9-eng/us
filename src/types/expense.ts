export type ExpenseCategory =
  | "food"
  | "date"
  | "shopping"
  | "transport"
  | "travel"
  | "bills"
  | "gift"
  | "settlement"
  | "other";

export type SplitType = "equal" | "full_payer" | "custom";

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  payerId: string;
  payerName: string;
  splitType: SplitType;
  customOwedAmount?: number; // How much the other partner owes (if custom)
  isSettled?: boolean;
  settledAt?: number;
  notes?: string;
  createdAt: number;
  createdBy: string;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  payerId: string;
  payerName: string;
  splitType: SplitType;
  customOwedAmount?: number;
  notes?: string;
}
