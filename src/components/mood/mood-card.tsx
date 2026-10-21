"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { useRoomStore } from "@/stores/roomStore";
import { MoodEntry } from "@/types/mood";
import {
  getDateKey,
  getTodayKey,
  getMoodOn,
  getMoodStreak,
  getRecentMoodDays,
} from "@/lib/services/moodService";
import { MoodPicker } from "@/components/mood/mood-picker";

interface MoodCardProps {
  /** Live mood entries from the room (fed by the page's subscription) */
  moods: MoodEntry[];
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function MoodCard({ moods }: MoodCardProps) {
  const { room, currentUser } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);
  const isSolo = !partner || (room?.members.length ?? 0) < 2;

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [partnerPulse, setPartnerPulse] = useState(false);

  const todayKey = getTodayKey();

  const myToday = currentUser ? getMoodOn(moods, currentUser.id, todayKey) : undefined;
  const partnerToday = partner ? getMoodOn(moods, partner.id, todayKey) : undefined;
  const streak = currentUser ? getMoodStreak(moods, currentUser.id, todayKey) : 0;

  const myDays: (MoodEntry | undefined)[] = currentUser
    ? getRecentMoodDays(moods, currentUser.id, 7, todayKey)
    : [];
  const partnerDays: (MoodEntry | undefined)[] = partner
    ? getRecentMoodDays(moods, partner.id, 7, todayKey)
    : [];

  // Oldest-first slice of the last 7 calendar days (labels + alignment for the strip)
  const dayCells = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const dateKey = getDateKey(day);
    return {
      dateKey,
      label: DAY_LABELS[day.getDay()],
      isToday: dateKey === todayKey,
      mine: myDays[i],
      theirs: partnerDays[i],
    };
  });

  // --- Realtime nudge: notice when the partner's mood changes while watching ---
  const partnerSignature = partnerToday
    ? `${partnerToday.mood}|${partnerToday.note ?? ""}`
    : "";
  const previousSignature = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousSignature.current;
    previousSignature.current = partnerSignature;
    // Ignore the very first snapshot (no animation on mount) and no-op updates.
    if (previous === null || previous === partnerSignature) return;

    setPartnerPulse(true);
    const timer = setTimeout(() => setPartnerPulse(false), 900);
    return () => clearTimeout(timer);
  }, [partnerSignature]);

  if (!room || !currentUser) return null;

  const myInitial = currentUser.name?.charAt(0).toUpperCase() || "U";
  const partnerInitial = partner?.name?.charAt(0).toUpperCase() || "P";

  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50">
      {/* Header: icon + title, streak pill on the right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-[#ffdada] flex items-center justify-center shrink-0">
            <Smile className="w-4 h-4 text-[#b80035]" />
          </span>
          <h3 className="text-[13px] font-bold text-[#1e1b19] truncate">Mood Hari Ini</h3>
        </div>

        {streak > 0 ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffddb8]/50 text-[#653e00] text-[11px] font-bold">
            <span aria-hidden="true">🔥</span>
            <span>{streak} hari beruntun</span>
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-[#f4ece8] text-[#5c3f40] text-[11px] font-bold">
            Mulai streak kamu
          </span>
        )}
      </div>

      {/* Two columns: Kamu + Pasangan */}
      <div className={`grid ${isSolo ? "grid-cols-1" : "grid-cols-2"} gap-3 mt-3`}>
        {/* Kamu — always tappable, opens the picker */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-6 h-6 rounded-full bg-[#ffdada] text-[#b80035] text-[10px] font-bold flex items-center justify-center shrink-0">
              {myInitial}
            </span>
            <span className="text-[10px] font-bold text-[#5c3f40]">Kamu</span>
          </div>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="w-full min-h-[104px] rounded-2xl border border-[#eee7e3] bg-[#fff8f5] hover:bg-[#faf2ee] active:scale-95 transition-all flex flex-col items-center justify-center gap-1 px-2 py-2.5 cursor-pointer"
            title="Pilih mood harian kamu"
          >
            {myToday ? (
              <>
                <span className="text-3xl leading-none">{myToday.emoji}</span>
                <span className="text-[11px] font-bold text-[#1e1b19]">{myToday.label}</span>
                <span className="text-[10px] text-[#5c3f40]/70">Ketuk untuk ubah</span>
              </>
            ) : (
              <>
                <span className="w-11 h-11 rounded-full border border-dashed border-[#e5bdbe] bg-white flex items-center justify-center">
                  <Smile className="w-5 h-5 text-[#5c3f40]/40" />
                </span>
                <span className="text-[11px] font-bold text-[#b80035]">Pilih mood</span>
              </>
            )}
          </button>
        </div>

        {/* Pasangan — display only, never tappable */}
        {!isSolo && partner && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-[#ffddb8] text-[#855300] text-[10px] font-bold flex items-center justify-center shrink-0">
                {partnerInitial}
              </span>
              <span className="text-[10px] font-bold text-[#5c3f40]">Pasangan</span>
            </div>

            <div className="w-full min-h-[104px] rounded-2xl border border-[#eee7e3] bg-[#faf2ee] flex flex-col items-center justify-center gap-1 px-2 py-2.5">
              {partnerToday ? (
                <>
                  <span
                    className={`text-3xl leading-none transition-transform ${
                      partnerPulse ? "animate-bounce" : ""
                    }`}
                  >
                    {partnerToday.emoji}
                  </span>
                  <span className="text-[11px] font-bold text-[#1e1b19]">
                    {partnerToday.label}
                  </span>
                  {partnerToday.note && (
                    <span className="w-full text-center text-[10px] text-[#5c3f40] truncate">
                      {partnerToday.note}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-11 h-11 rounded-full border border-dashed border-[#e5bdbe] bg-white flex items-center justify-center" />
                  <span className="text-[11px] font-semibold text-[#5c3f40]">
                    Belum check-in
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7-day history strip */}
      <div className="mt-3 pt-3 border-t border-[#faf2ee]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-[#5c3f40]">7 hari terakhir</span>
          {!isSolo && (
            <span className="text-[9px] text-[#5c3f40]/70 truncate">
              kamu di atas, pasanganmu di bawah
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayCells.map((cell) => (
            <div key={cell.dateKey} className="flex flex-col items-center gap-1 min-w-0">
              <span
                className={`text-[9px] leading-none ${
                  cell.isToday ? "text-[#b80035] font-bold" : "text-[#5c3f40]/70"
                }`}
              >
                {cell.label}
              </span>

              <div className="flex flex-col items-center justify-start min-h-[38px] pt-0.5">
                {cell.mine ? (
                  <span className="text-base leading-none">{cell.mine.emoji}</span>
                ) : (
                  <span className="block w-5 h-5 rounded-full border border-dashed border-[#e5bdbe]" />
                )}

                {!isSolo &&
                  (cell.theirs ? (
                    <span className="block text-[11px] leading-none mt-1">
                      {cell.theirs.emoji}
                    </span>
                  ) : (
                    <span className="block w-3.5 h-3.5 mt-1 rounded-full border border-dashed border-[#e5bdbe]/70" />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tapping your own mood (set or unset) opens this sheet */}
      <MoodPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} />
    </div>
  );
}
