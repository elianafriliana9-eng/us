"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { uploadGalleryPhoto } from "@/lib/services/galleryService";
import { Images, Loader2, Plus, Sparkles, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_FILES = 8;
const MAX_CAPTION = 140;

export function GalleryUploadModal({
  isOpen,
  onClose,
}: GalleryUploadModalProps) {
  const { room, currentUser } = useRoomStore();

  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Keep an always-fresh reference so cleanup can revoke preview URLs.
  const pendingRef = useRef<PendingPhoto[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const resetForm = () => {
    pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPending([]);
    setCaption("");
    setProgress({ done: 0, total: 0 });
  };

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  const addFiles = (selected: File[]) => {
    if (uploading || selected.length === 0) return;

    const images = selected.filter((file) => file.type.startsWith("image/"));
    const skipped = selected.length - images.length;
    if (skipped > 0) {
      toast.error(
        `${skipped} file dilewati — hanya foto yang bisa masuk galeri ya 📷`
      );
    }
    if (images.length === 0) return;

    const remaining = MAX_FILES - pending.length;
    if (remaining <= 0) {
      toast.error(`Maksimal ${MAX_FILES} foto sekali unggah ya 💕`);
      return;
    }

    const accepted = images.slice(0, remaining);
    if (images.length > remaining) {
      toast.info(
        `Cuma ${remaining} foto lagi yang bisa ditambahkan (maks. ${MAX_FILES} per batch).`
      );
    }

    const nextItems: PendingPhoto[] = accepted.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPending((current) => [...current, ...nextItems]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    // Reset the input so picking the same photo again still fires onChange.
    event.target.value = "";
    addFiles(selected);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const handleRemove = (id: string) => {
    if (uploading) return;
    const target = pending.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setPending((current) => current.filter((item) => item.id !== id));
  };

  const handleUpload = async () => {
    if (!room || !currentUser || uploading) return;
    if (pending.length === 0) {
      toast.error("Pilih minimal satu foto dulu ya 📸");
      return;
    }

    const uploader = { id: currentUser.id, name: currentUser.name };
    const batchCaption = caption.trim() || undefined;
    const total = pending.length;

    setUploading(true);
    setProgress({ done: 0, total });

    let successCount = 0;

    for (let index = 0; index < pending.length; index += 1) {
      const item = pending[index];
      try {
        await uploadGalleryPhoto(
          room.id,
          uploader,
          item.file,
          batchCaption
        );
        successCount += 1;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Gagal menyimpan foto.";
        toast.error(`${message} (${item.file.name || `foto ${index + 1}`})`);
      }
      setProgress({ done: index + 1, total });
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "Foto baru masuk ke galeri kalian! 📸💕"
          : `${successCount} foto baru masuk ke galeri kalian! 📸💕`
      );
      resetForm();
      onClose();
      return;
    }

    toast.error("Belum ada foto yang berhasil disimpan. Coba lagi ya 💕");
  };

  if (!isOpen) return null;

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tambah foto galeri"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!uploading) handleClose();
      }}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#eee7e3] p-5 pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffdada] text-[#b80035]">
              <Images className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold leading-tight text-[#1e1b19]">
                Tambah Foto Galeri
              </h3>
              <p className="mt-0.5 text-[11px] text-[#5c3f40]">
                Kurasi momen manis kalian berdua
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Tutup"
            className="rounded-full p-1.5 text-[#5c3f40] transition-colors hover:bg-[#faf2ee] disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-5 pb-4">
          {pending.length === 0 ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e5bdbe] bg-[#fff8f5] p-6 text-center transition-colors hover:bg-[#faf2ee]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffdada] text-[#b80035]">
                <UploadCloud className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-[#b80035]">
                Pilih foto dari HP kalian
              </span>
              <span className="max-w-[240px] text-[10px] leading-relaxed text-[#5c3f40]">
                Bisa beberapa sekaligus, maksimal {MAX_FILES} foto per unggahan
              </span>
              <span className="hidden text-[10px] font-medium text-[#5c3f40]/70 sm:block">
                atau tarik & lepas fotonya ke sini
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1e1b19]">
                  Foto terpilih
                </span>
                <span className="text-[11px] font-bold text-[#b80035]">
                  {pending.length}/{MAX_FILES}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-[#e5bdbe]/60 bg-[#f4ece8]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt="Pratinjau foto"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={uploading}
                      aria-label="Hapus foto ini dari pilihan"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all active:scale-95 disabled:opacity-40"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {pending.length < MAX_FILES && !uploading && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#e5bdbe] bg-[#fff8f5] transition-colors hover:bg-[#faf2ee]">
                    <Plus className="h-4 w-4 text-[#b80035]" />
                    <span className="text-[9px] font-bold text-[#b80035]">
                      Tambah
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* One caption for the whole batch */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="gallery-batch-caption"
                className="text-xs font-semibold text-[#1e1b19]"
              >
                Satu caption untuk semua foto ini (opsional)
              </label>
              <span className="text-[10px] text-[#5c3f40]/70">
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>
            <textarea
              id="gallery-batch-caption"
              rows={3}
              value={caption}
              maxLength={MAX_CAPTION}
              disabled={uploading}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Contoh: Sore cerah di pantai, tawa kita yang paling kusuka..."
              className="w-full rounded-xl border border-[#e5bdbe] bg-[#faf2ee] p-3 text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#e11d48] disabled:opacity-60"
            />
          </div>

          {uploading ? (
            <div
              aria-live="polite"
              className="space-y-2 rounded-2xl border border-[#e5bdbe]/60 bg-[#faf2ee] p-3"
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-[#b80035]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan foto...
                </span>
                <span className="text-[#5c3f40]">
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eee7e3]">
                <div
                  className="h-full rounded-full bg-[#b80035] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-2xl border border-[#e5bdbe]/50 bg-[#faf2ee] p-3">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e11d48]" />
              <p className="text-[10px] leading-relaxed text-[#5c3f40]">
                Kalian berdua bisa menambah dan menghapus foto di galeri ini.
                Foto otomatis dirapikan supaya ringan dibuka. 💕
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-[#eee7e3] bg-white p-4 pt-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="h-11 flex-1 rounded-full border border-[#e5bdbe] text-xs font-semibold text-[#5c3f40] transition-all hover:bg-[#faf2ee] active:scale-95 disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || pending.length === 0}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#b80035] text-xs font-bold text-white shadow-md shadow-rose-900/20 transition-all hover:bg-[#a1002e] active:scale-95 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Menyimpan {progress.done}/{progress.total}...
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                <span>
                  {pending.length > 0
                    ? `Simpan ${pending.length} Foto 💕`
                    : "Simpan Foto 💕"}
                </span>
              </>
            )}
          </button>
        </div>

        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-[#b80035] bg-[#fff8f5]/95 backdrop-blur-sm">
            <UploadCloud className="h-7 w-7 text-[#b80035]" />
            <p className="text-sm font-bold text-[#1e1b19]">
              Lepas foto di sini 📸
            </p>
            <p className="text-[10px] text-[#5c3f40]">
              Hanya file gambar yang masuk galeri
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
