"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useBestieStore } from "@/stores/bestieStore";
import { isUserOnline } from "@/lib/services/presenceService";
import { getMemberColor } from "@/types/bestie";
import { Copy, Check, Share2, Users } from "lucide-react";
import { toast } from "sonner";

export function BestieTopHeader() {
  const pathname = usePathname();
  const { room, currentUser, presenceMap } = useBestieStore();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  let sectionLabel = "Basecamp";
  if (pathname.startsWith("/bestie/map")) sectionLabel = "Peta Markas";
  else if (pathname.startsWith("/bestie/wacana")) sectionLabel = "Wacana & Tabungan";
  else if (pathname.startsWith("/bestie/patungan")) sectionLabel = "Split Bill";
  else if (pathname.startsWith("/bestie/gallery")) sectionLabel = "Brankas Foto";
  else if (pathname.startsWith("/bestie/schedule")) sectionLabel = "Kalender & Agenda";
  else if (pathname.startsWith("/bestie/circle")) sectionLabel = "Manajemen Circle";

  const onlineCount = room.members.filter((m) => {
    if (m.id === currentUser?.id) return true;
    return isUserOnline(presenceMap[m.id]);
  }).length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success(`Kode Circle "${room.code}" disalin`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/bestie?join=${room.code}`;
    const text = `Gabung ke Circle "${room.name}" di Us Bestie Version. Kode: ${room.code}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${room.name} — Bestie Circle`,
          text,
          url,
        });
      } catch {
        handleCopyCode();
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#F6F7F3]/95 backdrop-blur-md pt-safe border-b border-[#D8DDD0]">
      <div className="h-16 max-w-md mx-auto px-4 flex items-center justify-between gap-2">
        {/* Left: Brand + Active Page */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#2554E8] border border-[#141619] flex items-center justify-center shrink-0 shadow-[0_2px_0_#141619]">
            <Users className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display-bestie text-sm font-bold text-[#141619] uppercase tracking-tight truncate">
                {room.name}
              </span>
              <span className="text-[10px] font-mono-bestie font-bold px-1.5 py-0.5 rounded bg-[#DBE4FF] text-[#2554E8] shrink-0">
                {room.members.length}/{room.maxMembers || 6}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#525866] leading-tight truncate">
              {sectionLabel}
            </span>
          </div>
        </div>

        {/* Right: Stacked Member Avatars + Code Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#D8DDD0] hover:border-[#141619] transition-colors cursor-pointer"
            title="Bagikan undangan Circle"
          >
            <div className="flex items-center -space-x-1.5">
              {room.members.slice(0, 6).map((m, idx) => {
                const token = getMemberColor(m.colorId, idx);
                const online =
                  m.id === currentUser?.id || isUserOnline(presenceMap[m.id]);
                return (
                  <div
                    key={m.id}
                    className="relative w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: token.hex }}
                    title={`${m.name} (${online ? "Online" : "Offline"})`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] font-bold text-[#141619] ml-0.5">
              {onlineCount} Aktif
            </span>
            <Share2 className="w-3 h-3 text-[#525866]" />
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C8F547] border border-[#141619] text-[#141619] text-[11px] font-mono-bestie font-bold shadow-[0_2px_0_#141619] active:translate-y-0.5 transition-all cursor-pointer"
            title="Salin kode Circle"
          >
            <span>{room.code}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#141619]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#141619]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
