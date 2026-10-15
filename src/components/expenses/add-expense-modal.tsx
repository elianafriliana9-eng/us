"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { createExpense } from "@/lib/services/expenseService";
import { ExpenseCategory, SplitType } from "@/types/expense";
import { X, Loader2, Utensils, Film, ShoppingBag, Car, Plane, Receipt, Gift, Sparkles, Check, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: LucideIcon }[] = [
  { id: "food", label: "Makan & Jajan", icon: Utensils },
  { id: "date", label: "Kencan & Nonton", icon: Film },
  { id: "shopping", label: "Belanja", icon: ShoppingBag },
  { id: "transport", label: "Bensin & Ojol", icon: Car },
  { id: "travel", label: "Liburan", icon: Plane },
  { id: "bills", label: "Tagihan & Kos", icon: Receipt },
  { id: "gift", label: "Hadiah", icon: Gift },
  { id: "other", label: "Lainnya", icon: Sparkles },
];

export function AddExpenseModal({ isOpen, onClose }: AddExpenseModalProps) {
  const { room, currentUser } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);

  const [title, setTitle] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payerId, setPayerId] = useState(currentUser?.id || "");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [rawCustomOwed, setRawCustomOwed] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numericAmount = parseInt(rawAmount.replace(/\D/g, "") || "0", 10);
  const numericCustomOwed = parseInt(rawCustomOwed.replace(/\D/g, "") || "0", 10);

  const currentPayerName =
    payerId === currentUser?.id ? currentUser?.name || "Saya" : partner?.name || "Pasangan";
  const otherPersonName =
    payerId === currentUser?.id ? partner?.name || "Pasangan" : currentUser?.name || "Saya";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setRawAmount("");
      return;
    }
    const num = parseInt(val, 10);
    setRawAmount(new Intl.NumberFormat("id-ID").format(num));
  };

  const handleCustomOwedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setRawCustomOwed("");
      return;
    }
    const num = parseInt(val, 10);
    setRawCustomOwed(new Intl.NumberFormat("id-ID").format(num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room?.id || !currentUser) return;

    if (!title.trim()) {
      toast.error("Masukkan judul pengeluaran");
      return;
    }

    if (numericAmount <= 0) {
      toast.error("Masukkan nominal pengeluaran yang valid");
      return;
    }

    if (splitType === "custom" && numericCustomOwed > numericAmount) {
      toast.error("Nominal yang ditanggung pasangan tidak boleh melebihi total nominal");
      return;
    }

    setIsSubmitting(true);
    try {
      await createExpense(room.id, currentUser, {
        title: title.trim(),
        amount: numericAmount,
        category,
        date,
        payerId,
        payerName: currentPayerName,
        splitType,
        customOwedAmount: splitType === "custom" ? numericCustomOwed : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Pengeluaran berhasil dicatat! 💸");
      // Reset form
      setTitle("");
      setRawAmount("");
      setRawCustomOwed("");
      setCategory("food");
      setSplitType("equal");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Gagal mencatat pengeluaran:", error);
      toast.error("Gagal menyimpan data pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-rose-100/60 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eee7e3] bg-[#faf2ee]/70">
          <div>
            <h3 className="font-bold text-base text-[#1e1b19]">Catat Pengeluaran Baru</h3>
            <p className="text-xs text-[#5c3f40]">Catat bon makan, nonton, atau patungan berdua</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#5c3f40] hover:text-[#1e1b19] border border-[#e5bdbe]/40 active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs">
          {/* Nominal Input Hero */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#ffdada]/30 to-[#faf2ee] border border-rose-100 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-semibold text-[#5c3f40] mb-1">Total Nominal Pengeluaran</span>
            <div className="flex items-center justify-center gap-1.5 w-full">
              <span className="text-xl font-bold text-[#b80035]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={rawAmount}
                onChange={handleAmountChange}
                className="text-2xl sm:text-3xl font-extrabold text-[#1e1b19] bg-transparent outline-none max-w-[200px] text-center placeholder-[#5c3f40]/40"
                autoFocus
              />
            </div>
            {numericAmount > 0 && (
              <span className="text-[11px] text-[#5c3f40] mt-1">
                {formatRupiah(numericAmount)}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1e1b19] block">
              Nama Pengeluaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Makan Siang di RamenYa, Nonton Bioskop..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/40 text-[#1e1b19] placeholder-[#5c3f40]/50 text-xs focus:outline-none focus:ring-2 focus:ring-[#b80035]"
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1e1b19] block">Kategori</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-[#ffdada] border-[#b80035] text-[#b80035] font-bold shadow-2xs"
                        : "bg-[#faf2ee] border-[#eee7e3] text-[#5c3f40] hover:bg-rose-50/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[10px] leading-tight line-clamp-1">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Payer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1e1b19] block">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/40 text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#b80035]"
              />
            </div>

            {/* Who Paid */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1e1b19] block">Siapa yang bayar?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayerId(currentUser?.id || "")}
                  className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    payerId === currentUser?.id
                      ? "bg-[#1e1b19] text-white border-[#1e1b19]"
                      : "bg-[#faf2ee] text-[#5c3f40] border-[#eee7e3]"
                  }`}
                >
                  {payerId === currentUser?.id && <Check className="w-3 h-3 text-[#e11d48]" />}
                  <span className="truncate">Saya</span>
                </button>
                {partner && (
                  <button
                    type="button"
                    onClick={() => setPayerId(partner.id)}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      payerId === partner.id
                        ? "bg-[#1e1b19] text-white border-[#1e1b19]"
                        : "bg-[#faf2ee] text-[#5c3f40] border-[#eee7e3]"
                    }`}
                  >
                    {payerId === partner.id && <Check className="w-3 h-3 text-[#e11d48]" />}
                    <span className="truncate">{partner.name}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Split Type Selector */}
          <div className="space-y-2 pt-1">
            <label className="font-bold text-[#1e1b19] block">Skema Patungan</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "equal" as SplitType, label: "Bagi 2 Rata", sub: "50% : 50%" },
                { id: "full_payer" as SplitType, label: "Ditraktir", sub: "100% dibayari" },
                { id: "custom" as SplitType, label: "Kustom", sub: "Nominal beda" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSplitType(s.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                    splitType === s.id
                      ? "bg-[#ffdada] border-[#b80035] text-[#b80035] font-bold shadow-2xs"
                      : "bg-[#faf2ee] border-[#eee7e3] text-[#5c3f40]"
                  }`}
                >
                  <span className="text-xs font-bold">{s.label}</span>
                  <span className="text-[10px] opacity-75">{s.sub}</span>
                </button>
              ))}
            </div>

            {/* Split Details Breakdown Card */}
            <div className="p-3 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/30 text-[11px] text-[#5c3f40] space-y-1">
              {splitType === "equal" && (
                <div className="flex items-center justify-between">
                  <span>Masing-masing menanggung:</span>
                  <span className="font-bold text-[#1e1b19]">
                    {formatRupiah(numericAmount / 2)}
                  </span>
                </div>
              )}
              {splitType === "equal" && (
                <p className="text-[10px] text-[#5c3f40]/80">
                  {otherPersonName} berhutang <b className="text-[#b80035]">{formatRupiah(numericAmount / 2)}</b> ke {currentPayerName}.
                </p>
              )}

              {splitType === "full_payer" && (
                <p className="text-[11px] text-[#1e1b19] font-medium">
                  🎉 {currentPayerName} mentraktir penuh {formatRupiah(numericAmount)}. Tidak ada hutang patungan.
                </p>
              )}

              {splitType === "custom" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1e1b19]">
                      Berapa yang diganti oleh {otherPersonName}?
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#b80035] text-xs">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={rawCustomOwed}
                      onChange={handleCustomOwedChange}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#e5bdbe]/60 text-xs font-bold text-[#1e1b19] focus:outline-none focus:ring-2 focus:ring-[#b80035]"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#5c3f40] pt-0.5">
                    <span>{currentPayerName} tanggung: {formatRupiah(Math.max(0, numericAmount - numericCustomOwed))}</span>
                    <span>{otherPersonName} ganti: {formatRupiah(numericCustomOwed)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1e1b19] block">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Sudah termasuk pajak 11% & servis"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/40 text-[#1e1b19] placeholder-[#5c3f40]/50 text-xs focus:outline-none focus:ring-2 focus:ring-[#b80035]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#b80035] to-[#e11d48] text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Pengeluaran...</span>
                </>
              ) : (
                <span>Simpan Pengeluaran 💸</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
