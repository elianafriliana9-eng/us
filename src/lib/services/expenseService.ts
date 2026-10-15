import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { Expense, CreateExpenseInput } from "@/types/expense";
import { CurrentUser } from "@/types/room";

export async function createExpense(
  roomId: string,
  author: CurrentUser,
  input: CreateExpenseInput
): Promise<Expense> {
  const expenseRef = doc(collection(db, "rooms", roomId, "expenses"));
  const expenseId = expenseRef.id;

  const newExpense: Expense = {
    id: expenseId,
    title: input.title.trim(),
    amount: Math.round(Number(input.amount)),
    category: input.category,
    date: input.date,
    payerId: input.payerId,
    payerName: input.payerName,
    splitType: input.splitType,
    customOwedAmount:
      input.splitType === "custom" && input.customOwedAmount !== undefined
        ? Math.round(Number(input.customOwedAmount))
        : undefined,
    notes: input.notes?.trim() || undefined,
    isSettled: false,
    createdAt: Date.now(),
    createdBy: author.id,
  };

  await setDoc(expenseRef, removeUndefinedFields(newExpense));
  return newExpense;
}

export function subscribeToExpenses(
  roomId: string,
  onUpdate: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "expenses"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const expenses: Expense[] = [];
      snapshot.forEach((docSnap) => {
        expenses.push(docSnap.data() as Expense);
      });

      // Sort by date descending, then createdAt descending without requiring a composite index
      expenses.sort((a, b) => {
        if (b.date !== a.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });

      onUpdate(expenses);
    },
    (error) => {
      console.error("Error subscribing to expenses:", error);
    }
  );
}

export async function deleteExpense(roomId: string, expenseId: string): Promise<void> {
  const ref = doc(db, "rooms", roomId, "expenses", expenseId);
  await deleteDoc(ref);
}

export async function toggleExpenseSettled(
  roomId: string,
  expenseId: string,
  isSettled: boolean
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "expenses", expenseId);
  await updateDoc(ref, {
    isSettled,
    settledAt: isSettled ? Date.now() : null,
  });
}

/**
 * Marks all unsettled expenses as settled in one batch.
 */
export async function settleAllExpenses(
  roomId: string,
  expensesToSettle: Expense[]
): Promise<void> {
  const now = Date.now();
  const promises = expensesToSettle
    .filter((e) => !e.isSettled)
    .map((e) =>
      updateDoc(doc(db, "rooms", roomId, "expenses", e.id), {
        isSettled: true,
        settledAt: now,
      })
    );
  await Promise.all(promises);
}

/**
 * Creates a settlement transaction to record full repayment between partners.
 */
export async function recordSettlement(
  roomId: string,
  author: CurrentUser,
  payerId: string,
  payerName: string,
  amount: number,
  receiverName: string
): Promise<Expense> {
  const expenseRef = doc(collection(db, "rooms", roomId, "expenses"));
  const todayStr = new Date().toISOString().split("T")[0];

  const settlementExpense: Expense = {
    id: expenseRef.id,
    title: `Pelunasan ke ${receiverName}`,
    amount: Math.round(amount),
    category: "settlement",
    date: todayStr,
    payerId,
    payerName,
    splitType: "custom",
    customOwedAmount: 0,
    notes: `Pelunasan hutang oleh ${payerName}`,
    isSettled: true,
    settledAt: Date.now(),
    createdAt: Date.now(),
    createdBy: author.id,
  };

  await setDoc(expenseRef, settlementExpense);
  return settlementExpense;
}

