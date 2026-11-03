"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useBestieStore } from "@/stores/bestieStore";
import {
  createBestieRoom,
  joinBestieRoomByCode,
  getBestieRoomByCode,
} from "@/lib/services/bestieService";
import {
  BestieRoom,
  BestieMember,
  getMemberColor,
  MAX_BESTIE_MEMBERS,
} from "@/types/bestie";
import {
  Users,
  ShieldCheck,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

function BestieOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("join") || "";

  const { room, isHydrated, setRoom, setCurrentUser } = useBestieStore();

  const [mode, setMode] = useState<"create" | "join">(
    initialCode ? "join" : "create"
  );
  const [circleName, setCircleName] = useState("");
  const [userName, setUserName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [roomCode, setRoomCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [detectedRoom, setDetectedRoom] = useState<BestieRoom | null>(null);

  useEffect(() => {
    if (isHydrated && room) {
      router.replace("/bestie/basecamp");
    }
  }, [isHydrated, room, router]);

  useEffect(() => {
    const clean = roomCode.trim().toUpperCase();
    if (clean.length !== 6 || mode !== "join") {
      return;
    }

    let isMounted = true;
    getBestieRoomByCode(clean).then((found) => {
      if (isMounted) setDetectedRoom(found);
    });

    return () => {
      isMounted = false;
    };
  }, [roomCode, mode]);

  const activeDetectedRoom =
    roomCode.trim().length === 6 && mode === "join" ? detectedRoom : null;

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) {
      toast.error("Tuliskan nama Circle terlebih dahulu");
      return;
    }
    if (!userName.trim()) {
      toast.error("Tuliskan nama panggilanmu");
      return;
    }

    setLoading(true);
    try {
      const { room: newRoom, currentUser } = await createBestieRoom(
        circleName,
        userName,
        birthday
      );
      setRoom(newRoom);
      setCurrentUser(currentUser);
      toast.success(`Circle "${newRoom.name}" dibuat. Kode: ${newRoom.code}`);
      router.replace("/bestie/basecamp");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal membuat Circle";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (member: BestieMember) => {
    setLoading(true);
    try {
      const { room: joinedRoom, currentUser } = await joinBestieRoomByCode(
        roomCode,
        member.name,
        member.id
      );
      setRoom(joinedRoom);
      setCurrentUser(currentUser);
      toast.success(`Selamat datang kembali, ${member.name}`);
      router.replace("/bestie/basecamp");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal masuk kembali";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      toast.error("Masukkan kode Circle 6 karakter");
      return;
    }
    if (!userName.trim()) {
      toast.error("Tuliskan nama panggilanmu");
      return;
    }

    setLoading(true);
    try {
      const { room: joinedRoom, currentUser } = await joinBestieRoomByCode(
        roomCode,
        userName,
        undefined,
        birthday
      );
      setRoom(joinedRoom);
      setCurrentUser(currentUser);
      toast.success(`Berhasil bergabung ke ${joinedRoom.name}`);
      router.replace("/bestie/basecamp");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal bergabung. Pastikan kode benar.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F6F7F3]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2554E8] border-t-transparent" />
      </div>
    );
  }

  const memberCount = activeDetectedRoom?.members?.length || 0;
  const maxMembers = activeDetectedRoom?.maxMembers || MAX_BESTIE_MEMBERS;
  const isRoomFull = memberCount >= maxMembers;

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6 bg-[#F6F7F3] text-[#141619] max-w-md mx-auto">
      <div>
        {/* Back to Couple Version Link */}
        <div className="pt-2 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D8DDD0] hover:border-[#141619] text-xs font-bold text-[#141619] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Couple Version</span>
          </Link>

          <span className="px-2.5 py-1 rounded-lg bg-[#C8F547] border border-[#141619] font-mono-bestie text-[10px] font-bold uppercase">
            MAX 6 USERS / ROOM
          </span>
        </div>

        {/* Brand Header */}
        <div className="mt-6 flex flex-col items-start text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#2554E8] border-2 border-[#141619] shadow-[0_3px_0_#141619] flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>

          <h1 className="font-display-bestie text-3xl font-bold tracking-tight text-[#141619]">
            Us • Bestie Edition
          </h1>
          <p className="mt-1 text-xs text-[#525866] leading-relaxed">
            Markas privat untuk circle sahabat (maksimal 6 anggota). Satu tempat
            untuk rencana perjalanan, patungan, peta basecamp, dan arsip foto.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-[#EFF1EA] p-1 border border-[#141619]">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mode === "create"
                ? "bg-[#2554E8] text-white shadow-[0_2px_0_#141619]"
                : "text-[#525866] hover:text-[#141619]"
            }`}
          >
            Buat Circle Baru
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mode === "join"
                ? "bg-[#2554E8] text-white shadow-[0_2px_0_#141619]"
                : "text-[#525866] hover:text-[#141619]"
            }`}
          >
            Gabung Circle
          </button>
        </div>

        {/* Form Card */}
        <div className="mt-4">
          {mode === "create" ? (
            <div className="bento-card p-5 space-y-4">
              <div>
                <h2 className="font-display-bestie text-base font-bold text-[#141619]">
                  Buka Markas Circle Baru
                </h2>
                <p className="text-xs text-[#525866] mt-0.5">
                  Buat room dan bagikan kode 6 karakter ke maksimal 5 sahabatmu.
                </p>
              </div>

              <form onSubmit={handleCreateCircle} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#141619] block">
                    Nama Circle / Geng
                  </label>
                  <input
                    placeholder="Contoh: Wacana Forever, Sekte Kopi"
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    maxLength={32}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-sm font-medium text-[#141619] focus:outline-none focus:ring-2 focus:ring-[#2554E8]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#141619] block">
                    Nama Panggilanmu (Host)
                  </label>
                  <input
                    placeholder="Contoh: Raka, Nadia, Dimas"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={24}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-sm font-medium text-[#141619] focus:outline-none focus:ring-2 focus:ring-[#2554E8]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#141619] flex items-center justify-between">
                    <span>Tanggal Ulang Tahun (Opsional)</span>
                    <span className="text-[10px] font-mono-bestie text-[#525866]">
                      Format: BB-HH
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      placeholder="Contoh: 08-24 (24 Agustus)"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      maxLength={5}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-sm font-mono-bestie text-[#141619] focus:outline-none focus:border-[#141619]"
                    />
                    <Calendar className="w-4 h-4 text-[#525866] absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bento-btn-primary text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>
                    {loading ? "Membuat Circle..." : "Buat Circle Sekarang"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bento-card p-5 space-y-4">
              <div>
                <h2 className="font-display-bestie text-base font-bold text-[#141619]">
                  Masuk / Gabung ke Circle
                </h2>
                <p className="text-xs text-[#525866] mt-0.5">
                  Ketik 6 karakter kode Circle untuk masuk kembali atau gabung
                  sebagai anggota baru.
                </p>
              </div>

              <form onSubmit={handleJoinCircle} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#141619] block">
                    Kode Circle (6 Karakter)
                  </label>
                  <input
                    placeholder="B9K4M2"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="w-full h-12 px-4 rounded-xl border-2 border-[#141619] bg-[#F6F7F3] text-lg font-mono-bestie font-bold text-center tracking-widest uppercase text-[#2554E8] focus:outline-none"
                    required
                  />
                </div>

                {/* Detected Room Member Selector (1 to 6 slots) */}
                {activeDetectedRoom && (
                  <div className="p-3.5 rounded-xl bg-[#EFF1EA] border border-[#141619] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#141619]">
                        {activeDetectedRoom.name}
                      </span>
                      <span className="font-mono-bestie text-[10px] font-bold px-2 py-0.5 rounded bg-[#C8F547] border border-[#141619]">
                        {memberCount}/{maxMembers} SLOT TERISI
                      </span>
                    </div>

                    {activeDetectedRoom.members.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#525866] block">
                          Sudah terdaftar? Klik namamu untuk masuk kembali:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {activeDetectedRoom.members.map((m, idx) => {
                            const token = getMemberColor(m.colorId, idx);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                disabled={loading}
                                onClick={() => handleSelectProfile(m)}
                                className="p-2 rounded-lg bg-white border border-[#D8DDD0] hover:border-[#141619] text-left flex items-center justify-between transition-all cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: token.hex }}
                                  >
                                    {m.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-[#141619] block truncate">
                                      {m.name}
                                    </span>
                                    <span className="text-[9px] text-[#525866] uppercase font-mono-bestie">
                                      {m.role}
                                    </span>
                                  </div>
                                </div>
                                <UserCheck className="w-3.5 h-3.5 text-[#2554E8] shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Join as new member if room has available slots */}
                {(!activeDetectedRoom || !isRoomFull) && (
                  <div className="space-y-3 pt-1">
                    {activeDetectedRoom && (
                      <span className="text-[11px] font-bold text-[#2554E8] block">
                        Atau gabung sebagai anggota baru (tersisa{" "}
                        {maxMembers - memberCount} slot):
                      </span>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#141619] block">
                        Nama Panggilanmu
                      </label>
                      <input
                        placeholder="Contoh: Salsa, Kevin"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        maxLength={24}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-sm font-medium text-[#141619] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#141619] flex items-center justify-between">
                        <span>Tanggal Ulang Tahun (Opsional)</span>
                        <span className="text-[10px] font-mono-bestie text-[#525866]">
                          Format: BB-HH
                        </span>
                      </label>
                      <input
                        placeholder="Contoh: 11-05 (5 November)"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        maxLength={5}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-sm font-mono-bestie text-[#141619] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-xl bento-btn-lime text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <span>
                        {loading ? "Menghubungkan..." : "Gabung ke Circle"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-[#525866] pb-safe">
        <ShieldCheck className="w-4 h-4 text-[#2554E8]" />
        <span>Terisolasi penuh dari mode Pasangan • Maks. 6 anggota per room</span>
      </div>
    </div>
  );
}

export default function BestieOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F6F7F3]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2554E8] border-t-transparent" />
        </div>
      }
    >
      <BestieOnboardingContent />
    </Suspense>
  );
}
