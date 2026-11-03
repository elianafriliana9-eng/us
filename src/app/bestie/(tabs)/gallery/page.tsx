"use client";

import { useEffect, useState } from "react";
import { useBestieStore } from "@/stores/bestieStore";
import {
  subscribeToRoomGallery,
  uploadGalleryPhoto,
  deleteGalleryPhoto,
} from "@/lib/services/galleryService";
import { GalleryPhoto } from "@/types/gallery";
import { getMemberColor } from "@/types/bestie";
import { Images, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function BestieGalleryPage() {
  const { room, currentUser } = useBestieStore();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedUploaderId, setSelectedUploaderId] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!room?.id) return;
    const unsub = subscribeToRoomGallery(room.id, setPhotos);
    return () => unsub();
  }, [room?.id]);

  if (!room || !currentUser) return null;

  const filteredPhotos = photos.filter((p) =>
    selectedUploaderId === "all"
      ? true
      : p.uploadedBy?.id === selectedUploaderId
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file foto terlebih dahulu");
      return;
    }
    setUploading(true);
    try {
      await uploadGalleryPhoto(
        room.id,
        { id: currentUser.id, name: currentUser.name },
        file,
        caption
      );
      setFile(null);
      setCaption("");
      setIsUploadOpen(false);
      toast.success("Foto ditambahkan ke Brankas Circle");
    } catch {
      toast.error("Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display-bestie text-xl font-bold text-[#141619] uppercase flex items-center gap-2">
            <span>Brankas Foto Circle</span>
            <Images className="w-5 h-5 text-[#2554E8]" />
          </h1>
          <p className="text-xs text-[#525866]">
            Dokumentasi bersama dari seluruh anggota ({photos.length} foto)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="h-10 px-3.5 rounded-xl bento-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Unggah</span>
        </button>
      </div>

      {/* Filter by Member Chip */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        <button
          type="button"
          onClick={() => setSelectedUploaderId("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border cursor-pointer ${
            selectedUploaderId === "all"
              ? "bg-[#141619] text-white border-[#141619]"
              : "bg-white text-[#525866] border-[#D8DDD0]"
          }`}
        >
          Semua Anggota
        </button>
        {room.members.map((m, idx) => {
          const active = selectedUploaderId === m.id;
          const token = getMemberColor(m.colorId, idx);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedUploaderId(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                active
                  ? "bg-[#141619] text-white border-[#141619]"
                  : "bg-white text-[#141619] border-[#D8DDD0]"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: token.hex }}
              />
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="bento-card-subtle p-8 text-center space-y-2">
          <p className="font-display-bestie text-sm font-bold text-[#141619]">
            Belum ada foto di kategori ini
          </p>
          <p className="text-xs text-[#525866]">
            Unggah foto dokumentasi kumpul atau perjalanan kalian.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="bento-card-subtle overflow-hidden flex flex-col justify-between"
            >
              <div className="aspect-square w-full bg-[#EFF1EA] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || "Foto Circle"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {photo.caption && (
                    <p className="text-xs font-bold text-[#141619] truncate">
                      {photo.caption}
                    </p>
                  )}
                  <span className="text-[10px] text-[#525866] block truncate">
                    Oleh {photo.uploadedBy?.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGalleryPhoto(room.id, photo.id)}
                  className="p-1 text-[#525866] hover:text-rose-600 shrink-0 cursor-pointer"
                  title="Hapus foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Unggah Foto ke Brankas Circle
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[#525866]"
                required
              />
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Keterangan foto (Opsional)"
                className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
              />
              <button
                type="submit"
                disabled={uploading}
                className="w-full h-11 rounded-xl bento-btn-lime text-xs font-bold uppercase cursor-pointer"
              >
                {uploading ? "Mengunggah..." : "Simpan Foto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
