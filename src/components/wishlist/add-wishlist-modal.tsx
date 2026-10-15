"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { uploadRoomMedia } from "@/lib/firebase/storage";
import { createWishlistItem } from "@/lib/services/wishlistService";
import { WishlistCategory } from "@/types/wishlist";
import { Gift, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";

interface AddWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddWishlistModal({ isOpen, onClose }: AddWishlistModalProps) {
  const { room, currentUser } = useRoomStore();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WishlistCategory>("item");
  const [targetPrice, setTargetPrice] = useState("");
  const [currentSaved, setCurrentSaved] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !currentUser) return;
    if (!title.trim()) {
      toast.error("Nama barang/keinginan wajib diisi ya!");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined = undefined;

      if (file) {
        toast.info("Mengunggah foto wishlist...");
        imageUrl = await uploadRoomMedia(room.id, "posts", file);
      }

      const parsedTarget = targetPrice ? parseInt(targetPrice.replace(/\D/g, ""), 10) : undefined;
      const parsedSaved = currentSaved ? parseInt(currentSaved.replace(/\D/g, ""), 10) : undefined;

      await createWishlistItem(room.id, currentUser, {
        title,
        category,
        targetPrice: parsedTarget,
        currentSaved: parsedSaved,
        notes,
        url,
        imageUrl,
      });

      toast.success("Wishlist baru berhasil ditambahkan! 🎁");
      onClose();
      // Reset form
      setTitle("");
      setTargetPrice("");
      setCurrentSaved("");
      setUrl("");
      setNotes("");
      setFile(null);
      setPreviewUrl("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menambahkan wishlist.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-[#eee7e3] shrink-0">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[17px] text-[#1e1b19]">Tambah Wishlist Baru</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="add-wishlist-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
          {/* Photo Preview & Upload */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Foto Barang / Inspirasi (Opsional)
            </label>
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#f4ece8] mb-2 border border-[#e5bdbe]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl("");
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#e5bdbe] bg-[#fff8f5] p-4 cursor-pointer hover:bg-[#faf2ee] transition-colors">
                <UploadCloud className="w-6 h-6 text-[#b80035]" />
                <span className="text-xs font-semibold text-[#b80035]">
                  Pilih Foto Barang
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Nama Impian / Barang
            </label>
            <input
              type="text"
              placeholder="Contoh: Coffee Machine, Liburan ke Bali, Cincin..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
              required
            />
          </div>

          {/* Category Chips */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Kategori
            </label>
            <div className="flex gap-2">
              {[
                { id: "item", label: "Barang 🎁" },
                { id: "trip", label: "Trip ✈️" },
                { id: "future", label: "Masa Depan 💍" },
                { id: "daily", label: "Hal Lucu ☕" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as WishlistCategory)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    category === c.id
                      ? "bg-[#1e1b19] text-[#fff8f5]"
                      : "bg-[#faf2ee] text-[#5c3f40]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Price & Current Saved */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
                Estimasi Target Biaya (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 1.500.000"
                value={targetPrice}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setTargetPrice(val ? new Intl.NumberFormat("id-ID").format(parseInt(val, 10)) : "");
                }}
                className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
                Tabungan Awal (Rp)
              </label>
              <input
                type="text"
                placeholder="0"
                value={currentSaved}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCurrentSaved(val ? new Intl.NumberFormat("id-ID").format(parseInt(val, 10)) : "");
                }}
                className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
              />
            </div>
          </div>

          {/* URL Link */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Link Toko / Referensi (Opsional)
            </label>
            <input
              type="url"
              placeholder="https://shopee.co.id/... atau link hotel"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Catatan Berdua (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Beli warna krem ya sayang, buat kado ultah..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none"
            />
          </div>

        </form>

        {/* Action Buttons Pinned at Bottom */}
        <div className="p-4 pt-3 pb-8 sm:pb-4 border-t border-[#eee7e3] bg-white flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-full border border-[#e5bdbe] text-xs font-semibold text-[#5c3f40] hover:bg-[#faf2ee] active:scale-95 transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            form="add-wishlist-form"
            disabled={loading}
            className="flex-1 h-11 rounded-full bg-[#e11d48] text-white text-xs font-semibold shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Wishlist 🎁"}
          </button>
        </div>
      </div>
    </div>
  );
}
