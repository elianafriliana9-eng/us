"use client";

import { useEffect, useState } from "react";
import { useBestieStore } from "@/stores/bestieStore";
import {
  subscribeToWacana,
  createWacanaItem,
  addWacanaContribution,
  toggleWacanaCompleted,
  deleteWacanaItem,
} from "@/lib/services/bestieService";
import {
  WacanaItem,
  WacanaCategory,
  getMemberColor,
} from "@/types/bestie";
import { formatRupiah } from "@/lib/utils";
import {
  Target,
  Plus,
  CheckCircle2,
  TrendingUp,
  Trash2,
  Calendar,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function BestieWacanaPage() {
  const { room, currentUser } = useBestieStore();
  const [items, setItems] = useState<WacanaItem[]>([]);
  const [filter, setFilter] = useState<"all" | WacanaCategory>("all");

  // Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WacanaCategory>("trip");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");

  // Contribution Modal
  const [activeItemForSave, setActiveItemForSave] =
    useState<WacanaItem | null>(null);
  const [contributorId, setContributorId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("50000");

  useEffect(() => {
    if (!room?.id) return;
    const unsub = subscribeToWacana(room.id, setItems);
    return () => unsub();
  }, [room?.id]);

  if (!room || !currentUser) return null;

  const totalTarget = items.reduce((s, i) => s + (i.targetPrice || 0), 0);
  const totalSaved = items.reduce((s, i) => s + (i.currentSaved || 0), 0);
  const completedCount = items.filter((i) => i.isCompleted).length;
  const overallPct =
    totalTarget > 0
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0;

  const handleCreateWacana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createWacanaItem(room.id, currentUser, {
        title,
        category,
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
        targetDate: targetDate || undefined,
        notes,
        url,
      });
      setTitle("");
      setTargetPrice("");
      setTargetDate("");
      setNotes("");
      setUrl("");
      setIsAddOpen(false);
      toast.success("Wacana baru berhasil ditambahkan");
    } catch {
      toast.error("Gagal menyimpan wacana");
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForSave) return;
    const num = Number(contributionAmount);
    if (!num || num <= 0) return;

    try {
      await addWacanaContribution(
        room.id,
        activeItemForSave,
        contributorId || currentUser.id,
        num
      );
      setActiveItemForSave(null);
      toast.success("Setoran tabungan Circle tercatat");
    } catch {
      toast.error("Gagal mencatat setoran");
    }
  };

  const filteredItems = items.filter((i) =>
    filter === "all" ? true : i.category === filter
  );

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display-bestie text-xl font-bold text-[#141619] uppercase flex items-center gap-2">
            <span>Wacana & Tabungan</span>
            <Target className="w-5 h-5 text-[#2554E8]" />
          </h1>
          <p className="text-xs text-[#525866]">
            Ubah wacana liburan dan kado grup jadi terealisasi
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="h-10 px-3.5 rounded-xl bento-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Wacana</span>
        </button>
      </div>

      {/* Overview Hero Card */}
      <div className="bento-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono-bestie text-[10px] font-bold uppercase text-[#525866] block">
              PROGRES REALISASI CIRCLE
            </span>
            <span className="font-display-bestie text-lg font-bold text-[#141619]">
              {completedCount} dari {items.length} Wacana Terlaksana
            </span>
          </div>
          <span className="font-mono-bestie text-xs font-bold px-2.5 py-1 rounded-lg bg-[#C8F547] border border-[#141619]">
            {overallPct}%
          </span>
        </div>

        {totalTarget > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-[#525866]">
                Terkumpul:{" "}
                <b className="font-mono-bestie text-[#2554E8]">
                  {formatRupiah(totalSaved)}
                </b>
              </span>
              <span className="font-mono-bestie text-[11px] text-[#141619] font-bold">
                Target: {formatRupiah(totalTarget)}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-lg bg-[#EFF1EA] border border-[#141619] overflow-hidden">
              <div
                className="h-full bg-[#2554E8] transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: "Semua Wacana" },
          { id: "trip", label: "Perjalanan" },
          { id: "culinary", label: "Kulineran" },
          { id: "gift", label: "Kado Sahabat" },
          { id: "activity", label: "Aktivitas" },
        ].map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id as "all" | WacanaCategory)}
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

      {/* Wacana Items */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bento-card-subtle p-6 text-center space-y-2">
            <p className="font-display-bestie text-sm font-bold text-[#141619]">
              Daftar wacana masih kosong
            </p>
            <p className="text-xs text-[#525866]">
              Tambahkan rencana trip bareng, target tabungan, atau kado ulang
              tahun anggota Circle.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const hasTarget = !!item.targetPrice && item.targetPrice > 0;
            const contribs = item.contributions || {};

            return (
              <div key={item.id} className="bento-card-subtle p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-bestie text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EFF1EA] text-[#141619]">
                      {item.category}
                    </span>
                    {item.targetDate && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-bestie text-[#2554E8] font-bold">
                        <Calendar className="w-3 h-3" />
                        <span>{item.targetDate}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleWacanaCompleted(room.id, item)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                      item.isCompleted
                        ? "bg-[#D1FAE5] border-[#059669] text-[#064E3B]"
                        : "bg-[#F6F7F3] border-[#D8DDD0] text-[#525866]"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      {item.isCompleted ? "Terlaksana" : "Tandai Selesai"}
                    </span>
                  </button>
                </div>

                <div>
                  <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                    {item.title}
                  </h3>
                  {item.notes && (
                    <p className="text-xs text-[#525866] mt-0.5">{item.notes}</p>
                  )}
                </div>

                {/* Multi-Member Savings Progress */}
                {hasTarget && (
                  <div className="rounded-xl bg-[#F6F7F3] border border-[#D8DDD0] p-3 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#525866]">
                        Terkumpul:{" "}
                        <b className="font-mono-bestie text-[#141619]">
                          {formatRupiah(item.currentSaved || 0)}
                        </b>
                      </span>
                      <span className="font-mono-bestie text-[11px] font-bold text-[#2554E8]">
                        Target: {formatRupiah(item.targetPrice!)}
                      </span>
                    </div>

                    {/* Multi-color stacked bar per member contribution */}
                    <div className="h-2.5 w-full rounded-lg bg-white border border-[#141619] overflow-hidden flex">
                      {room.members.map((m, idx) => {
                        const memberAmt = contribs[m.id] || 0;
                        if (memberAmt <= 0) return null;
                        const pct = Math.min(
                          100,
                          Math.round((memberAmt / item.targetPrice!) * 100)
                        );
                        const token = getMemberColor(m.colorId, idx);
                        return (
                          <div
                            key={m.id}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: token.hex,
                            }}
                            className="h-full"
                            title={`${m.name}: ${formatRupiah(memberAmt)}`}
                          />
                        );
                      })}
                    </div>

                    {/* Member contribution breakdown */}
                    {Object.keys(contribs).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {room.members.map((m, idx) => {
                          const amt = contribs[m.id] || 0;
                          if (amt <= 0) return null;
                          const token = getMemberColor(m.colorId, idx);
                          return (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#D8DDD0] text-[10px] font-medium"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: token.hex }}
                              />
                              <span>
                                {m.name}:{" "}
                                <b className="font-mono-bestie">
                                  {formatRupiah(amt)}
                                </b>
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-1 border-t border-[#EFF1EA] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasTarget && (
                      <button
                        type="button"
                        onClick={() => {
                          setContributorId(currentUser.id);
                          setActiveItemForSave(item);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#DBE4FF] text-[#2554E8] text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+ Setor Tabungan</span>
                      </button>
                    )}

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#141619] underline"
                      >
                        <span>Buka Tautan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteWacanaItem(room.id, item.id)}
                    className="p-1 text-[#525866] hover:text-rose-600 cursor-pointer"
                    title="Hapus wacana"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: CREATE WACANA */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Tambah Wacana Circle
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWacana} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Judul Rencana / Wacana
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Sewa Villa Puncak 2 Malam"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as WacanaCategory)
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-bold"
                  >
                    <option value="trip">Perjalanan</option>
                    <option value="culinary">Kulineran</option>
                    <option value="gift">Kado Sahabat</option>
                    <option value="activity">Aktivitas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Target Dana (Opsional)
                  </label>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="1800000"
                    className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Target Tanggal
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-xs font-mono-bestie"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Link Referensi
                  </label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Catatan
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Patungan Rp 300.000 per orang"
                  className="w-full h-10 px-3 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-primary text-xs font-bold uppercase cursor-pointer"
              >
                Simpan Wacana
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MEMBER CONTRIBUTION */}
      {activeItemForSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Catat Setoran Tabungan
              </h3>
              <button
                type="button"
                onClick={() => setActiveItemForSave(null)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContribution} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Siapa yang Menyetor?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {room.members.map((m) => {
                    const active = contributorId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setContributorId(m.id)}
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

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Nominal Setoran (Rp)
                </label>
                <input
                  type="number"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie font-bold"
                  required
                />
                <div className="flex gap-1.5 mt-2">
                  {[50000, 100000, 250000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setContributionAmount(String(preset))}
                      className="flex-1 py-1 rounded bg-[#EFF1EA] border border-[#D8DDD0] text-[10px] font-mono-bestie font-bold cursor-pointer"
                    >
                      +{preset / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-lime text-xs font-bold uppercase cursor-pointer"
              >
                Simpan Setoran
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
