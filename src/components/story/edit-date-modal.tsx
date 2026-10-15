"use client";

import { useState } from "react";
import { updateRelationshipStartDate } from "@/lib/services/roomService";
import { X, CalendarHeart, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { calculateRelationshipStats } from "@/lib/utils";

interface EditDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currentStartDate?: string;
}

export function EditDateModal({
  isOpen,
  onClose,
  roomId,
  currentStartDate,
}: EditDateModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(
    currentStartDate || todayStr
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Calculate live preview stats
  const previewStats = calculateRelationshipStats(selectedDate, undefined, false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error("Pilih tanggal mulai hubungan terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      await updateRelationshipStartDate(roomId, selectedDate);
      toast.success("Tanggal hubungan berhasil disimpan! 💕");
      onClose();
    } catch {
      toast.error("Gagal menyimpan tanggal hubungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPreset = (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eee7e3]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center shadow-xs">
              <CalendarHeart className="w-5 h-5 fill-[#b80035] text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1e1b19] leading-tight">
                Atur Tanggal Hubungan
              </h3>
              <p className="text-[11px] text-[#5c3f40] mt-0.5">
                Hitungan hari bersama dimulai dari tanggal ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Date Input */}
          <div>
            <label className="block text-xs font-bold text-[#1e1b19] mb-1.5">
              Tanggal Mulai / Jadian
            </label>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#faf2ee] border border-[#e5bdbe] text-sm text-[#1e1b19] font-semibold focus:outline-none focus:ring-2 focus:ring-[#b80035]/30 focus:border-[#b80035] transition-all"
              required
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-[#5c3f40] mb-1.5">
              Pilihan Cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1 rounded-xl bg-[#faf2ee] hover:bg-[#eee7e3] text-[11px] font-semibold text-[#1e1b19] border border-[#e5bdbe]/60 active:scale-95 transition-all"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(1)}
                className="px-2.5 py-1 rounded-xl bg-[#faf2ee] hover:bg-[#eee7e3] text-[11px] font-semibold text-[#1e1b19] border border-[#e5bdbe]/60 active:scale-95 transition-all"
              >
                1 Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(6)}
                className="px-2.5 py-1 rounded-xl bg-[#faf2ee] hover:bg-[#eee7e3] text-[11px] font-semibold text-[#1e1b19] border border-[#e5bdbe]/60 active:scale-95 transition-all"
              >
                6 Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(12)}
                className="px-2.5 py-1 rounded-xl bg-[#faf2ee] hover:bg-[#eee7e3] text-[11px] font-semibold text-[#1e1b19] border border-[#e5bdbe]/60 active:scale-95 transition-all"
              >
                1 Tahun Lalu
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#fff1f2] to-[#fff8f5] border border-[#ffdada] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#b80035] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preview Hitungan</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-[#1e1b19]">
                {previewStats.diffDays}
              </span>
              <span className="text-sm font-bold text-[#b80035]">
                Hari Bersama
              </span>
            </div>
            <p className="text-[11px] text-[#5c3f40] mt-1">
              {previewStats.startDateText} •{" "}
              {previewStats.daysUntilNextAnniversary === 0
                ? "Hari ini Anniversary! 🎉"
                : `${previewStats.daysUntilNextAnniversary} hari lagi Anniversary 🎂`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-2xl bg-[#faf2ee] hover:bg-[#eee7e3] text-xs font-bold text-[#5c3f40] active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-2xl bg-[#b80035] hover:bg-[#a1002e] text-xs font-bold text-white shadow-md shadow-rose-900/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Menyimpan..." : "Simpan Tanggal"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
