"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoomStore } from "@/stores/roomStore";
import { createRoom, joinRoomByCode } from "@/lib/services/roomService";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function RoomOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("join") || "";

  const { room, isHydrated, setRoom, setCurrentUser } = useRoomStore();

  const [mode, setMode] = useState<"create" | "join">(initialCode ? "join" : "create");
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);

  // If already in a room, redirect straight to story
  useEffect(() => {
    if (isHydrated && room) {
      router.replace("/story");
    }
  }, [isHydrated, room, router]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast.error("Tuliskan nama panggilanmu dulu ya!");
      return;
    }

    setLoading(true);
    try {
      const { room: newRoom, currentUser } = await createRoom(userName);
      setRoom(newRoom);
      setCurrentUser(currentUser);
      toast.success(`Room berhasil dibuat! Kode: ${newRoom.code}`);
      router.replace("/story");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal membuat room. Coba lagi.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast.error("Tuliskan nama panggilanmu dulu ya!");
      return;
    }
    if (!roomCode.trim()) {
      toast.error("Masukkan kode room dari pasanganmu!");
      return;
    }

    setLoading(true);
    try {
      const { room: joinedRoom, currentUser } = await joinRoomByCode(
        roomCode,
        userName
      );
      setRoom(joinedRoom);
      setCurrentUser(currentUser);
      toast.success(`Berhasil bergabung ke room! 💕`);
      router.replace("/story");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal bergabung. Pastikan kodenya benar.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fff8f5]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#b80035] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6 bg-[#fff8f5] text-[#1e1b19]">
      <div className="flex flex-col items-center text-center pt-8">
        {/* Logo Badge */}
        <div className="relative mb-4 flex h-24 w-24 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Us Logo"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#b80035]">
          Us
        </h1>
        <p className="mt-1 text-sm text-[#5c3f40] max-w-[280px] leading-relaxed">
          Ruang privat untuk dua hati berbagi momen, cerita, dan rencana berdua.
        </p>

        {/* Mode Switcher */}
        <div className="mt-7 flex w-full max-w-xs rounded-2xl bg-[#f4ece8] p-1 border border-[#eee7e3]">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
              mode === "create"
                ? "bg-white text-[#b80035] shadow-xs"
                : "text-[#5c3f40] hover:text-[#1e1b19]"
            }`}
          >
            Buat Room
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
              mode === "join"
                ? "bg-white text-[#b80035] shadow-xs"
                : "text-[#5c3f40] hover:text-[#1e1b19]"
            }`}
          >
            Gabung Room
          </button>
        </div>

        {/* Card Form */}
        <div className="mt-5 w-full">
          {mode === "create" ? (
            <div className="rounded-3xl bg-white p-5 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50 text-left">
              <h2 className="text-base font-bold text-[#1e1b19]">Mulai Ruang Privat</h2>
              <p className="text-xs text-[#5c3f40] mt-0.5 mb-4">
                Buat room baru lalu bagikan kodenya ke pasanganmu.
              </p>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1e1b19]">
                    Nama Panggilanmu
                  </label>
                  <input
                    placeholder="Contoh: Bubu, Sayang, Abi..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={30}
                    className="w-full h-11 px-4 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#e11d48] text-white text-xs font-bold shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Membuat Room..." : "Buat Ruang Kita 💖"}
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-5 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50 text-left">
              <h2 className="text-base font-bold text-[#1e1b19]">Gabung ke Room Pasangan</h2>
              <p className="text-xs text-[#5c3f40] mt-0.5 mb-4">
                Masukkan kode room 6-karakter yang dibagikan pasanganmu.
              </p>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1e1b19]">
                    Nama Panggilanmu
                  </label>
                  <input
                    placeholder="Contoh: Didi, Sayang..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={30}
                    className="w-full h-11 px-4 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1e1b19]">
                    Kode Room (6 Karakter)
                  </label>
                  <input
                    placeholder="Contoh: 7K9A2M"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="w-full h-11 px-4 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-base font-mono font-bold text-center tracking-widest uppercase text-[#b80035] focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#e11d48] text-white text-xs font-bold shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Menghubungkan..." : "Gabung Sekarang ✨"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-[#5c3f40] pb-safe">
        <ShieldCheck className="w-4 h-4 text-[#00845a]" />
        <span>Data privat terisolasi, khusus hanya untuk kalian berdua</span>
      </div>
    </div>
  );
}

export default function RoomOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#fff8f5]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#b80035] border-t-transparent" />
        </div>
      }
    >
      <RoomOnboardingContent />
    </Suspense>
  );
}
