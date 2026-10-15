import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(amount));
}


export interface RelationshipStats {
  diffDays: number;
  daysUntilNextAnniversary: number;
  startDateText: string;
  hasCustomDate: boolean;
}

export function calculateRelationshipStats(
  relationshipStartDate?: string,
  connectedTimestamp?: number,
  isSolo: boolean = false
): RelationshipStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (relationshipStartDate) {
    const parts = relationshipStartDate.split("-").map(Number);
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const startDate = new Date(year, month - 1, day);
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

      // Next anniversary calculation
      const thisYearAnniv = new Date(now.getFullYear(), month - 1, day);
      let nextAnniv = thisYearAnniv;
      if (thisYearAnniv.getTime() < today.getTime()) {
        nextAnniv = new Date(now.getFullYear() + 1, month - 1, day);
      }
      const diffAnniv = Math.ceil((nextAnniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilNextAnniversary = diffAnniv === 0 ? 0 : diffAnniv;

      const startDateText = `Sejak ${startDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;

      return {
        diffDays,
        daysUntilNextAnniversary,
        startDateText,
        hasCustomDate: true,
      };
    }
  }

  // Fallback to connected timestamp if partner joined and no custom date set
  if (!isSolo && connectedTimestamp) {
    const connectedDate = new Date(connectedTimestamp);
    const connDateOnly = new Date(connectedDate.getFullYear(), connectedDate.getMonth(), connectedDate.getDate());
    const diffTime = Math.max(0, today.getTime() - connDateOnly.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const daysUntilNextAnniversary = 365 - ((diffDays - 1) % 365);
    const startDateText = `Sejak ${connectedDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;

    return {
      diffDays,
      daysUntilNextAnniversary,
      startDateText,
      hasCustomDate: false,
    };
  }

  return {
    diffDays: 0,
    daysUntilNextAnniversary: 365,
    startDateText: "Belum atur tanggal hubungan",
    hasCustomDate: false,
  };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export function formatTargetDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return "";

  const startParts = startDate.split("-").map(Number);
  if (startParts.length !== 3) return startDate;
  const [sYear, sMonth, sDay] = startParts;
  const sMonthName = MONTH_NAMES[sMonth - 1] || "";

  if (!endDate || endDate === startDate) {
    return `${sDay} ${sMonthName} ${sYear}`;
  }

  const endParts = endDate.split("-").map(Number);
  if (endParts.length !== 3) {
    return `${sDay} ${sMonthName} ${sYear}`;
  }
  const [eYear, eMonth, eDay] = endParts;
  const eMonthName = MONTH_NAMES[eMonth - 1] || "";

  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay} - ${eDay} ${sMonthName} ${sYear}`;
  }

  if (sYear === eYear) {
    return `${sDay} ${sMonthName} - ${eDay} ${eMonthName} ${sYear}`;
  }

  return `${sDay} ${sMonthName} ${sYear} - ${eDay} ${eMonthName} ${eYear}`;
}

export function triggerFloatingHearts(emoji: string = "💕", count: number = 7) {
  if (typeof window === "undefined" || !document?.body) return;
  const emojis = [emoji, "💖", "❤️", "✨", "🥰", "💌"];

  for (let i = 0; i < count; i++) {
    const heart = document.createElement("div");
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomX = Math.random() * 80 + 10; // 10% to 90% of screen width
    const randomDelay = Math.random() * 350;

    heart.innerHTML = randomEmoji;
    heart.className = "fixed text-3xl pointer-events-none select-none z-[9999]";
    heart.style.left = `${randomX}%`;
    heart.style.bottom = "90px";
    heart.style.opacity = "0";
    heart.style.transform = "scale(0.5) translateY(0)";
    heart.style.transition = "transform 1400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1400ms ease-out";

    document.body.appendChild(heart);

    setTimeout(() => {
      heart.style.opacity = "1";
      heart.style.transform = `scale(${1 + Math.random() * 0.6}) translateY(-${180 + Math.random() * 220}px) rotate(${(Math.random() - 0.5) * 60}deg)`;
      setTimeout(() => {
        heart.style.opacity = "0";
        setTimeout(() => heart.remove(), 400);
      }, 1000);
    }, randomDelay);
  }
}
