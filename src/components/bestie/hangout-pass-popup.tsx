"use client";

import { useState } from "react";
import { Ticket, Calendar, Clock, MapPin, X, Check, HelpCircle, Ban } from "lucide-react";
import { HangoutPass, BestieCurrentUser, RsvpChoice } from "@/types/bestie";
import { respondToHangoutPass } from "@/lib/services/bestieService";
import { toast } from "sonner";

interface HangoutPassPopupProps {
  pass: HangoutPass;
  roomId: string;
  currentUser: BestieCurrentUser;
  onDismiss: () => void;
}

export function HangoutPassPopup({
  pass,
  roomId,
  currentUser,
  onDismiss,
}: HangoutPassPopupProps) {
  const [loading, setLoading] = useState(false);

  const handleRsvp = async (choice: RsvpChoice) => {
    setLoading(true);
    try {
      await respondToHangoutPass(roomId, pass, currentUser, choice);
      const label =
        choice === "going"
          ? "Konfirmasi Hadir tercatat & disinkronkan ke Kalender Circle"
          : choice === "maybe"
          ? "Status Belum Pasti tercatat"
          : "Status Berhalangan tercatat";
      toast.success(label);
      onDismiss();
    } catch {
      toast.error("Gagal menyimpan konfirmasi kehadiran");
      setLoading(false);
    }
  };

  const rsvpList = Object.values(pass.rsvps || {});
  const goingCount = rsvpList.filter((r) => r.choice === "going").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#141619] text-white border-2 border-[#141619] shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="px-5 py-4 bg-[#2554E8] flex items-center justify-between border-b-2 border-dashed border-[#141619]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C8F547] text-[#141619] flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono-bestie text-[10px] font-bold uppercase tracking-wider text-[#C8F547] block">
                HANGOUT PASS INVITATION
              </span>
              <span className="text-xs font-semibold text-white">
                Dari {pass.senderName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket Body */}
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-display-bestie text-xl font-bold text-white leading-snug">
              {pass.title}
            </h3>
            {pass.description && (
              <p className="text-xs text-[#D8DDD0] mt-1.5 leading-relaxed">
                {pass.description}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#C8F547] shrink-0" />
              <span className="font-mono-bestie font-bold">{pass.date}</span>
            </div>
            {pass.time && (
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#C8F547] shrink-0" />
                <span className="font-mono-bestie font-bold">{pass.time} WIB</span>
              </div>
            )}
            {pass.location && (
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span className="font-semibold">{pass.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#D8DDD0] pt-1">
            <span>Konfirmasi saat ini:</span>
            <span className="font-mono-bestie font-bold text-[#C8F547]">
              {goingCount} Anggota Hadir
            </span>
          </div>

          {/* 3 RSVP Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleRsvp("going")}
              className="py-2.5 px-2 rounded-xl bg-[#C8F547] text-[#141619] font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Hadir</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleRsvp("maybe")}
              className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-300" />
              <span>Liat Nanti</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleRsvp("cant")}
              className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <Ban className="w-4 h-4 text-rose-400" />
              <span>Absen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
