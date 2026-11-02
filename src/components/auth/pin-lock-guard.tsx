"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { setRoomPrivacyPin } from "@/lib/services/roomService";
import { hashPin } from "@/lib/crypto";
import { Lock, KeyRound, ShieldAlert, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PinLockGuardProps {
  children: React.ReactNode;
  featureTitle: string;
}

export function PinLockGuard({ children, featureTitle }: PinLockGuardProps) {
  const { room } = useRoomStore();
  // Always lock upon mounting the page
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Flow states: "verify" | "create_1" | "create_2"
  const hasPin = Boolean(room?.privacyPinHash);
  const [flow, setFlow] = useState<"verify" | "create_1" | "create_2">(
    hasPin ? "verify" : "create_1"
  );

  const [inputPin, setInputPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!room) return <>{children}</>;
  if (isUnlocked) return <>{children}</>;

  const handleDigit = (digit: string) => {
    if (inputPin.length >= 6) return;
    const next = inputPin + digit;
    setInputPin(next);
    setErrorMsg("");

    // Auto submit at 4 digits
    if (next.length === 4) {
      processPin(next);
    }
  };

  const handleBackspace = () => {
    setInputPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const processPin = async (pinValue: string) => {
    if (flow === "verify") {
      setLoading(true);
      try {
        const hashed = await hashPin(pinValue);
        if (hashed === room.privacyPinHash) {
          setIsUnlocked(true);
          toast.success("Akses terbuka! 🔓");
        } else {
          setErrorMsg("PIN salah, coba lagi");
          setInputPin("");
        }
      } catch {
        setErrorMsg("Gagal memvalidasi PIN");
      } finally {
        setLoading(false);
      }
    } else if (flow === "create_1") {
      setFirstPin(pinValue);
      setInputPin("");
      setFlow("create_2");
    } else if (flow === "create_2") {
      if (pinValue !== firstPin) {
        setErrorMsg("PIN tidak cocok! Masukkan ulang dari awal.");
        setInputPin("");
        setFirstPin("");
        setFlow("create_1");
        return;
      }

      setLoading(true);
      try {
        const hashed = await hashPin(pinValue);
        await setRoomPrivacyPin(room.id, hashed, room);
        // Optimistically update current room in store so listener latency doesn't re-lock
        useRoomStore.setState((state) => ({
          room: state.room ? { ...state.room, privacyPinHash: hashed } : null,
        }));
        setIsUnlocked(true);
        toast.success("PIN privasi berhasil dibuat & disimpan! 🔐");
      } catch (err: any) {
        console.error("Gagal simpan PIN:", err);
        setErrorMsg(err?.message || "Gagal menyimpan PIN baru");
      } finally {
        setLoading(false);
      }
    }
  };

  const getHeading = () => {
    if (flow === "verify") return `Buka Kunci ${featureTitle}`;
    if (flow === "create_1") return "Buat PIN Privasi Baru";
    return "Konfirmasi PIN Sekali Lagi";
  };

  const getSubheading = () => {
    if (flow === "verify")
      return "Masukkan 4 digit PIN berdua untuk melihat konten privat ini";
    if (flow === "create_1")
      return "Fitur ini dilindungi. Buat 4 digit PIN bersama untuk pertama kali";
    return "Ketik ulang 4 digit PIN yang baru saja kamu buat";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 max-w-sm mx-auto text-center animate-in fade-in duration-300">
      {/* Lock Icon */}
      <div className="w-16 h-16 rounded-full bg-rose-50 text-[#e11d48] flex items-center justify-center mb-4 border border-rose-100 shadow-xs">
        {flow === "verify" ? (
          <Lock className="w-7 h-7" />
        ) : (
          <KeyRound className="w-7 h-7" />
        )}
      </div>

      <h2 className="text-xl font-bold text-[#1e1b19] tracking-tight mb-1">
        {getHeading()}
      </h2>
      <p className="text-xs text-stone-500 mb-6 max-w-xs">{getSubheading()}</p>

      {/* PIN Dots Display */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {[0, 1, 2, 3].map((idx) => {
          const filled = inputPin.length > idx;
          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                filled
                  ? "bg-[#e11d48] scale-110 shadow-xs"
                  : "bg-stone-200 border border-stone-300"
              }`}
            />
          );
        })}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mb-4 bg-rose-50 px-3 py-1.5 rounded-full">
          <ShieldAlert className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            disabled={loading}
            onClick={() => handleDigit(num)}
            className="h-14 rounded-2xl bg-white border border-stone-200 text-lg font-bold text-[#1e1b19] shadow-xs active:bg-rose-50 active:scale-95 transition-all flex items-center justify-center hover:bg-stone-50 cursor-pointer disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDigit("0")}
          className="h-14 rounded-2xl bg-white border border-stone-200 text-lg font-bold text-[#1e1b19] shadow-xs active:bg-rose-50 active:scale-95 transition-all flex items-center justify-center hover:bg-stone-50 cursor-pointer disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading || inputPin.length === 0}
          onClick={handleBackspace}
          className="h-14 rounded-2xl bg-stone-100 text-stone-600 text-xs font-bold active:scale-95 transition-all flex items-center justify-center hover:bg-stone-200 cursor-pointer disabled:opacity-30"
        >
          Hapus
        </button>
      </div>

      <Link
        href="/story"
        className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Beranda</span>
      </Link>
    </div>
  );
}
