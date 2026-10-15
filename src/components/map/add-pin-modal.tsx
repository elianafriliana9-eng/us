"use client";

import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { uploadRoomMedia } from "@/lib/firebase/storage";
import { createMemoryPin } from "@/lib/services/pinService";
import { PinCategory, MemoryPin } from "@/types/pin";
import { MapPin, X, UploadCloud, Navigation } from "lucide-react";
import { toast } from "sonner";

interface AddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number } | null;
  initialLocationName?: string;
  onPinSaved?: (pin: MemoryPin) => void;
}

interface AddPinFormProps {
  onClose: () => void;
  initialLat: number;
  initialLng: number;
  initialLocationName?: string;
  onPinSaved?: (pin: MemoryPin) => void;
}

function AddPinForm({
  onClose,
  initialLat,
  initialLng,
  initialLocationName,
  onPinSaved,
}: AddPinFormProps) {
  const { room, currentUser } = useRoomStore();

  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState(initialLocationName || "");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<PinCategory>("first_date");
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi GPS");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setGettingLocation(false);
        toast.success("Koordinat GPS berhasil disematkan! 📍");
      },
      (err) => {
        setGettingLocation(false);
        toast.error("Gagal mendapatkan lokasi GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
      toast.error("Judul tempat kenangan wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      let imageUrls: string[] = [];

      if (file) {
        toast.info("Mengunggah foto kenangan...");
        const uploadedUrl = await uploadRoomMedia(room.id, "pins", file);
        imageUrls = [uploadedUrl];
      }

      const newPin = await createMemoryPin(room.id, currentUser, {
        title,
        locationName,
        caption,
        category,
        lat,
        lng,
        date,
        images: imageUrls,
      });

      toast.success("Titik kenangan berhasil disematkan di peta! 📍💕");
      if (onPinSaved) onPinSaved(newPin);
      onClose();

      // Reset form
      setTitle("");
      setLocationName("");
      setCaption("");
      setFile(null);
      setPreviewUrl("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan pin.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
      {/* Coordinates Bar & GPS Button */}
      <div className="p-3 rounded-2xl bg-[#faf2ee] border border-[#e5bdbe]/60 flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="text-[#5c3f40] block font-medium">Titik Koordinat Map:</span>
          <span className="font-mono text-[11px] text-[#1e1b19] font-semibold">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation}
          className="px-3 py-1.5 rounded-xl bg-white border border-[#e5bdbe] text-[11px] font-bold text-[#b80035] flex items-center gap-1.5 shadow-xs hover:bg-[#fff8f5] active:scale-95 transition-all"
        >
          <Navigation className={`w-3.5 h-3.5 ${gettingLocation ? "animate-spin" : ""}`} />
          <span>{gettingLocation ? "Mencari GPS..." : "GPS Saya"}</span>
        </button>
      </div>

      {/* Photo Preview & Upload */}
      <div>
        <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
          Foto di Lokasi Ini (Opsional)
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
              Upload Foto Kenangan
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
          Judul Kenangan *
        </label>
        <input
          type="text"
          placeholder="Contoh: Tempat First Date Kita, Cafe Favorit Akhir Pekan..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-sm text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
          required
        />
      </div>

      {/* Location Name */}
      <div>
        <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
          Nama Tempat / Alamat
        </label>
        <input
          type="text"
          placeholder="Contoh: Senayan Park Skywalk, Kopi Kenangan Senopati..."
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          className="w-full h-10 px-3.5 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
        />
      </div>

      {/* Category Chips */}
      <div>
        <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
          Kategori Tempat
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "first_date", label: "First Date 💕" },
            { id: "travel", label: "Liburan ✈️" },
            { id: "cafe", label: "Cafe / Kuliner ☕" },
            { id: "anniversary", label: "Anniversary 🎂" },
            { id: "milestone", label: "Pencapaian 💍" },
            { id: "daily", label: "Kenangan Manis 🌿" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id as PinCategory)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === c.id
                  ? "bg-[#b80035] text-white shadow-xs"
                  : "bg-[#faf2ee] text-[#5c3f40] hover:bg-[#eee7e3]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
          Tanggal Kunjungan / Momen
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-10 px-3.5 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] focus:outline-none"
        />
      </div>

      {/* Caption */}
      <div>
        <label className="text-xs font-semibold text-[#1e1b19] block mb-1">
          Cerita / Catatan Momen
        </label>
        <textarea
          rows={3}
          placeholder="Ceritakan momen seru saat kalian ada di tempat ini..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full p-3 rounded-xl border border-[#e5bdbe] bg-[#faf2ee] text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-2 pb-6 sm:pb-2 flex items-center gap-2">
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
          className="flex-1 h-11 rounded-full bg-[#b80035] text-white text-xs font-bold shadow-md shadow-rose-900/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Sematkan Pin 💕"}
        </button>
      </div>
    </form>
  );
}

export function AddPinModal({
  isOpen,
  onClose,
  initialCoords,
  initialLocationName,
  onPinSaved,
}: AddPinModalProps) {
  if (!isOpen) return null;

  const lat = initialCoords?.lat ?? -6.2088;
  const lng = initialCoords?.lng ?? 106.8456;
  const key = `${lat}-${lng}-${initialLocationName || ""}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 pb-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#eee7e3]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center">
              <MapPin className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-[17px] text-[#1e1b19]">
                Sematkan Titik Kenangan
              </h3>
              <p className="text-[11px] text-[#5c3f40]">
                Tandai momen manis kalian di OpenStreetMap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AddPinForm
          key={key}
          initialLat={lat}
          initialLng={lng}
          initialLocationName={initialLocationName}
          onClose={onClose}
          onPinSaved={onPinSaved}
        />
      </div>
    </div>
  );
}
