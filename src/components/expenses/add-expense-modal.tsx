"use client";

import { useRef, useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { createExpense } from "@/lib/services/expenseService";
import { fileToOptimizedDataUrl } from "@/lib/firebase/storage";
import { ExpenseCategory, SplitType } from "@/types/expense";
import type {
  ScannedBillItem,
  ScannedBillResponse,
} from "@/app/api/scan-bill/route";
import {
  X,
  Loader2,
  Utensils,
  Film,
  ShoppingBag,
  Car,
  Plane,
  Receipt,
  Gift,
  Sparkles,
  Check,
  ScanLine,
  Camera,
  Trash2,
  Plus,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ItemAssignee = "both" | "me" | "partner";

type EditableScannedItem = ScannedBillItem & {
  assignedTo: ItemAssignee;
};

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payerId, setPayerId] = useState(currentUser?.id || "");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [rawCustomOwed, setRawCustomOwed] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Bill Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<EditableScannedItem[]>([]);
  const [scannedTax, setScannedTax] = useState<number>(0);
  const [scannedDiscount, setScannedDiscount] = useState<number>(0);
  const [hasScannedResult, setHasScannedResult] = useState(false);

  if (!isOpen) return null;

  const numericAmount = parseInt(rawAmount.replace(/\D/g, "") || "0", 10);
  const numericCustomOwed = parseInt(rawCustomOwed.replace(/\D/g, "") || "0", 10);

  const currentPayerName =
    payerId === currentUser?.id
      ? currentUser?.name || "Saya"
      : partner?.name || "Pasangan";
  const otherPersonName =
    payerId === currentUser?.id
      ? partner?.name || "Pasangan"
      : currentUser?.name || "Saya";

  const formatNumInput = (num: number) =>
    num > 0 ? new Intl.NumberFormat("id-ID").format(Math.round(num)) : "";

  /**
   * Recalculates total bill, my share, partner share, and customOwedAmount
   * based on per-item assignment + proportional tax/service & discount.
   */
  const recalculateFromScannedBill = (
    items: EditableScannedItem[],
    taxAmount: number,
    discountAmount: number,
    activePayerId: string
  ) => {
    const itemsSubtotal = items.reduce((sum, i) => sum + (i.price || 0), 0);
    let meRaw = 0;
    let partnerRaw = 0;

    items.forEach((item) => {
      if (item.assignedTo === "me") {
        meRaw += item.price;
      } else if (item.assignedTo === "partner") {
        partnerRaw += item.price;
      } else {
        meRaw += item.price / 2;
        partnerRaw += item.price / 2;
      }
    });

    const netAdjustment = taxAmount - discountAmount;
    let meFinal = meRaw;
    let partnerFinal = partnerRaw;

    if (itemsSubtotal > 0) {
      meFinal = Math.round(meRaw + netAdjustment * (meRaw / itemsSubtotal));
      partnerFinal = Math.round(
        partnerRaw + netAdjustment * (partnerRaw / itemsSubtotal)
      );
    }

    const totalGrand = Math.max(0, itemsSubtotal + netAdjustment);
    setRawAmount(formatNumInput(totalGrand));

    // Determine if all items are assigned "both" -> equal split, otherwise custom split
    const allBoth = items.every((i) => i.assignedTo === "both");
    if (allBoth) {
      setSplitType("equal");
      setRawCustomOwed(formatNumInput(Math.round(totalGrand / 2)));
    } else {
      setSplitType("custom");
      const owedByOther =
        activePayerId === currentUser?.id ? partnerFinal : meFinal;
      setRawCustomOwed(formatNumInput(Math.max(0, owedByOther)));
    }

    // Build concise summary note
    const summaryParts = items
      .slice(0, 5)
      .map((i) => `${i.qty}x ${i.name}`)
      .join(", ");
    const suffix = items.length > 5 ? ` (+${items.length - 5} menu)` : "";
    const taxInfo =
      taxAmount > 0 ? ` | Pajak/Servis ${formatRupiah(taxAmount)}` : "";
    setNotes(`Scan AI: ${summaryParts}${suffix}${taxInfo}`);
  };

  const handleBillFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const base64Image = await fileToOptimizedDataUrl(file, 1280, 0.82);

      const response = await fetch("/api/scan-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const data = (await response.json()) as ScannedBillResponse & {
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Gagal membaca struk");
      }

      const mappedItems: EditableScannedItem[] = (data.items || []).map(
        (item) => ({
          ...item,
          assignedTo: "both" as ItemAssignee,
        })
      );

      setTitle(data.merchantName || "Struk Makan & Belanja");
      if (data.category) setCategory(data.category);
      if (data.date) setDate(data.date);

      setScannedItems(mappedItems);
      setScannedTax(data.taxAndService || 0);
      setScannedDiscount(data.discount || 0);
      setHasScannedResult(true);

      if (mappedItems.length > 0) {
        recalculateFromScannedBill(
          mappedItems,
          data.taxAndService || 0,
          data.discount || 0,
          payerId
        );
      } else if (data.grandTotal > 0) {
        setRawAmount(formatNumInput(data.grandTotal));
      }

      toast.success(
        `Struk berhasil dipindai (${mappedItems.length} item terdeteksi)`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal memindai struk dengan AI";
      toast.error(msg);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAssignItem = (itemId: string, assignee: ItemAssignee) => {
    const updated = scannedItems.map((item) =>
      item.id === itemId ? { ...item, assignedTo: assignee } : item
    );
    setScannedItems(updated);
    recalculateFromScannedBill(updated, scannedTax, scannedDiscount, payerId);
  };

  const handleUpdateItemPrice = (itemId: string, rawVal: string) => {
    const num = parseInt(rawVal.replace(/\D/g, "") || "0", 10);
    const updated = scannedItems.map((item) =>
      item.id === itemId ? { ...item, price: num } : item
    );
    setScannedItems(updated);
    recalculateFromScannedBill(updated, scannedTax, scannedDiscount, payerId);
  };

  const handleRemoveScannedItem = (itemId: string) => {
    const updated = scannedItems.filter((item) => item.id !== itemId);
    setScannedItems(updated);
    recalculateFromScannedBill(updated, scannedTax, scannedDiscount, payerId);
  };

  const handleAddBlankScannedItem = () => {
    const newItem: EditableScannedItem = {
      id: `manual_${Date.now()}`,
      name: `Menu #${scannedItems.length + 1}`,
      qty: 1,
      price: 0,
      assignedTo: "both",
    };
    const updated = [...scannedItems, newItem];
    setScannedItems(updated);
  };

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

  const handleSelectPayer = (newPayerId: string) => {
    setPayerId(newPayerId);
    if (hasScannedResult && scannedItems.length > 0) {
      recalculateFromScannedBill(
        scannedItems,
        scannedTax,
        scannedDiscount,
        newPayerId
      );
    }
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
      toast.error(
        "Nominal yang ditanggung pasangan tidak boleh melebihi total nominal"
      );
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
        customOwedAmount:
          splitType === "custom" ? numericCustomOwed : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Pengeluaran berhasil dicatat!");
      setTitle("");
      setRawAmount("");
      setRawCustomOwed("");
      setCategory("food");
      setSplitType("equal");
      setNotes("");
      setScannedItems([]);
      setScannedTax(0);
      setScannedDiscount(0);
      setHasScannedResult(false);
      onClose();
    } catch (error) {
      console.error("Gagal mencatat pengeluaran:", error);
      toast.error("Gagal menyimpan data pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Breakdown shares for display when scanned items exist
  const itemsSubtotal = scannedItems.reduce((s, i) => s + i.price, 0);
  const netAdj = scannedTax - scannedDiscount;
  let meSharePreview = 0;
  let partnerSharePreview = 0;
  if (hasScannedResult && itemsSubtotal > 0) {
    let meRaw = 0;
    let pRaw = 0;
    scannedItems.forEach((i) => {
      if (i.assignedTo === "me") meRaw += i.price;
      else if (i.assignedTo === "partner") pRaw += i.price;
      else {
        meRaw += i.price / 2;
        pRaw += i.price / 2;
      }
    });
    meSharePreview = Math.round(meRaw + netAdj * (meRaw / itemsSubtotal));
    partnerSharePreview = Math.round(pRaw + netAdj * (pRaw / itemsSubtotal));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-100/60 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eee7e3] bg-[#faf2ee]/70">
          <div>
            <h3 className="font-bold text-base text-[#1e1b19]">
              Catat Pengeluaran Baru
            </h3>
            <p className="text-xs text-[#5c3f40]">
              Scan struk otomatis dengan AI atau ketik manual
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#5c3f40] hover:text-[#1e1b19] border border-[#e5bdbe]/40 active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6 space-y-4 text-xs"
        >
          {/* AI BILL SCANNER BANNER */}
          <div className="p-3.5 rounded-2xl bg-[#faf2ee] border border-[#e5bdbe]/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#ffdada] text-[#b80035] flex items-center justify-center shrink-0">
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-[#1e1b19] block">
                  Scan Struk / Nota (Groq AI)
                </span>
                <span className="text-[10px] text-[#5c3f40] block">
                  Otomatis baca daftar menu, pajak PB1/servis, dan hitung porsi berdua
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBillFileSelect}
              className="hidden"
            />
            <button
              type="button"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 px-3 py-2 rounded-xl bg-[#b80035] text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memindai...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>{hasScannedResult ? "Scan Ulang" : "Upload Struk"}</span>
                </>
              )}
            </button>
          </div>

          {/* INTERACTIVE SCANNED ITEMS BREAKDOWN */}
          {hasScannedResult && (
            <div className="p-4 rounded-2xl bg-[#faf2ee]/80 border border-[#b80035]/25 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b80035] block">
                    HASIL SCAN STRUK AI ({scannedItems.length} MENU)
                  </span>
                  <p className="text-[11px] text-[#5c3f40]">
                    Pilih siapa yang memesan tiap menu (Pajak dibagi proporsional)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBlankScannedItem}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#e5bdbe] text-[10px] font-bold text-[#b80035] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Menu</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {scannedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white border border-[#eee7e3] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = scannedItems.map((i) =>
                            i.id === item.id
                              ? { ...i, name: e.target.value }
                              : i
                          );
                          setScannedItems(updated);
                        }}
                        className="flex-1 text-xs font-bold text-[#1e1b19] bg-transparent border-b border-transparent focus:border-[#b80035] focus:outline-none"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-[#5c3f40] font-semibold">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumInput(item.price)}
                          onChange={(e) =>
                            handleUpdateItemPrice(item.id, e.target.value)
                          }
                          className="w-20 text-right text-xs font-bold text-[#1e1b19] bg-[#faf2ee] px-2 py-1 rounded-lg border border-[#e5bdbe]/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveScannedItem(item.id)}
                          className="p-1 text-[#5c3f40]/50 hover:text-rose-600 cursor-pointer"
                          title="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Who ordered this item? */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "both", label: "Berdua (50:50)" },
                          { id: "me", label: currentUser?.name || "Saya" },
                          {
                            id: "partner",
                            label: partner?.name || "Pasangan",
                          },
                        ] as { id: ItemAssignee; label: string }[]
                      ).map((btn) => {
                        const active = item.assignedTo === btn.id;
                        return (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => handleAssignItem(item.id, btn.id)}
                            className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-all truncate cursor-pointer ${
                              active
                                ? "bg-[#b80035] text-white border-[#b80035]"
                                : "bg-[#faf2ee] text-[#5c3f40] border-[#eee7e3]"
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tax & Discount Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#e5bdbe]/40">
                <div>
                  <label className="text-[10px] font-semibold text-[#5c3f40] block mb-1">
                    Pajak PB1 + Service (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumInput(scannedTax)}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseInt(
                        e.target.value.replace(/\D/g, "") || "0",
                        10
                      );
                      setScannedTax(val);
                      recalculateFromScannedBill(
                        scannedItems,
                        val,
                        scannedDiscount,
                        payerId
                      );
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e5bdbe]/60 text-xs font-bold text-[#1e1b19]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5c3f40] block mb-1">
                    Diskon / Potongan (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumInput(scannedDiscount)}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseInt(
                        e.target.value.replace(/\D/g, "") || "0",
                        10
                      );
                      setScannedDiscount(val);
                      recalculateFromScannedBill(
                        scannedItems,
                        scannedTax,
                        val,
                        payerId
                      );
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e5bdbe]/60 text-xs font-bold text-[#059669]"
                  />
                </div>
              </div>

              {/* Per-Person Calculated Summary */}
              <div className="p-2.5 rounded-xl bg-white border border-[#e5bdbe]/60 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[#5c3f40] block text-[10px]">
                    Porsi {currentUser?.name || "Saya"}:
                  </span>
                  <b className="text-[#1e1b19]">
                    {formatRupiah(meSharePreview)}
                  </b>
                </div>
                <div className="text-right">
                  <span className="text-[#5c3f40] block text-[10px]">
                    Porsi {partner?.name || "Pasangan"}:
                  </span>
                  <b className="text-[#b80035]">
                    {formatRupiah(partnerSharePreview)}
                  </b>
                </div>
              </div>
            </div>
          )}

          {/* Nominal Input Hero */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#ffdada]/30 to-[#faf2ee] border border-rose-100 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-semibold text-[#5c3f40] mb-1">
              Total Nominal Pengeluaran
            </span>
            <div className="flex items-center justify-center gap-1.5 w-full">
              <span className="text-xl font-bold text-[#b80035]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={rawAmount}
                onChange={handleAmountChange}
                className="text-2xl sm:text-3xl font-extrabold text-[#1e1b19] bg-transparent outline-none max-w-[200px] text-center placeholder-[#5c3f40]/40"
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
                    <span className="text-[10px] leading-tight line-clamp-1">
                      {cat.label}
                    </span>
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
              <label className="font-bold text-[#1e1b19] block">
                Siapa yang bayar?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPayer(currentUser?.id || "")}
                  className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    payerId === currentUser?.id
                      ? "bg-[#1e1b19] text-white border-[#1e1b19]"
                      : "bg-[#faf2ee] text-[#5c3f40] border-[#eee7e3]"
                  }`}
                >
                  {payerId === currentUser?.id && (
                    <Check className="w-3 h-3 text-[#e11d48]" />
                  )}
                  <span className="truncate">Saya</span>
                </button>
                {partner && (
                  <button
                    type="button"
                    onClick={() => handleSelectPayer(partner.id)}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      payerId === partner.id
                        ? "bg-[#1e1b19] text-white border-[#1e1b19]"
                        : "bg-[#faf2ee] text-[#5c3f40] border-[#eee7e3]"
                    }`}
                  >
                    {payerId === partner.id && (
                      <Check className="w-3 h-3 text-[#e11d48]" />
                    )}
                    <span className="truncate">{partner.name}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Split Type Selector */}
          <div className="space-y-2 pt-1">
            <label className="font-bold text-[#1e1b19] block">
              Skema Patungan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: "equal" as SplitType,
                  label: "Bagi 2 Rata",
                  sub: "50% : 50%",
                },
                {
                  id: "full_payer" as SplitType,
                  label: "Ditraktir",
                  sub: "100% dibayari",
                },
                {
                  id: "custom" as SplitType,
                  label: "Kustom",
                  sub: "Nominal beda",
                },
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
                <>
                  <div className="flex items-center justify-between">
                    <span>Masing-masing menanggung:</span>
                    <span className="font-bold text-[#1e1b19]">
                      {formatRupiah(numericAmount / 2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5c3f40]/80">
                    {otherPersonName} berhutang{" "}
                    <b className="text-[#b80035]">
                      {formatRupiah(numericAmount / 2)}
                    </b>{" "}
                    ke {currentPayerName}.
                  </p>
                </>
              )}

              {splitType === "full_payer" && (
                <p className="text-[11px] text-[#1e1b19] font-medium">
                  {currentPayerName} mentraktir penuh{" "}
                  {formatRupiah(numericAmount)}. Tidak ada hutang patungan.
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
                    <span>
                      {currentPayerName} tanggung:{" "}
                      {formatRupiah(
                        Math.max(0, numericAmount - numericCustomOwed)
                      )}
                    </span>
                    <span>
                      {otherPersonName} ganti: {formatRupiah(numericCustomOwed)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1e1b19] block">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Sudah termasuk pajak 11% & servis"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/40 text-[#1e1b19] placeholder-[#5c3f40]/50 text-xs focus:outline-none focus:ring-2 focus:ring-[#b80035]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-6 sm:pb-2">
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
                <span>Simpan Pengeluaran</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
