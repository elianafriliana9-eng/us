"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { settleAllExpenses, recordSettlement } from "@/lib/services/expenseService";
import { Expense } from "@/types/expense";
import { X, CheckCircle2, ArrowRight, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  unsettledExpenses: Expense[];
  netBalance: number; // Positive = partner owes current user, Negative = current user owes partner
}

export function SettleModal({
  isOpen,
  onClose,
  unsettledExpenses,
  netBalance,
}: SettleModalProps) {
  const { room, currentUser } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const absBalance = Math.abs(netBalance);
  const debtorName = netBalance > 0 ? partner?.name || "Pasangan" : currentUser?.name || "Saya";
  const creditorName = netBalance > 0 ? currentUser?.name || "Saya" : partner?.name || "Pasangan";
  const debtorId = netBalance > 0 ? partner?.id || "partner" : currentUser?.id || "me";

  const handleSettle = async (withRecord: boolean) => {
    if (!room?.id || !currentUser) return;

    setIsSubmitting(true);
    try {
      // 1. Mark all currently unsettled items as settled
      await settleAllExpenses(room.id, unsettledExpenses);

      // 2. Optionally record the settlement payment in history
      if (withRecord && absBalance > 0) {
        await recordSettlement(
          room.id,
          currentUser,
          debtorId,
          debtorName,
          absBalance,
          creditorName
        );
      }

      toast.success("Saldo berhasil dilunasi & direset impas! 🎉✨");
      onClose();
    } catch (error) {
      console.error("Gagal melunasi pengeluaran:", error);
      toast.error("Gagal memproses pelunasan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eee7e3] bg-[#faf2ee]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#1e1b19]">Lunasi Patungan</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#5c3f40] hover:text-[#1e1b19] border border-[#e5bdbe]/40 active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-center">
          {absBalance > 0 ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#ffdada]/40 to-[#faf2ee] border border-rose-100 space-y-2">
              <span className="text-[11px] font-medium text-[#5c3f40]">
                Rincian Pelunasan ({unsettledExpenses.length} transaksi belum lunas)
              </span>
              <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-[#1e1b19]">
                <span className="px-2.5 py-1 rounded-full bg-white text-[#5c3f40] shadow-2xs">
                  {debtorName}
                </span>
                <ArrowRight className="w-4 h-4 text-[#b80035]" />
                <span className="px-2.5 py-1 rounded-full bg-[#ffdada] text-[#b80035] shadow-2xs">
                  {creditorName}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#b80035]">
                {formatRupiah(absBalance)}
              </div>
              <p className="text-[11px] text-[#5c3f40] leading-relaxed">
                {netBalance > 0
                  ? `${debtorName} membayar kamu sejumlah ${formatRupiah(absBalance)}`
                  : `Kamu membayar ke ${creditorName} sejumlah ${formatRupiah(absBalance)}`}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#faf2ee] border border-[#eee7e3] space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#1e1b19]">Semua Sudah Impas!</h4>
              <p className="text-xs text-[#5c3f40]">
                Saat ini tidak ada saldo hutang patungan antara kalian berdua.
              </p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              onClick={() => handleSettle(true)}
              disabled={isSubmitting || (absBalance === 0 && unsettledExpenses.length === 0)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#b80035] to-[#e11d48] text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Pelunasan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Lunas & Catat Pelunasan ✨</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSettle(false)}
              disabled={isSubmitting || unsettledExpenses.length === 0}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#faf2ee] hover:bg-[#ffdada]/60 text-[#5c3f40] font-semibold text-xs transition-all border border-[#e5bdbe]/40 active:scale-98 cursor-pointer disabled:opacity-40"
            >
              Tandai Lunas Saja (Tanpa Catat Riwayat)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
