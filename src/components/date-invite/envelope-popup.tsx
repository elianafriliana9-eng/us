"use client";

import { useState } from "react";
import { Mail, Heart, Calendar, Clock, MapPin, X, Check, HeartCrack, Sparkles } from "lucide-react";
import { DateInvite } from "@/types/dateInvite";
import { respondToDateInvite } from "@/lib/services/dateInviteService";
import { triggerFloatingHearts } from "@/lib/utils";
import { toast } from "sonner";

interface EnvelopePopupProps {
  invite: DateInvite;
  roomId: string;
  onDismiss: () => void;
}

export function EnvelopePopup({ invite, roomId, onDismiss }: EnvelopePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answered, setAnswered] = useState<"accepted" | "declined" | null>(null);

  const handleOpenLetter = () => {
    if (!isOpen) {
      setIsOpen(true);
      triggerFloatingHearts("💌", 8);
    }
  };

  const handleResponse = async (status: "accepted" | "declined") => {
    setLoading(true);
    try {
      await respondToDateInvite(roomId, invite.id, status);
      setAnswered(status);
      if (status === "accepted") {
        triggerFloatingHearts("💖", 15);
        toast.success("Yay! Undangan kencan diterima! 💕", { duration: 3000 });
      } else {
        toast.info("Undangan kencan ditolak.", { duration: 3000 });
      }
      setTimeout(() => {
        onDismiss();
      }, 1600);
    } catch {
      toast.error("Gagal mengirim tanggapan");
      setLoading(false);
    }
  };

  // Format date nicely
  const formattedDate = (() => {
    try {
      const parts = invite.date.split("-").map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    } catch {}
    return invite.date;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 hover:bg-white text-stone-700 active:scale-95 transition-all shadow-md cursor-pointer"
        aria-label="Tutup"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-sm flex flex-col items-center">
        {!isOpen ? (
          /* Sealed Envelope View */
          <div
            onClick={handleOpenLetter}
            className="w-full cursor-pointer group select-none transition-transform hover:scale-102 active:scale-95"
          >
            {/* Ambient pulsed glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 rounded-3xl blur-xl opacity-60 animate-pulse" />

            <div className="relative bg-gradient-to-b from-[#fff2f2] to-[#ffdada] border-2 border-rose-300 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden">
              {/* Envelope flap aesthetic */}
              <div
                className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-rose-200 to-rose-100/40"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                }}
              />

              {/* Wax seal sticker */}
              <div className="relative z-10 my-4 w-16 h-16 rounded-full bg-[#b80035] shadow-lg flex items-center justify-center border-2 border-rose-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Heart className="w-8 h-8 fill-white text-white drop-shadow-xs" />
              </div>

              <div className="relative z-10 space-y-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/80 text-[#b80035] text-xs font-bold tracking-wide uppercase shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Undangan Spesial
                </span>
                <h3 className="text-xl font-bold text-[#1e1b19] pt-1">
                  Surat dari {invite.senderName} 💌
                </h3>
                <p className="text-xs text-[#5c3f40]">
                  Ada ajakan ngedate rahasia nih buat kamu!
                </p>
              </div>

              <div className="relative z-10 mt-6 pt-2 pb-1">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e11d48] text-white text-sm font-bold shadow-md shadow-rose-900/20 group-hover:bg-[#b80035] transition-colors">
                  <Mail className="w-4 h-4" />
                  Klik untuk Buka Amplop
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Opened Letter View */
          <div className="w-full bg-[#fffcf9] rounded-3xl p-6 shadow-2xl border-2 border-rose-200 animate-in zoom-in-90 fade-in duration-500 relative overflow-hidden">
            {/* Top decorative stamp/heart */}
            <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#ffdada] flex items-center justify-center text-[#b80035]">
                  <Heart className="w-5 h-5 fill-[#b80035]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-bold text-[#b80035] tracking-wider">
                    Date Invitation
                  </p>
                  <p className="text-xs text-[#5c3f40]">
                    Dari: <span className="font-bold text-[#1e1b19]">{invite.senderName}</span>
                  </p>
                </div>
              </div>
              <span className="text-2xl select-none">💌</span>
            </div>

            {/* Letter Content */}
            <div className="space-y-4 text-center">
              <div>
                <h3 className="text-2xl font-black text-[#1e1b19] tracking-tight leading-snug">
                  &ldquo;{invite.title}&rdquo;
                </h3>
                {invite.description && (
                  <p className="text-xs text-[#5c3f40] mt-2 whitespace-pre-wrap leading-relaxed bg-[#fff4f0] p-3 rounded-2xl border border-rose-100 italic">
                    {invite.description}
                  </p>
                )}
              </div>

              {/* Date details pills */}
              <div className="bg-[#faf2ee] rounded-2xl p-3.5 space-y-2 text-left border border-rose-100/60">
                <div className="flex items-center gap-2.5 text-xs text-[#1e1b19]">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#b80035] shadow-2xs shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5c3f40] block font-medium">Tanggal</span>
                    <span className="font-bold">{formattedDate}</span>
                  </div>
                </div>

                {invite.time && (
                  <div className="flex items-center gap-2.5 text-xs text-[#1e1b19]">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#855300] shadow-2xs shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5c3f40] block font-medium">Jam</span>
                      <span className="font-bold">{invite.time} WIB</span>
                    </div>
                  </div>
                )}

                {invite.location && (
                  <div className="flex items-center gap-2.5 text-xs text-[#1e1b19]">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#006847] shadow-2xs shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5c3f40] block font-medium">Lokasi</span>
                      <span className="font-bold">{invite.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Question & Actions */}
              {answered === null ? (
                <div className="pt-2 space-y-3">
                  <p className="text-sm font-bold text-[#b80035]">
                    Maukah kamu pergi kencan denganku? 🥰
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleResponse("declined")}
                      className="py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <HeartCrack className="w-4 h-4 text-stone-500" />
                      <span>Enggak Dulu</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleResponse("accepted")}
                      className="py-3 px-4 rounded-2xl bg-[#e11d48] hover:bg-[#b80035] text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-rose-900/20 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Iya, Mau! 💕</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 pb-1 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs bg-[#ffdada] text-[#b80035]">
                    {answered === "accepted" ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Jawaban terkirim: Mau banget! 💕</span>
                      </>
                    ) : (
                      <>
                        <HeartCrack className="w-4 h-4" />
                        <span>Jawaban terkirim: Lain kali ya 🥺</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
