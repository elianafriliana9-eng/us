"use client";

import { useEffect, useState, useMemo } from "react";
import { useBestieStore } from "@/stores/bestieStore";
import {
  subscribeToBestieExpenses,
  createBestieExpense,
  deleteBestieExpense,
  toggleBestieExpenseSettled,
  settleAllBestieExpenses,
  getTodayDateKey,
} from "@/lib/services/bestieService";
import {
  BestieExpense,
  BestieExpenseCategory,
  BestieSplitType,
  simplifyBestieDebts,
  getMemberColor,
} from "@/types/bestie";
import { formatRupiah } from "@/lib/utils";
import {
  Receipt,
  Plus,
  Utensils,
  Coffee,
  Compass,
  Car,
  Gift,
  Home,
  HandCoins,
  Layers,
  ArrowRight,
  CheckCircle2,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES: Record<
  BestieExpenseCategory,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  food: { label: "Makan & Kuliner", icon: Utensils, color: "#2554E8", bg: "#DBE4FF" },
  hangout: { label: "Nongkrong & Kafe", icon: Coffee, color: "#FF6B35", bg: "#FFE4D6" },
  trip: { label: "Perjalanan / Trip", icon: Compass, color: "#059669", bg: "#D1FAE5" },
  transport: { label: "Bensin & Tol", icon: Car, color: "#7C3AED", bg: "#EDE9FE" },
  accommodation: { label: "Villa & Penginapan", icon: Home, color: "#D97706", bg: "#FEF3C7" },
  gift: { label: "Patungan Kado", icon: Gift, color: "#DB2777", bg: "#FCE7F3" },
  settlement: { label: "Pelunasan", icon: HandCoins, color: "#059669", bg: "#D1FAE5" },
  other: { label: "Lainnya", icon: Layers, color: "#525866", bg: "#E6E9DF" },
};

export default function BestiePatunganPage() {
  const { room, currentUser } = useBestieStore();
  const [expenses, setExpenses] = useState<BestieExpense[]>([]);
  const [filterCategory, setFilterCategory] = useState<"all" | BestieExpenseCategory>("all");

  // Add Expense Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<BestieExpenseCategory>("food");
  const [date, setDate] = useState(() => getTodayDateKey());
  const [payerId, setPayerId] = useState("");
  const [splitType, setSplitType] = useState<BestieSplitType>("equal");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!room?.id) return;
    const unsub = subscribeToBestieExpenses(room.id, setExpenses);
    return () => unsub();
  }, [room?.id]);

  const members = useMemo(() => room?.members || [], [room?.members]);

  // Open modal with defaults
  const handleOpenAddModal = () => {
    setPayerId(currentUser?.id || members[0]?.id || "");
    setSelectedParticipants(members.map((m) => m.id));
    setSplitType("equal");
    setIsAddOpen(true);
  };

  const unsettledExpenses = useMemo(
    () => expenses.filter((e) => !e.isSettled && e.category !== "settlement"),
    [expenses]
  );

  // Simplified Debt Graph across up to 6 members
  const { netBalances, transfers } = useMemo(
    () => simplifyBestieDebts(unsettledExpenses, members),
    [unsettledExpenses, members]
  );

  const myNetBalance = currentUser ? netBalances[currentUser.id] || 0 : 0;

  // Total spending & per-member payer breakdown
  const { totalSpent, paidByMember } = useMemo(() => {
    let total = 0;
    const byMember: Record<string, number> = {};
    members.forEach((m) => {
      byMember[m.id] = 0;
    });

    expenses.forEach((e) => {
      if (e.category === "settlement") return;
      total += e.amount;
      byMember[e.payerId] = (byMember[e.payerId] || 0) + e.amount;
    });

    return { totalSpent: total, paidByMember: byMember };
  }, [expenses, members]);

  if (!room || !currentUser) return null;

  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length <= 1) return;
      setSelectedParticipants(selectedParticipants.filter((id) => id !== memberId));
    } else {
      setSelectedParticipants([...selectedParticipants, memberId]);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim() || !numericAmount || numericAmount <= 0) {
      toast.error("Judul dan nominal harus diisi dengan benar");
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error("Pilih minimal 1 anggota yang ikut patungan");
      return;
    }

    const payerMember =
      members.find((m) => m.id === payerId) || {
        id: currentUser.id,
        name: currentUser.name,
      };

    try {
      await createBestieExpense(room.id, currentUser, {
        title,
        amount: numericAmount,
        category,
        date,
        payerId: payerMember.id,
        payerName: payerMember.name,
        splitType,
        participantIds: selectedParticipants,
        notes,
      });
      setTitle("");
      setAmount("");
      setNotes("");
      setIsAddOpen(false);
      toast.success("Catatan patungan disimpan");
    } catch {
      toast.error("Gagal menyimpan patungan");
    }
  };

  const handleSettleAll = async () => {
    if (unsettledExpenses.length === 0) return;
    if (!confirm("Tandai semua transaksi patungan saat ini sebagai lunas?")) return;
    try {
      await settleAllBestieExpenses(room.id, unsettledExpenses);
      toast.success("Seluruh saldo patungan telah ditandai lunas");
    } catch {
      toast.error("Gagal melunasi saldo");
    }
  };

  const filteredExpenses = expenses.filter((e) =>
    filterCategory === "all" ? true : e.category === filterCategory
  );

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display-bestie text-xl font-bold text-[#141619] uppercase flex items-center gap-2">
            <span>Split Bill & Patungan</span>
            <Receipt className="w-5 h-5 text-[#2554E8]" />
          </h1>
          <p className="text-xs text-[#525866]">
            Kalkulator patungan otomatis untuk 2 hingga 6 anggota Circle
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="h-10 px-3.5 rounded-xl bento-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat</span>
        </button>
      </div>

      {/* HERO CARD 1: SIMPLIFIED DEBT GRAPH & MY NET BALANCE */}
      <div className="bento-card p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-mono-bestie text-[10px] font-bold uppercase tracking-wider text-[#525866]">
            POSISI SALDO KAMU ({currentUser.name})
          </span>
          <span className="font-mono-bestie text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF1EA] text-[#141619]">
            {unsettledExpenses.length} BELUM LUNAS
          </span>
        </div>

        <div>
          {myNetBalance > 100 ? (
            <>
              <span className="text-xs font-semibold text-[#525866] block">
                Total piutang yang harus kamu terima dari teman:
              </span>
              <span className="font-display-bestie text-3xl font-bold text-[#059669]">
                +{formatRupiah(myNetBalance)}
              </span>
            </>
          ) : myNetBalance < -100 ? (
            <>
              <span className="text-xs font-semibold text-[#525866] block">
                Total bagian patungan yang perlu kamu bayar:
              </span>
              <span className="font-display-bestie text-3xl font-bold text-[#FF6B35]">
                -{formatRupiah(Math.abs(myNetBalance))}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold text-[#525866] block">
                Status patungan kamu saat ini:
              </span>
              <span className="font-display-bestie text-2xl font-bold text-[#141619]">
                Semua Impas (Rp 0)
              </span>
            </>
          )}
        </div>

        {/* Simplified Pairwise Transfers */}
        <div className="rounded-xl bg-[#EFF1EA] border border-[#D8DDD0] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono-bestie text-[10px] font-bold uppercase text-[#141619]">
              RINGKASAN TRANSFER PELUNASAN GRUP
            </span>
            {transfers.length > 0 && (
              <button
                type="button"
                onClick={handleSettleAll}
                className="text-[10px] font-bold text-[#2554E8] underline cursor-pointer"
              >
                Lunasi Semua
              </button>
            )}
          </div>

          {transfers.length === 0 ? (
            <p className="text-xs text-[#525866]">
              Tidak ada tanggungan transfer antar anggota saat ini.
            </p>
          ) : (
            <div className="space-y-1.5">
              {transfers.map((t, idx) => {
                const involvesMe =
                  t.fromId === currentUser.id || t.toId === currentUser.id;
                return (
                  <div
                    key={`${t.fromId}_${t.toId}_${idx}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                      involvesMe
                        ? "bg-white border-[#141619] font-bold"
                        : "bg-white/60 border-[#D8DDD0]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[#141619] truncate">
                        {t.fromId === currentUser.id ? "Kamu" : t.fromName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#525866] shrink-0" />
                      <span className="text-[#2554E8] truncate">
                        {t.toId === currentUser.id ? "Kamu" : t.toName}
                      </span>
                    </div>
                    <span className="font-mono-bestie font-bold text-[#141619] shrink-0">
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* HERO CARD 2: 6-COLOR PAYER BREAKDOWN BAR */}
      <div className="bento-card-subtle p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-mono-bestie text-[10px] font-bold uppercase text-[#525866] block">
              TOTAL PENGELUARAN CIRCLE
            </span>
            <span className="font-display-bestie text-xl font-bold text-[#141619]">
              {formatRupiah(totalSpent)}
            </span>
          </div>
          <span className="font-mono-bestie text-[10px] font-bold text-[#525866]">
            {expenses.length} Transaksi
          </span>
        </div>

        {totalSpent > 0 && (
          <>
            <div className="h-3 w-full rounded-lg bg-[#EFF1EA] overflow-hidden flex border border-[#141619]">
              {members.map((m, idx) => {
                const paid = paidByMember[m.id] || 0;
                if (paid <= 0) return null;
                const pct = Math.max(4, Math.round((paid / totalSpent) * 100));
                const token = getMemberColor(m.colorId, idx);
                return (
                  <div
                    key={m.id}
                    style={{ width: `${pct}%`, backgroundColor: token.hex }}
                    className="h-full transition-all"
                    title={`${m.name}: ${formatRupiah(paid)}`}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {members.map((m, idx) => {
                const paid = paidByMember[m.id] || 0;
                const token = getMemberColor(m.colorId, idx);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-[#F6F7F3]"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: token.hex }}
                      />
                      <span className="font-bold text-[#141619] truncate">
                        {m.name}
                      </span>
                    </span>
                    <span className="font-mono-bestie text-[#525866]">
                      {formatRupiah(paid)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: "Semua" },
          { id: "food", label: "Kuliner" },
          { id: "hangout", label: "Nongkrong" },
          { id: "trip", label: "Perjalanan" },
          { id: "transport", label: "Transport" },
          { id: "accommodation", label: "Penginapan" },
          { id: "gift", label: "Kado" },
        ].map((chip) => {
          const active = filterCategory === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() =>
                setFilterCategory(chip.id as "all" | BestieExpenseCategory)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border cursor-pointer ${
                active
                  ? "bg-[#141619] text-white border-[#141619]"
                  : "bg-white text-[#525866] border-[#D8DDD0]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Expense List */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bento-card-subtle p-6 text-center space-y-2">
            <p className="font-display-bestie text-sm font-bold text-[#141619]">
              Belum ada transaksi patungan
            </p>
            <p className="text-xs text-[#525866]">
              Klik tombol &quot;+ Catat&quot; untuk membagi tagihan makan, kopi,
              atau penginapan bersama anggota Circle.
            </p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const cat =
              EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.other;
            const Icon = cat.icon;
            const participantCount =
              exp.participantIds?.length || members.length;
            const perPerson =
              exp.splitType === "equal" && participantCount > 0
                ? Math.round(exp.amount / participantCount)
                : null;

            return (
              <div
                key={exp.id}
                className="bento-card-subtle p-3.5 flex items-center justify-between gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cat.bg, color: cat.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-[#141619] truncate">
                      {exp.title}
                    </h4>
                    <span
                      className={`text-[9px] font-mono-bestie font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        exp.isSettled
                          ? "bg-[#D1FAE5] text-[#064E3B]"
                          : "bg-[#FFE4D6] text-[#7C2D12]"
                      }`}
                    >
                      {exp.isSettled ? "LUNAS" : "AKTIF"}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#525866] mt-0.5 truncate">
                    Ditalangi <b className="text-[#141619]">{exp.payerName}</b> •{" "}
                    {exp.splitType === "treat"
                      ? "Traktiran"
                      : `Bagi ${participantCount} orang${
                          perPerson ? ` (@${formatRupiah(perPerson)})` : ""
                        }`}
                  </p>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="font-mono-bestie text-xs font-bold text-[#141619]">
                    {formatRupiah(exp.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        toggleBestieExpenseSettled(
                          room.id,
                          exp.id,
                          !exp.isSettled
                        )
                      }
                      className="p-1 text-[#525866] hover:text-[#059669] cursor-pointer"
                      title={exp.isSettled ? "Tandai belum lunas" : "Tandai lunas"}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBestieExpense(room.id, exp.id)}
                      className="p-1 text-[#525866] hover:text-rose-600 cursor-pointer"
                      title="Hapus"
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

      {/* ADD MULTI-USER EXPENSE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Catat Patungan Circle
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Nama Pengeluaran
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kopi & Camilan Sore"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Total Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="150000"
                    className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as BestieExpenseCategory)
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-bold"
                  >
                    <option value="food">Kuliner</option>
                    <option value="hangout">Nongkrong</option>
                    <option value="trip">Perjalanan</option>
                    <option value="transport">Transport</option>
                    <option value="accommodation">Penginapan</option>
                    <option value="gift">Patungan Kado</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Select Payer */}
              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Siapa yang Bayar Duluan (Payer)?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {members.map((m) => {
                    const active = payerId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayerId(m.id)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border truncate cursor-pointer ${
                          active
                            ? "bg-[#2554E8] text-white border-[#141619]"
                            : "bg-[#F6F7F3] text-[#141619] border-[#D8DDD0]"
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Split Type */}
              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Metode Pembagian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitType("equal")}
                    className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      splitType === "equal"
                        ? "bg-[#141619] text-white border-[#141619]"
                        : "bg-[#F6F7F3] text-[#525866] border-[#D8DDD0]"
                    }`}
                  >
                    Bagi Rata Partisipan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("treat")}
                    className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      splitType === "treat"
                        ? "bg-[#141619] text-white border-[#141619]"
                        : "bg-[#F6F7F3] text-[#525866] border-[#D8DDD0]"
                    }`}
                  >
                    Ditraktir Payer
                  </button>
                </div>
              </div>

              {/* Select Participants (1..6) */}
              {splitType === "equal" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#141619]">
                      Anggota yang Ikut ({selectedParticipants.length} orang)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedParticipants(members.map((m) => m.id))
                      }
                      className="text-[10px] font-bold text-[#2554E8] underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {members.map((m) => {
                      const checked = selectedParticipants.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleParticipant(m.id)}
                          className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-between cursor-pointer ${
                            checked
                              ? "bg-[#DBE4FF] border-[#2554E8] text-[#0B2170]"
                              : "bg-[#F6F7F3] border-[#D8DDD0] text-[#525866]"
                          }`}
                        >
                          <span className="truncate">{m.name}</span>
                          {checked && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-xs font-mono-bestie"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-lime text-xs font-bold uppercase cursor-pointer"
              >
                Simpan Transaksi Patungan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
