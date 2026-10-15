"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRoomStore } from "@/stores/roomStore";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { calculateRelationshipStats } from "@/lib/utils";

export function TopHeader() {
  const pathname = usePathname();
  const { room, currentUser } = useRoomStore();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const partner = room.members.find((m) => m.id !== currentUser?.id);
  const isSolo = room.members.length < 2;

  let pageTitle = "Our Story";
  if (pathname.startsWith("/wishlist")) pageTitle = "Shared Wishlist";
  else if (pathname.startsWith("/expenses")) pageTitle = "Our Expenses";
  else if (pathname.startsWith("/map")) pageTitle = "Memory Map";
  else if (pathname.startsWith("/more")) pageTitle = "Room & Settings";

  // Calculate days together using custom start date or connected timestamp
  const connectedTimestamp = room.connectedAt || partner?.joinedAt;
  const stats = calculateRelationshipStats(
    room.relationshipStartDate,
    connectedTimestamp,
    isSolo
  );
  const daysTogether = stats.diffDays;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success(`Kode room "${room.code}" berhasil disalin!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  const handleShare = async () => {
    const inviteText = `Yuk join ruang privat kita di Us! Kode Room: ${room.code}\n${window.location.origin}/?join=${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Us Couple Space",
          text: inviteText,
          url: `${window.location.origin}/?join=${room.code}`,
        });
      } catch {
        handleCopyCode();
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#fff8f5]/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-md mx-auto px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Us Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[18px] font-bold text-[#b80035] tracking-tight leading-none">
              Us
            </span>
            <span className="text-[11px] text-[#5c3f40] font-semibold leading-none mt-0.5">
              {pageTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#faf2ee] shadow-[0_1px_4px_rgba(68,64,60,0.04)] active:scale-95 transition-transform"
            title="Bagikan undangan ke pasangan"
          >
            <span className={`w-2 h-2 rounded-full ${isSolo ? "bg-amber-400" : "bg-[#00845a]"} animate-pulse`} />
            <span className="text-[11px] text-[#1e1b19] font-semibold truncate max-w-[130px]">
              {isSolo && !stats.hasCustomDate
                ? "Menunggu Pasangan"
                : `${currentUser?.name} & ${partner?.name || "Pasangan"} 💕 Day ${daysTogether}`}
            </span>
          </button>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#ffdada]/60 text-[#b80035] text-[11px] font-mono font-bold active:scale-95 transition-transform"
            title="Klik untuk salin kode"
          >
            <span>{room.code}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
