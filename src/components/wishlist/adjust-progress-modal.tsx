"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { updateWishlistProgress, toggleWishlistCompleted, deleteWishlistItem } from "@/lib/services/wishlistService";
import { WishlistItem } from "@/types/wishlist";
import { Sparkles, X, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdjustProgressModalProps {
  item: WishlistItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdjustProgressModal({
  item,
  isOpen,
  onClose,
}: AdjustProgressModalProps) {
  const { room, currentUser } = useRoomStore();

  const [savedAmount, setSavedAmount] = useState<number>(item?.currentSaved || 0);
  const [loading, setLoading] = useState(false);

  // Sync state when item changes
  const target = item?.targetPrice || 0;
  const currentSaved = savedAmount;
  const percent = target > 0 ? Math.min(100, Math.round((currentSaved / target) * 100)) : item?.progressPercent || 0;

  if (!isOpen || !item) return null;

  const handleAddQuick = (amount: number) => {
    setSavedAmount((prev) => prev + amount);
  };

  const handleSave = async () => {
    if (!room) return;
    setLoading(true);
    try {
      await updateWishlistProgress(room.id, item.id, savedAmount, item.targetPrice);
      if (item.targetPrice && savedAmount >= item.targetPrice) {
        toast.success(`Horeee! Impian "${item.title}" sudah 100% tercapai! 🎉💖`);
      } else {
        toast.success("Progres berhasil diperbarui! ✨");
      }
      onClose();
    } catch {
      toast.error("Gagal memperbarui progres.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!room || !currentUser) return;
    setLoading(true);
    try {
      const nextState = !item.isCompleted;
      await toggleWishlistCompleted(room.id, item.id, nextState, currentUser.name);
      toast.success(
        nextState
          ? `Selamat! "${item.title}" ditandai sudah tercapai! 🎉`
          : `Status "${item.title}" dikembalikan ke sedang berproses.`
      );
      onClose();
    } catch {
      toast.error("Gagal mengubah status.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!room) return;
    if (confirm(`Hapus "${item.title}" dari wishlist berdua?`)) {
      setLoading(true);
      try {
        await deleteWishlistItem(room.id, item.id);
        toast.info("Wishlist berhasil dihapus.");
        onClose();
      } catch {
        toast.error("Gagal menghapus wishlist.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#eee7e3]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#fea619]" />
            <h3 className="font-bold text-[17px] text-[#1e1b19]">Adjust Progres Impian</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Item Info Box */}
          <div className="rounded-2xl bg-[#faf2ee] p-4 border border-[#e5bdbe]">
            <span className="text-xs text-[#5c3f40] block">Wishlist</span>
            <h4 className="font-bold text-base text-[#1e1b19] mt-0.5">{item.title}</h4>
            {target > 0 ? (
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs text-[#5c3f40]">
                  Terkumpul: <b className="text-[#b80035]">Rp {new Intl.NumberFormat("id-ID").format(currentSaved)}</b>
                </span>
                <span className="text-xs text-[#5c3f40]">
                  Target: <b>Rp {new Intl.NumberFormat("id-ID").format(target)}</b>
                </span>
              </div>
            ) : (
              <p className="text-xs text-[#5c3f40] mt-1">Tidak ada estimasi nominal biaya</p>
            )}

            {/* Live Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-bold text-[#5c3f40] mb-1">
                <span>Progres Saat Ini</span>
                <span className="text-[#b80035]">{percent}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#eee7e3] overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-[#e11d48] to-[#fea619] transition-all duration-300 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Add Buttons if Target Exists */}
          {target > 0 && (
            <div>
              <label className="text-xs font-semibold text-[#1e1b19] block mb-1.5">
                Tambah Cepat Tabungan
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[50000, 100000, 250000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAddQuick(amt)}
                    className="h-9 rounded-xl border border-[#e5bdbe] bg-[#fff8f5] text-[11px] font-bold text-[#b80035] hover:bg-[#ffdada] active:scale-95 transition-all"
                  >
                    +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Input Amount */}
          {target > 0 && (
            <div>
              <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
                Atau Masukkan Total Tabungan Terkumpul (Rp)
              </label>
              <input
                type="text"
                value={new Intl.NumberFormat("id-ID").format(savedAmount)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setSavedAmount(val ? parseInt(val, 10) : 0);
                }}
                className="w-full h-11 px-3.5 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] font-bold focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
              />
            </div>
          )}

          {/* Mark as Completed Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                item.isCompleted
                  ? "bg-[#faf2ee] text-[#5c3f40] border border-[#e5bdbe]"
                  : "bg-[#00845a]/10 text-[#00845a] border border-[#00845a]/30 active:scale-95"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {item.isCompleted ? "Kembalikan ke Belum Tercapai" : "Tandai Sudah Terbeli / Tercapai! 🎉"}
              </span>
            </button>
          </div>

          {/* Actions: Save & Delete */}
          <div className="pt-2 flex items-center gap-2 border-t border-[#eee7e3]">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="h-11 px-3.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 active:scale-95 transition-all"
              title="Hapus wishlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-11 rounded-full bg-[#e11d48] text-white text-xs font-bold shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Progres ✨"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
