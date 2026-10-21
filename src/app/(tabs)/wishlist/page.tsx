"use client";

import { useEffect, useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { subscribeToWishlist } from "@/lib/services/wishlistService";
import { AddWishlistModal } from "@/components/wishlist/add-wishlist-modal";
import { AdjustProgressModal } from "@/components/wishlist/adjust-progress-modal";
import { WishlistItem, WishlistCategory } from "@/types/wishlist";
import { Gift, Plus, ExternalLink, CheckCircle2, TrendingUp, Calendar } from "lucide-react";

export default function WishlistPage() {
  const { room, currentUser } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [filter, setFilter] = useState<"all" | WishlistCategory>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<WishlistItem | null>(null);

  // Subscribe to real-time wishlist items
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToWishlist(room.id, (loadedItems) => {
      setItems(loadedItems);
    });

    return () => unsubscribe();
  }, [room?.id]);

  // Statistics
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.isCompleted).length;
  const totalTargetPrice = items.reduce((sum, i) => sum + (i.targetPrice || 0), 0);
  const totalSavedPrice = items.reduce((sum, i) => sum + (i.currentSaved || 0), 0);
  const overallPercent = totalTargetPrice > 0 ? Math.min(100, Math.round((totalSavedPrice / totalTargetPrice) * 100)) : 0;

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Hero: Wishlist & Savings Progress Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50">
        {/* Ambient glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ffddb8]/40 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#ffdada]/40 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#ffdada] text-[#b80035] flex items-center justify-center font-bold">
                <Gift className="w-5 h-5 text-[#b80035]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1e1b19]">Impian & Target Berdua</h3>
                <p className="text-[11px] text-[#5c3f40]">
                  {completedItems} dari {totalItems} impian tercapai {partner ? `bersama ${partner.name}` : ""} ✨
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-[#ffddb8]/60 text-[#855300] text-[11px] font-bold">
              {overallPercent}% Terkumpul
            </span>
          </div>

          {/* Savings Summary */}
          {totalTargetPrice > 0 && (
            <div className="pt-1">
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-[#5c3f40]">
                  Total Terkumpul: <b className="text-[#b80035]">Rp {new Intl.NumberFormat("id-ID").format(totalSavedPrice)}</b>
                </span>
                <span className="text-[#5c3f40] text-[11px]">
                  Target: Rp {new Intl.NumberFormat("id-ID").format(totalTargetPrice)}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#eee7e3] overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-[#e11d48] to-[#fea619] transition-all duration-500 rounded-full"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: "Semua Wishlist" },
          { id: "item", label: "Barang 🎁" },
          { id: "trip", label: "Trip ✈️" },
          { id: "future", label: "Masa Depan 💍" },
          { id: "daily", label: "Hal Lucu ☕" },
        ].map((chip) => {
          const isSelected = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id as "all" | WishlistCategory)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-transform active:scale-95 ${
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

      {/* Action Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold text-[#1e1b19]">Daftar Wishlist</span>
          <span className="px-2 py-0.5 rounded-full bg-[#eee7e3] text-[#5c3f40] text-[11px] font-bold">
            {filteredItems.length} item
          </span>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="h-10 px-4 rounded-full bg-[#e11d48] text-white flex items-center gap-1.5 shadow-[0_4px_14px_0_rgba(225,29,72,0.3)] active:scale-95 transition-all text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Wish</span>
        </button>
      </div>

      {/* Wishlist Feed */}
      <div className="flex flex-col space-y-4 pt-1">
        {filteredItems.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-8 shadow-xs border border-[#eee7e3] text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdada] text-[#b80035] flex items-center justify-center mb-2">
              <Gift className="w-6 h-6 text-[#b80035]" />
            </div>
            <h3 className="font-bold text-sm text-[#1e1b19]">Wishlist masih kosong</h3>
            <p className="text-xs text-[#5c3f40] mt-1 max-w-[240px] leading-relaxed">
              Catat barang impian, rencana liburan, atau kado spesial yang ingin kalian capai bersama!
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-3 px-4 py-2 rounded-full bg-[#e11d48] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              + Buat Wishlist Pertama
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const hasTarget = item.targetPrice && item.targetPrice > 0;
            const saved = item.currentSaved || 0;
            const percent = item.progressPercent || 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50 flex flex-col space-y-3 transition-all"
              >
                {/* Header row: Category & Target Date & Completed Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffddb8]/50 text-[#653e00] text-[11px] font-bold capitalize">
                      {item.category === "item" && "🎁 Barang"}
                      {item.category === "trip" && "✈️ Liburan / Trip"}
                      {item.category === "future" && "💍 Masa Depan"}
                      {item.category === "daily" && "☕ Hal Lucu"}
                    </span>

                    {item.targetDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-[#b80035] text-[11px] font-bold border border-rose-100">
                        <Calendar className="w-3 h-3 text-[#e11d48]" />
                        <span>Target: {item.targetDate}</span>
                      </span>
                    )}
                  </div>

                  {item.isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00845a]/15 text-[#00845a] text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tercapai 🎉
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#faf2ee] text-[#5c3f40] text-[11px] font-medium">
                      Sedang Berproses
                    </span>
                  )}
                </div>

                {/* Photo if provided */}
                {item.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-[#f4ece8] shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Title & Notes */}
                <div>
                  <h3 className="text-base font-bold text-[#1e1b19] leading-snug">
                    {item.title}
                  </h3>
                  {item.notes && (
                    <p className="text-xs text-[#5c3f40] mt-1 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Progress bar module */}
                {hasTarget ? (
                  <div className="rounded-2xl bg-[#fff8f5] p-3 border border-[#eee7e3] space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#5c3f40] font-medium">
                        Terkumpul: <b className="text-[#b80035]">Rp {new Intl.NumberFormat("id-ID").format(saved)}</b>
                      </span>
                      <span className="text-[#1e1b19] font-bold text-xs">
                        Target: Rp {new Intl.NumberFormat("id-ID").format(item.targetPrice!)}
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-[#eee7e3] overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-[#e11d48] to-[#fea619] transition-all duration-300 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#5c3f40] pt-0.5">
                      <span className="font-bold text-[#b80035]">{percent}% selesai</span>
                      <span>
                        Kurang: Rp {new Intl.NumberFormat("id-ID").format(Math.max(0, item.targetPrice! - saved))}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Actions row: Adjust Progress Button & Link */}
                <div className="pt-1 flex items-center justify-between border-t border-[#faf2ee]">
                  <button
                    onClick={() => setSelectedItemForAdjust(item)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ffdada] text-[#b80035] text-xs font-bold active:scale-95 transition-all shadow-xs"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Adjust Progres</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#b80035] font-semibold hover:underline"
                      >
                        <span>Lihat Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="text-[10px] text-[#5c3f40]">
                      oleh <b>{item.createdByName}</b>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AddWishlistModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <AdjustProgressModal
        key={selectedItemForAdjust?.id ?? "none"}
        item={selectedItemForAdjust}
        isOpen={!!selectedItemForAdjust}
        onClose={() => setSelectedItemForAdjust(null)}
      />
    </div>
  );
}
