"use client";

import { useEffect, useState, useMemo } from "react";
import { useRoomStore } from "@/stores/roomStore";
import {
  subscribeToExpenses,
  deleteExpense,
  toggleExpenseSettled,
} from "@/lib/services/expenseService";
import { Expense, ExpenseCategory } from "@/types/expense";
import { AddExpenseModal } from "@/components/expenses/add-expense-modal";
import { SettleModal } from "@/components/expenses/settle-modal";
import { formatRupiah } from "@/lib/utils";
import {
  Wallet,
  Plus,
  Utensils,
  Film,
  ShoppingBag,
  Car,
  Plane,
  Receipt,
  Gift,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Trash2,
  TrendingUp,
  CreditCard,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_MAP: Record<
  ExpenseCategory,
  { label: string; icon: any; color: string; bg: string }
> = {
  food: { label: "Makan & Jajan", icon: Utensils, color: "#b80035", bg: "#ffdada" },
  date: { label: "Kencan & Nonton", icon: Film, color: "#d946ef", bg: "#fae8ff" },
  shopping: { label: "Belanja", icon: ShoppingBag, color: "#ea580c", bg: "#ffedd5" },
  transport: { label: "Bensin & Ojol", icon: Car, color: "#0284c7", bg: "#e0f2fe" },
  travel: { label: "Liburan", icon: Plane, color: "#0d9488", bg: "#ccfbf1" },
  bills: { label: "Tagihan & Kos", icon: Receipt, color: "#4f46e5", bg: "#e0e7ff" },
  gift: { label: "Hadiah", icon: Gift, color: "#e11d48", bg: "#ffe4e6" },
  settlement: { label: "Pelunasan", icon: HandCoins, color: "#059669", bg: "#d1fae5" },
  other: { label: "Lainnya", icon: Sparkles, color: "#ca8a04", bg: "#fef9c3" },
};

export default function ExpensesPage() {
  const { room, currentUser } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterCategory, setFilterCategory] = useState<"all" | ExpenseCategory>("all");
  const [filterPeriod, setFilterPeriod] = useState<"this_month" | "all">("this_month");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);

  // Subscribe to real-time expenses in this room
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToExpenses(room.id, (loaded) => {
      setExpenses(loaded);
    });

    return () => unsubscribe();
  }, [room?.id]);

  // Current month prefix: YYYY-MM
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  }, []);

  // Filtered expenses based on period & category
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Period filter
      if (filterPeriod === "this_month" && !e.date.startsWith(currentMonthStr)) {
        return false;
      }
      // Category filter
      if (filterCategory !== "all" && e.category !== filterCategory) {
        return false;
      }
      return true;
    });
  }, [expenses, filterPeriod, filterCategory, currentMonthStr]);

  // Balance calculation (All unsettled expenses regardless of month filter)
  const unsettledExpenses = useMemo(() => {
    return expenses.filter((e) => !e.isSettled && e.category !== "settlement");
  }, [expenses]);

  const { netBalance, partnerOwesMe, meOwePartner } = useMemo(() => {
    let partnerOwes = 0;
    let meOwes = 0;

    unsettledExpenses.forEach((exp) => {
      const isMePayer = exp.payerId === currentUser?.id;
      let share = 0;

      if (exp.splitType === "equal") {
        share = exp.amount / 2;
      } else if (exp.splitType === "custom") {
        share = exp.customOwedAmount || 0;
      } else if (exp.splitType === "full_payer") {
        share = 0;
      }

      if (isMePayer) {
        partnerOwes += share;
      } else {
        meOwes += share;
      }
    });

    const net = partnerOwes - meOwes;
    return {
      netBalance: net,
      partnerOwesMe: partnerOwes,
      meOwePartner: meOwes,
    };
  }, [unsettledExpenses, currentUser?.id]);

  // Spending totals for the active period
  const { totalSpent, totalMePaid, totalPartnerPaid } = useMemo(() => {
    let total = 0;
    let me = 0;
    let p = 0;

    filteredExpenses.forEach((exp) => {
      // Exclude settlements from total spending calculation
      if (exp.category === "settlement") return;

      total += exp.amount;
      if (exp.payerId === currentUser?.id) {
        me += exp.amount;
      } else {
        p += exp.amount;
      }
    });

    return {
      totalSpent: total,
      totalMePaid: me,
      totalPartnerPaid: p,
    };
  }, [filteredExpenses, currentUser?.id]);

  const handleDelete = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    if (!room?.id) return;
    if (!confirm("Hapus catatan pengeluaran ini?")) return;

    try {
      await deleteExpense(room.id, expenseId);
      toast.success("Pengeluaran berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus pengeluaran");
    }
  };

  const handleToggleSettled = async (e: React.MouseEvent, exp: Expense) => {
    e.stopPropagation();
    if (!room?.id) return;

    try {
      const newStatus = !exp.isSettled;
      await toggleExpenseSettled(room.id, exp.id, newStatus);
      toast.success(newStatus ? "Ditandai sudah lunas! ✨" : "Ditandai belum lunas");
    } catch {
      toast.error("Gagal mengubah status lunas");
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Header & New Button */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1e1b19] flex items-center gap-2">
            Our Expenses <Wallet className="h-5 w-5 text-[#b80035]" />
          </h2>
          <p className="text-xs text-[#5c3f40]">
            Catatan patungan & pengeluaran kencan berdua
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 rounded-full bg-[#1e1b19] text-[#fff8f5] text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#e11d48]" />
          <span>+ Catat</span>
        </button>
      </div>

      {/* Hero Card 1: Patungan / Debt Settlement Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/60">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#ffdada]/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#ffddb8]/30 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5c3f40] uppercase tracking-wider">
              Status Patungan
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#faf2ee] text-[#b80035] text-[10px] font-bold border border-[#e5bdbe]/40">
              {unsettledExpenses.length} belum lunas
            </span>
          </div>

          {/* Balance Statement */}
          <div className="space-y-1">
            {netBalance > 0 ? (
              <>
                <div className="text-xs font-semibold text-[#5c3f40]">
                  {partner?.name || "Pasangan"} berhutang ke kamu
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#059669]">
                  +{formatRupiah(netBalance)}
                </div>
              </>
            ) : netBalance < 0 ? (
              <>
                <div className="text-xs font-semibold text-[#5c3f40]">
                  Kamu berhutang ke {partner?.name || "Pasangan"}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#b80035]">
                  -{formatRupiah(Math.abs(netBalance))}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-[#5c3f40]">Semua Saldo Patungan</div>
                <div className="text-2xl font-extrabold text-[#1e1b19] flex items-center gap-2">
                  <span>Impas!</span>
                  <span className="text-lg">🎉✨</span>
                </div>
              </>
            )}
          </div>

          {/* Action to Settle */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <p className="text-[10px] text-[#5c3f40]/80 leading-tight">
              {netBalance !== 0
                ? "Selesaikan dan reset hitungan patungan saat sudah saling transfer."
                : "Tidak ada tanggungan hutang yang perlu dilunasi saat ini."}
            </p>
            <button
              onClick={() => setIsSettleOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[#faf2ee] hover:bg-[#ffdada] text-[#b80035] text-[11px] font-bold border border-[#e5bdbe]/50 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <span>Lunasi Saldo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Card 2: Total Spending & Period Filter */}
      <div className="rounded-3xl bg-[#faf2ee]/70 p-4 border border-[#eee7e3] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e1b19]">
            <TrendingUp className="w-4 h-4 text-[#b80035]" />
            <span>Total Pengeluaran</span>
          </div>

          {/* Period Toggle */}
          <div className="flex bg-white/80 p-0.5 rounded-full border border-[#e5bdbe]/40 text-[10px] font-bold">
            <button
              onClick={() => setFilterPeriod("this_month")}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                filterPeriod === "this_month"
                  ? "bg-[#b80035] text-white shadow-2xs"
                  : "text-[#5c3f40]"
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setFilterPeriod("all")}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                filterPeriod === "all"
                  ? "bg-[#b80035] text-white shadow-2xs"
                  : "text-[#5c3f40]"
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-0.5">
          <span className="text-xl sm:text-2xl font-black text-[#1e1b19]">
            {formatRupiah(totalSpent)}
          </span>
          <span className="text-[11px] text-[#5c3f40] font-medium">
            {filteredExpenses.filter((e) => e.category !== "settlement").length} transaksi
          </span>
        </div>

        {/* Payer Breakdown Progress Bar */}
        {totalSpent > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="h-2 w-full rounded-full bg-white overflow-hidden flex shadow-inner">
              <div
                style={{
                  width: `${Math.round((totalMePaid / totalSpent) * 100)}%`,
                }}
                className="h-full bg-[#b80035] transition-all duration-500"
                title={`Kamu: ${formatRupiah(totalMePaid)}`}
              />
              <div
                style={{
                  width: `${Math.round((totalPartnerPaid / totalSpent) * 100)}%`,
                }}
                className="h-full bg-[#f4a261] transition-all duration-500"
                title={`${partner?.name || "Pasangan"}: ${formatRupiah(totalPartnerPaid)}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#5c3f40]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#b80035]" />
                <span>Kamu: <b>{formatRupiah(totalMePaid)}</b></span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#f4a261]" />
                <span>
                  {partner?.name || "Pasangan"}: <b>{formatRupiah(totalPartnerPaid)}</b>
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: "Semua Kategori" },
          { id: "food", label: "Makan 🍔" },
          { id: "date", label: "Kencan 🍿" },
          { id: "shopping", label: "Belanja 🛍️" },
          { id: "transport", label: "Transport 🚗" },
          { id: "travel", label: "Liburan ✈️" },
          { id: "bills", label: "Tagihan 💡" },
          { id: "gift", label: "Hadiah 🎁" },
          { id: "settlement", label: "Pelunasan 🤝" },
        ].map((chip) => {
          const isSelected = filterCategory === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilterCategory(chip.id as "all" | ExpenseCategory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-transform active:scale-95 cursor-pointer ${
                isSelected
                  ? "bg-[#1e1b19] text-[#fff8f5] shadow-xs"
                  : "bg-[#f4ece8] text-[#1e1b19]"
              }`}
            >
              <span>{chip.label}</span>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48]" />}
            </button>
          );
        })}
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-[#1e1b19]">Riwayat Transaksi</span>
          <span className="text-[11px] text-[#5c3f40]">
            {filteredExpenses.length} tercatat
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl border-2 border-dashed border-[#e5bdbe]/60 bg-[#faf2ee]/40 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdada] text-[#b80035] flex items-center justify-center font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#1e1b19]">Belum ada catatan</h3>
            <p className="text-xs text-[#5c3f40] max-w-[260px] leading-relaxed">
              Yuk catat pengeluaran makan bareng, tiket nonton, atau patungan kencan pertama kalian!
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-2 px-4 py-2 rounded-full bg-[#b80035] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              Catat Pengeluaran Sekarang 💸
            </button>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
            const Icon = cat.icon;
            const isMePayer = exp.payerId === currentUser?.id;

            return (
              <div
                key={exp.id}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-white border border-rose-100/70 shadow-2xs hover:shadow-xs transition-all space-x-3"
              >
                {/* Left: Category Icon */}
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cat.bg, color: cat.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Center: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-[#1e1b19] truncate">
                      {exp.title}
                    </h4>
                    {exp.isSettled ? (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Lunas
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-[#b80035]">
                        Belum Lunas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#5c3f40] mt-0.5">
                    <span>
                      {new Date(exp.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span>•</span>
                    <span className="truncate">
                      Dibayar <b className="text-[#1e1b19]">{isMePayer ? "Kamu" : exp.payerName}</b>
                    </span>
                    <span>•</span>
                    <span className="italic text-[#5c3f40]/80">
                      {exp.splitType === "equal"
                        ? "Bagi 2"
                        : exp.splitType === "full_payer"
                        ? "Ditraktir"
                        : "Kustom"}
                    </span>
                  </div>

                  {exp.notes && (
                    <p className="text-[10px] text-[#5c3f40]/70 italic truncate mt-0.5">
                      &quot;{exp.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Right: Amount & Quick Actions */}
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="font-extrabold text-sm text-[#1e1b19]">
                    {formatRupiah(exp.amount)}
                  </span>

                  <div className="flex items-center gap-1 opacity-90">
                    {/* Toggle Settled Status */}
                    {exp.category !== "settlement" && (
                      <button
                        onClick={(e) => handleToggleSettled(e, exp)}
                        title={exp.isSettled ? "Tandai Belum Lunas" : "Tandai Lunas"}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${
                          exp.isSettled
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-[#5c3f40]/50 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Expense */}
                    <button
                      onClick={(e) => handleDelete(e, exp.id)}
                      title="Hapus catatan"
                      className="p-1 rounded-full text-[#5c3f40]/40 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AddExpenseModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        unsettledExpenses={unsettledExpenses}
        netBalance={netBalance}
      />
    </div>
  );
}
