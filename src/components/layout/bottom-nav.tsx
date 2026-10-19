"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Gift, MapPin, Wallet, Images, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/story",
    label: "Story",
    icon: Heart,
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: Gift,
  },
  {
    href: "/map",
    label: "Memories",
    icon: MapPin,
  },
  {
    href: "/gallery",
    label: "Galeri",
    icon: Images,
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Wallet,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const isRoomActive = pathname.startsWith("/more");

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3 pointer-events-auto relative">
        {/*
          Room & Settings lives as a secondary floating button.
          It sits in the 4px slot above the nav pill so it clears both the nav
          (a) and the map's locate FAB (b), whose bottom-8 position starts
          ~136px above the viewport bottom on the map screen.
        */}
        <Link
          href="/more"
          title="Room & Settings"
          aria-label="Buka Room & Settings"
          aria-current={isRoomActive ? "page" : undefined}
          className={cn(
            "pointer-events-auto absolute right-4 bottom-full z-10 mb-1 flex h-11 w-11 items-center justify-center rounded-full border shadow-md transition-all active:scale-95",
            isRoomActive
              ? "border-[#e5bdbe] bg-[#ffdada] text-[#b80035] shadow-rose-900/15"
              : "border-[#e5bdbe] bg-[#faf2ee] text-[#5c3f40] hover:bg-[#ffdada]/70 hover:text-[#b80035]"
          )}
        >
          <Home className="w-5 h-5" />
        </Link>

        <div className="h-16 px-1 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_25px_-5px_rgba(68,64,60,0.08),0_8px_10px_-6px_rgba(225,29,72,0.04)] flex items-center justify-around border border-rose-100/50">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-transform active:scale-95",
                  isActive
                    ? "text-[#e11d48] font-bold"
                    : "text-[#5c3f40]/70 hover:text-[#1e1b19]"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110 fill-[#e11d48]/20"
                  )}
                />
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
