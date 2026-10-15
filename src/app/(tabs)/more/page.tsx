"use client";

import { useRoomStore } from "@/stores/roomStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, Users, Check, Copy, Lock, LogOut, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { resetPartnerSlot } from "@/lib/services/roomService";

export default function MorePage() {
  const router = useRouter();
  const { room, currentUser, leaveRoom } = useRoomStore();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const partner = room.members.find((m) => m.id !== currentUser?.id);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success("Kode room berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  const handleLeaveRoom = () => {
    if (confirm("Yakin ingin keluar dari ruang ini? Kamu butuh kode room lagi untuk bergabung kembali.")) {
      leaveRoom();
      toast.info("Kamu telah keluar dari room");
      router.replace("/");
    }
  };

  const handleResetPartner = async () => {
    if (
      confirm(
        "Kosongkan slot pasangan? Gunakan ini jika slot pasangan tertukar atau duplikat, agar pasanganmu yang sebenarnya bisa bergabung kembali."
      )
    ) {
      try {
        await resetPartnerSlot(room.id);
        toast.success("Slot pasangan berhasil dikosongkan. Siap untuk pasangan bergabung!");
      } catch {
        toast.error("Gagal mengosongkan slot pasangan");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <h2 className="text-xl font-bold tracking-tight text-[#1e1b19] flex items-center gap-1.5">
          Room & Settings
          <Home className="w-5 h-5 text-[#855300]" />
        </h2>
        <p className="text-xs text-[#5c3f40]">
          Informasi ruang privat & pengaturan berdua
        </p>
      </div>

      {/* Room Card */}
      <div className="bg-white rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-[#faf2ee]">
          <span className="text-sm font-bold text-[#1e1b19] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#b80035]" />
            Anggota Ruang
          </span>
          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-[#ffdada] text-[#b80035]">
            {room.code}
          </span>
        </div>

        {/* Current user pill */}
        <div className="flex items-center justify-between rounded-2xl bg-[#fff8f5] p-3 border border-[#eee7e3]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffdada] text-[#b80035] font-bold text-sm">
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-[#1e1b19]">
                {currentUser?.name}{" "}
                <span className="text-[10px] text-[#e11d48] font-normal">(Kamu)</span>
              </p>
              <p className="text-[10px] text-[#5c3f40] capitalize">{currentUser?.role}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#eee7e3] text-[#1e1b19]">
            Aktif
          </span>
        </div>

        {/* Partner pill */}
        {partner ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-[#faf2ee] p-3 border border-[#eee7e3]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffddb8] text-[#855300] font-bold text-sm">
                  {partner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1e1b19]">
                    {partner.name}{" "}
                    <span className="text-[10px] text-[#855300] font-normal">(Pasangan)</span>
                  </p>
                  <p className="text-[10px] text-[#5c3f40]">Terhubung 💕</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00845a]/15 text-[#00845a]">
                Tersambung
              </span>
            </div>

            {currentUser?.role === "creator" && (
              <button
                onClick={handleResetPartner}
                className="w-full py-2 px-3 rounded-xl border border-rose-200/80 bg-rose-50/50 hover:bg-rose-100/60 text-[#b80035] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Hapus slot pasangan jika terisi akun duplikat atau ingin mengundang ulang"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Reset / Kosongkan Slot Pasangan (Jika Duplikat)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#fea619] bg-[#ffddb8]/20 p-4 text-center">
            <p className="text-xs text-[#855300] font-bold">
              Pasanganmu belum bergabung
            </p>
            <p className="text-[11px] text-[#653e00] mt-0.5">
              Bagikan kode <span className="font-mono font-extrabold">{room.code}</span> sekarang
            </p>
            <button
              onClick={handleCopyCode}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#855300] text-xs font-bold shadow-xs active:scale-95 transition-all border border-[#fea619]/40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Disalin!" : "Salin Kode Undangan"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50 space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1 text-[#5c3f40]">
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#00845a]" />
            Privasi Data
          </span>
          <span className="text-[#1e1b19] font-semibold">Khusus 2 Orang</span>
        </div>
        <div className="flex items-center justify-between py-1 text-[#5c3f40]">
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Us" className="w-4 h-4 object-contain" />
            Versi Aplikasi
          </span>
          <span className="text-[#1e1b19] font-semibold">Us v0.1.0</span>
        </div>
      </div>

      {/* Leave Room Button */}
      <div className="pt-2 text-center space-y-1.5">
        <button
          onClick={handleLeaveRoom}
          className="w-full h-11 rounded-full border border-[#ffdad6] bg-white text-[#ba1a1a] text-xs font-bold hover:bg-[#ffdad6]/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Ruang (Logout dari HP Ini)</span>
        </button>
        <p className="text-[10px] text-[#5c3f40]/70">
          Data kalian tetap tersimpan di cloud. Kamu bisa masuk kembali kapan saja dengan kode room.
        </p>
      </div>
    </div>
  );
}
