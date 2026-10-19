"use client";

import { useEffect, useRef, useState } from "react";
import { GalleryPhoto } from "@/types/gallery";
import { formatPhotoDate } from "./gallery-utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete: (photo: GalleryPhoto) => Promise<void>;
}

export function GalleryLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  onDelete,
}: GalleryLightboxProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const photo = index !== null ? photos[index] : undefined;
  const isOpen = Boolean(photo) && index !== null;

  // Lock the page behind the viewer.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Keyboard: Esc to close, arrows to browse.
  useEffect(() => {
    if (index === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && index > 0) {
        onNavigate(index - 1);
      } else if (
        event.key === "ArrowRight" &&
        index < photos.length - 1
      ) {
        onNavigate(index + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo || index === null) return null;

  const uploadDate = formatPhotoDate(photo);
  const initial =
    (photo.uploadedBy.name || "K").trim().charAt(0).toUpperCase() || "K";
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(photo);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const delta =
      (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (delta > 56 && hasPrev) onNavigate(index - 1);
    else if (delta < -56 && hasNext) onNavigate(index + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lihat foto galeri"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full w-full max-w-md flex-col px-4 pt-safe pb-safe"
      >
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between py-3">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90 backdrop-blur-md">
            {index + 1} / {photos.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup foto"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image stage */}
        <div
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={photo.url}
            alt={
              photo.caption ||
              `Foto kenangan dari ${photo.uploadedBy.name}`
            }
            className="max-h-full max-w-full select-none rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-200"
          />

          {hasPrev && (
            <button
              type="button"
              onClick={() => onNavigate(index - 1)}
              aria-label="Foto sebelumnya"
              className="absolute left-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all hover:bg-black/55 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onNavigate(index + 1)}
              aria-label="Foto berikutnya"
              className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all hover:bg-black/55 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Caption + meta */}
        <div className="mt-3 shrink-0 rounded-3xl border border-white/10 bg-[#fff8f5] p-4 shadow-2xl">
          {photo.caption && (
            <p className="text-sm font-medium leading-relaxed text-[#1e1b19]">
              &ldquo;{photo.caption}&rdquo;
            </p>
          )}

          <div
            className={
              photo.caption
                ? "mt-3 flex items-center justify-between gap-3 border-t border-[#eee7e3] pt-3"
                : "flex items-center justify-between gap-3"
            }
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffdada] text-sm font-bold text-[#b80035]">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#1e1b19]">
                  Diunggah oleh {photo.uploadedBy.name}
                </p>
                {uploadDate && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#5c3f40]">
                    <CalendarDays className="h-3 w-3" />
                    {uploadDate}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Hapus foto ini"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>{isDeleting ? "Menghapus..." : "Hapus"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
