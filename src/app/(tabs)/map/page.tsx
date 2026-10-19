"use client";

import dynamic from "next/dynamic";
import { useRoomStore } from "@/stores/roomStore";
import { Loader2, HeartHandshake } from "lucide-react";
import Link from "next/link";

// Dynamic import with ssr: false to prevent Next.js server crash on Leaflet window object
const MemoryMapView = dynamic(
  () => import("@/components/map/memory-map-view"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100dvh-176px)] min-h-[420px] max-h-[640px] rounded-3xl bg-[#faf2ee] border border-[#e5bdbe]/60 flex flex-col items-center justify-center p-6 text-center animate-pulse">
        <div className="w-12 h-12 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center mb-3">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="font-bold text-sm text-[#1e1b19]">Memuat Peta Kenangan Kita...</p>
        <p className="text-xs text-[#5c3f40] mt-1">Mengambil koordinat OpenStreetMap</p>
      </div>
    ),
  }
);

export default function MemoryMapPage() {
  const { room } = useRoomStore();

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center mb-4">
          <HeartHandshake className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#1e1b19]">Hubungkan Ruang Cinta Kalian</h2>
        <p className="text-sm text-[#5c3f40] mt-1.5 max-w-xs">
          Buat atau gabung ke room terlebih dahulu untuk mulai menandai tempat bersejarah di peta!
        </p>
        <Link
          href="/story"
          className="mt-5 px-6 py-2.5 rounded-full bg-[#b80035] text-white text-xs font-bold shadow-md shadow-rose-900/20 active:scale-95 transition-all"
        >
          Masuk ke Room
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Interactive OpenStreetMap Container */}
      <MemoryMapView />
    </div>
  );
}
