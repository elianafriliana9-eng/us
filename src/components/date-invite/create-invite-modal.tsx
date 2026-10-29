"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { createDateInvite } from "@/lib/services/dateInviteService";
import { Mail, Calendar, Clock, MapPin, X, Send } from "lucide-react";
import { toast } from "sonner";
import { triggerFloatingHearts } from "@/lib/utils";

interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInviteModal({ isOpen, onClose }: CreateInviteModalProps) {
  const { room, currentUser } = useRoomStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const partner = room?.members.find((m) => m.id !== currentUser?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !currentUser) return;
    if (!title.trim() || !date) {
      toast.error("Judul kencan dan tanggal wajib diisi ya!");
      return;
    }

    setLoading(true);
    try {
      await createDateInvite(room.id, currentUser, partner?.id, {
        title,
        description,
        date,
        time,
        location,
      });

      triggerFloatingHearts("💌", 10);
      toast.success("Surat undangan kencan berhasil dikirim! 💌");
      onClose();
      setTitle("");
      setDescription("");
      setTime("");
      setLocation("");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim undangan kencan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#faf2ee]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffdada] flex items-center justify-center text-[#b80035]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1e1b19]">Ajak Ngedate 💕</h3>
              <p className="text-[10px] text-[#5c3f40]">
                Kirim amplop surat cinta ke {partner?.name || "pasangan"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-3">
          <div>
            <label className="text-[11px] font-bold text-[#1e1b19] block mb-1">
              Rencana Kencan *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Dinner Romantis & Nonton Bioskop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-[#fff8f5] focus:outline-none focus:border-[#e11d48]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-[#1e1b19] block mb-1">
                <Calendar className="w-3 h-3 inline mr-1 text-[#b80035]" />
                Tanggal *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-stone-200 bg-[#fff8f5] focus:outline-none focus:border-[#e11d48]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#1e1b19] block mb-1">
                <Clock className="w-3 h-3 inline mr-1 text-[#855300]" />
                Jam (Opsional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-stone-200 bg-[#fff8f5] focus:outline-none focus:border-[#e11d48]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#1e1b19] block mb-1">
              <MapPin className="w-3 h-3 inline mr-1 text-[#006847]" />
              Tempat / Resto (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Senopati / Mall Kelapa Gading"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-[#fff8f5] focus:outline-none focus:border-[#e11d48]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#1e1b19] block mb-1">
              Pesan Manis di Surat
            </label>
            <textarea
              rows={2}
              placeholder="Tulis pesan manis atau dresscode..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-[#fff8f5] focus:outline-none focus:border-[#e11d48] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-full bg-[#e11d48] text-white text-xs font-bold shadow-md shadow-rose-900/20 hover:bg-[#b80035] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Mengirim..." : "Kirim Undangan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
