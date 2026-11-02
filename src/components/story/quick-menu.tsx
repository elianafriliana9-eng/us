"use client";

import Link from "next/link";
import {
  CalendarDays,
  Images,
  UtensilsCrossed,
  Sparkles,
  Heart,
  Mail,
  Mic,
} from "lucide-react";

interface QuickMenuProps {
  onOpenInvite?: () => void;
  onOpenVoice?: () => void;
  onOpenStory?: () => void;
}

export function QuickMenu({
  onOpenInvite,
  onOpenVoice,
  onOpenStory,
}: QuickMenuProps) {
  const items = [
    {
      label: "Jadwal",
      icon: CalendarDays,
      href: "/schedule",
      color: "bg-rose-50 text-rose-600 border-rose-100",
    },
    {
      label: "Galeri",
      icon: Images,
      href: "/gallery",
      color: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      label: "Ajak Date",
      icon: Mail,
      onClick: onOpenInvite,
      color: "bg-pink-50 text-pink-600 border-pink-100",
    },
    {
      label: "Voice Note",
      icon: Mic,
      onClick: onOpenVoice,
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      label: "Tulis Cerita",
      icon: Heart,
      onClick: onOpenStory,
      color: "bg-red-50 text-red-600 border-red-100",
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
          Akses Cepat
        </span>
      </div>
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const content = (
            <div className="flex flex-col items-center gap-1.5 shrink-0 group">
              <div
                className={`w-13 h-13 rounded-2xl flex items-center justify-center border shadow-xs transition-all active:scale-95 group-hover:scale-105 ${item.color}`}
              >
                <Icon className="w-6 h-6 transition-transform" />
              </div>
              <span className="text-[11px] font-semibold text-stone-700 tracking-tight">
                {item.label}
              </span>
            </div>
          );

          if (item.href) {
            return (
              <Link key={idx} href={item.href}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className="text-left cursor-pointer"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
