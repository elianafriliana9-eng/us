"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Target, Receipt, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const BESTIE_NAV_ITEMS = [
  {
    href: "/bestie/basecamp",
    label: "Basecamp",
    icon: Compass,
  },
  {
    href: "/bestie/map",
    label: "Peta",
    icon: MapPin,
  },
  {
    href: "/bestie/wacana",
    label: "Wacana",
    icon: Target,
  },
  {
    href: "/bestie/patungan",
    label: "Patungan",
    icon: Receipt,
  },
  {
    href: "/bestie/circle",
    label: "Circle",
    icon: Users,
  },
];

export function BestieBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3 pointer-events-auto relative">
        <div className="h-16 px-1.5 bg-white rounded-2xl border-2 border-[#141619] shadow-[0_4px_0_#141619] flex items-center justify-around">
          {BESTIE_NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[60px] py-1.5 px-2 rounded-xl transition-all active:scale-95",
                  isActive
                    ? "bg-[#2554E8] text-white font-bold shadow-[0_2px_0_#141619]"
                    : "text-[#525866] hover:text-[#141619]"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[10px] mt-0.5 tracking-tight font-bold">
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
