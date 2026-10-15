"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { uploadRoomMedia } from "@/lib/firebase/storage";
import { createStoryPost } from "@/lib/services/storyService";
import { PostCategory } from "@/types/post";
import { Camera, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddStoryModal({ isOpen, onClose }: AddStoryModalProps) {
  const { room, currentUser } = useRoomStore();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<PostCategory>("photo");
  const [location, setLocation] = useState("");
  const [quote, setQuote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
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
    if (!title.trim() || !caption.trim()) {
      toast.error("Judul dan cerita wajib diisi ya!");
      return;
    }

    setLoading(true);
    try {
      let imageUrls: string[] = [];

      // If file chosen, upload to Firebase Storage
      if (file) {
        toast.info("Mengunggah foto kenangan...");
        const uploadedUrl = await uploadRoomMedia(room.id, "posts", file);
        imageUrls = [uploadedUrl];
      }

      await createStoryPost(room.id, currentUser, {
        title,
        caption,
        category,
        location,
        quote,
        date,
        images: imageUrls,
      });

      toast.success("Momen kenangan berhasil diabadikan! 💕");
      onClose();
      // Reset form
      setTitle("");
      setCaption("");
      setLocation("");
      setQuote("");
      setFile(null);
      setPreviewUrl("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan cerita.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#eee7e3]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[17px] text-[#1e1b19]">Abadikan Momen</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Photo Preview & Upload */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Foto Kenangan
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
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e5bdbe] bg-[#fff8f5] p-5 cursor-pointer hover:bg-[#faf2ee] transition-colors">
                <UploadCloud className="w-7 h-7 text-[#b80035]" />
                <span className="text-xs font-semibold text-[#b80035]">
                  Pilih Foto dari Galeri / Kamera
                </span>
                <span className="text-[10px] text-[#5c3f40]">JPG, PNG, WebP</span>
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
              Judul Momen
            </label>
            <input
              type="text"
              placeholder="Contoh: Sunset picnic di pantai, Nonton konser bareng..."
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
                { id: "photo", label: "Foto 📸" },
                { id: "trip", label: "Liburan ✈️" },
                { id: "milestone", label: "Momen Penting 💍" },
                { id: "daily", label: "Hal Kecil ☕" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as PostCategory)}
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

          {/* Caption */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Cerita / Pesan Manis
            </label>
            <textarea
              rows={3}
              placeholder="Tuliskan cerita seru, perasaanmu saat itu, atau ucapan spesial..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
              required
            />
          </div>

          {/* Location & Date Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
                Lokasi (Opsional)
              </label>
              <input
                type="text"
                placeholder="Baker Beach, SF"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
                Tanggal Momen
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] focus:outline-none"
              />
            </div>
          </div>

          {/* Sweet Quote */}
          <div>
            <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
              Kutipan Lucu / Quote Singkat (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: “Kamu masih ada tepung di alis”"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-[#e5bdbe] text-xs font-semibold text-[#5c3f40] hover:bg-[#faf2ee]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-full bg-[#e11d48] text-white text-xs font-semibold shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Momen 💕"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
