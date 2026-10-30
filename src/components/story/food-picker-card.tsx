"use client";

import { useState } from "react";
import { Utensils, Shuffle, Plus, X, Sparkles, ChevronDown } from "lucide-react";
import { WishlistItem } from "@/types/wishlist";

const DEFAULT_OPTIONS = [
  "Mie Gacoan 🍜",
  "Nasi Padang 🍛",
  "Sushi / Ramen 🍣",
  "Ayam Geprek 🍗",
  "Bakso & Cuanki 🥣",
  "Masak di Rumah 🍳",
  "Fast Food / Burger 🍔",
  "Kopi & Pastry ☕",
];

interface FoodPickerCardProps {
  wishlistItems?: WishlistItem[];
}

export function FoodPickerCard({ wishlistItems = [] }: FoodPickerCardProps) {
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS);
  const [newOption, setNewOption] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Ambil item makanan dari wishlist jika ada
  const foodWishlists = wishlistItems
    .filter((w) => !w.isCompleted)
    .map((w) => w.title);

  const handleImportWishlist = () => {
    if (foodWishlists.length === 0) return;
    const merged = Array.from(new Set([...options, ...foodWishlists]));
    setOptions(merged);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newOption.trim();
    if (!clean || options.includes(clean)) return;
    setOptions([...options, clean]);
    setNewOption("");
  };

  const handleRemove = (target: string) => {
    if (options.length <= 2) return; // ponytail: minimal 2 opsi untuk roulette
    setOptions(options.filter((o) => o !== target));
  };

  const handlePick = () => {
    if (options.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    // ponytail: interval shuffle 1.5 detik, no external physics engine
    let ticks = 0;
    const maxTicks = 15;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * options.length);
      setResult(options[randomIdx]);
      ticks++;

      if (ticks >= maxTicks) {
        clearInterval(interval);
        const finalIdx = Math.floor(Math.random() * options.length);
        setResult(options[finalIdx]);
        setIsSpinning(false);
      }
    }, 90);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50">
      <div className="flex items-center justify-between pb-2 border-b border-[#faf2ee]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#ffddb8] text-[#855300] flex items-center justify-center font-bold">
            <Utensils className="w-4 h-4 text-[#855300]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1e1b19]">Makan Mana Hari Ini?</h3>
            <p className="text-[10px] text-[#5c3f40]">Solusi &quot;terserah kamu&quot;</p>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#faf2ee] text-[#5c3f40] hover:text-[#b80035] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
        >
          <span>{options.length} Pilihan</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showConfig ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Result Display Box */}
      <div className="my-3 py-4 px-3 rounded-2xl bg-[#fff8f5] border border-rose-100/70 text-center flex flex-col items-center justify-center min-h-[72px]">
        {result ? (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            <Sparkles className="w-4 h-4 text-[#fea619] shrink-0 animate-spin" />
            <span className="text-base font-extrabold text-[#b80035] tracking-tight">
              {result}
            </span>
            <Sparkles className="w-4 h-4 text-[#fea619] shrink-0 animate-spin" />
          </div>
        ) : (
          <p className="text-xs text-[#5c3f40]/70 font-medium">
            Bingung mau makan apa? Klik tombol acak di bawah 👇
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handlePick}
        disabled={isSpinning || options.length === 0}
        className="w-full h-11 rounded-full bg-[#ffddb8] hover:bg-[#fed6a3] active:scale-95 text-[#653e00] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
      >
        <Shuffle className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
        <span>{isSpinning ? "Mengacak Pilihan..." : "Acak Makanan! 🎲"}</span>
      </button>

      {/* Expandable Options Drawer */}
      {showConfig && (
        <div className="mt-3 pt-3 border-t border-[#faf2ee] space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#1e1b19]">Daftar Pilihan:</span>
            {foodWishlists.length > 0 && (
              <button
                onClick={handleImportWishlist}
                className="text-[10px] text-[#b80035] font-semibold underline cursor-pointer"
              >
                + Ambil dari Wishlist ({foodWishlists.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {options.map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#faf2ee] text-[#1e1b19] text-[11px] font-medium"
              >
                <span>{opt}</span>
                {options.length > 2 && (
                  <button
                    onClick={() => handleRemove(opt)}
                    className="hover:text-[#b80035] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Add custom input */}
          <form onSubmit={handleAdd} className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Tambah tempat/menu baru..."
              className="flex-1 px-3 py-1.5 rounded-full border border-rose-100 bg-[#fff8f5] text-xs text-[#1e1b19] outline-hidden focus:border-rose-300 placeholder:text-stone-400"
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-full bg-[#1e1b19] text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
