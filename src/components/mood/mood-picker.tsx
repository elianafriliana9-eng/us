"use client";

import { useEffect, useRef, useState } from "react";
import { Smile, X } from "lucide-react";
import { useRoomStore } from "@/stores/roomStore";
import { MOODS, MoodKey, MoodOption } from "@/types/mood";
import {
  getMoodOn,
  getTodayKey,
  setMood,
  subscribeToMoods,
} from "@/lib/services/moodService";
import { toast } from "sonner";

interface MoodPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoodPicker({ isOpen, onClose }: MoodPickerProps) {
  const { room, currentUser } = useRoomStore();

  const [selected, setSelected] = useState<MoodKey | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-select the mood that is already saved for today. Hydration happens in
  // the subscription callback (not the effect body), and `touchedRef` makes
  // sure a live partner update never clobbers what the user is picking.
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      touchedRef.current = false;
      return;
    }
    if (!room?.id || !currentUser?.id) return;

    touchedRef.current = false;
    const unsubscribe = subscribeToMoods(room.id, (moods) => {
      if (touchedRef.current) return;

      const mine = getMoodOn(moods, currentUser.id, getTodayKey());
      setSelected(mine ? mine.mood : null);
      setNote(mine?.note ?? "");
    });

    return () => unsubscribe();
  }, [isOpen, room?.id, currentUser?.id]);

  if (!isOpen) return null;

  const selectedMood: MoodOption | undefined = selected
    ? MOODS.find((mood) => mood.key === selected)
    : undefined;

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSave = async () => {
    if (!room || !currentUser || !selectedMood || loading) return;

    setLoading(true);
    try {
      await setMood(room.id, currentUser, selectedMood, note.trim() || undefined);
      toast.success("Mood hari ini tersimpan! 💕");
      onClose();
    } catch (error) {
      console.error("Gagal menyimpan mood:", error);
      toast.error("Gagal menyimpan mood");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-[#eee7e3] shrink-0">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[17px] text-[#1e1b19]">Mood Hari Ini</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
          {/* Mood grid */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Gimana perasaanmu hari ini?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {MOODS.map((mood) => {
                const isSelected = selected === mood.key;
                return (
                  <button
                    key={mood.key}
                    type="button"
                    onClick={() => {
                      touchedRef.current = true;
                      setSelected(mood.key);
                    }}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-3.5 transition-all active:scale-95 cursor-pointer ${
                      isSelected ? "scale-105" : "hover:opacity-90"
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${mood.color}26` : `${mood.color}12`,
                      borderColor: isSelected ? mood.color : "#eee7e3",
                      boxShadow: isSelected
                        ? `0 0 0 2px ${mood.color}, 0 8px 18px -8px ${mood.color}`
                        : "none",
                    }}
                  >
                    <span className="text-3xl leading-none">{mood.emoji}</span>
                    <span className="text-[11px] font-bold text-[#1e1b19]">{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional one-line note */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">Catatan</label>
            <input
              type="text"
              placeholder="Ceritakan sedikit hari ini.. (opsional)"
              value={note}
              onChange={(e) => {
                touchedRef.current = true;
                setNote(e.target.value);
              }}
              maxLength={120}
              className="w-full h-11 px-3.5 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
            />
          </div>
        </div>

        {/* Action Buttons Pinned at Bottom */}
        <div className="p-4 pt-3 pb-8 sm:pb-4 border-t border-[#eee7e3] bg-white flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 h-11 rounded-full border border-[#e5bdbe] text-xs font-semibold text-[#5c3f40] hover:bg-[#faf2ee] active:scale-95 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !selectedMood}
            className="flex-1 h-11 rounded-full bg-[#e11d48] text-white text-xs font-semibold shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Mood 💕"}
          </button>
        </div>
      </div>
    </div>
  );
}
