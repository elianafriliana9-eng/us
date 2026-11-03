"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const BestieMapView = dynamic(
  () => import("@/components/bestie/bestie-map-view"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] rounded-2xl bg-[#EFF1EA] border-2 border-[#141619] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2554E8] mb-2" />
        <p className="font-display-bestie text-sm font-bold text-[#141619]">
          Memuat Peta Markas Circle...
        </p>
      </div>
    ),
  }
);

export default function BestieMapPage() {
  return <BestieMapView />;
}
