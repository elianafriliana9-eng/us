"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRoomStore } from "@/stores/roomStore";
import {
  deleteGalleryPhoto,
  subscribeToRoomGallery,
} from "@/lib/services/galleryService";
import { GalleryPhoto } from "@/types/gallery";
import { GalleryUploadModal } from "@/components/gallery/gallery-upload-modal";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { formatPhotoDate, getFirstName } from "@/components/gallery/gallery-utils";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  HeartHandshake,
  Images,
  Loader2,
  Maximize2,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

/** Fallback rhythm until each photo reports its real aspect ratio. */
const FALLBACK_RATIOS = [0.78, 1.24, 0.95, 1.35, 0.86, 1.08];

interface PhotoCardProps {
  photo: GalleryPhoto;
  ratio: number;
  delay: number;
  revealed: boolean;
  onOpen: (photo: GalleryPhoto) => void;
  onImageLoad: (
    photoId: string,
    event: React.SyntheticEvent<HTMLImageElement>
  ) => void;
}

function PhotoCard({
  photo,
  ratio,
  delay,
  revealed,
  onOpen,
  onImageLoad,
}: PhotoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(photo)}
      aria-label={
        photo.caption ? `Buka foto: ${photo.caption}` : "Buka foto galeri"
      }
      style={{
        transitionDelay: `${delay}ms`,
      }}
      className={cn(
        "group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[#e5bdbe]/60 bg-[#f4ece8] text-left shadow-xs transition-[opacity,transform] duration-500 ease-out active:brightness-95",
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      )}
    >
      <div className="w-full" style={{ aspectRatio: String(ratio) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={
            photo.caption || `Foto kenangan dari ${photo.uploadedBy.name}`
          }
          loading="lazy"
          onLoad={(event) => onImageLoad(photo.id, event)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>

      {/* Caption + uploader overlay (readable on mobile, lifts on hover) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-2.5 pt-9">
        {photo.caption && (
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white drop-shadow-sm">
            {photo.caption}
          </p>
        )}
        <p
          className={cn(
            "text-[9px] font-medium tracking-wide text-white/85",
            photo.caption && "mt-0.5"
          )}
        >
          {getFirstName(photo.uploadedBy.name)} 💕
        </p>
      </div>

      <div className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

export default function GalleryPage() {
  const { room, isHydrated } = useRoomStore();
  const roomId = room?.id;

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [feedRoomId, setFeedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);

  // Live gallery feed (newest → oldest).
  useEffect(() => {
    if (!roomId) return;

    let isActive = true;
    const unsubscribe = subscribeToRoomGallery(roomId, (nextPhotos) => {
      if (!isActive) return;
      setPhotos(nextPhotos);
      setFeedRoomId(roomId);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [roomId]);

  // Staggered first reveal. (Kept as a transition so it also works without
  // the optional tw-animate-css layer.)
  useEffect(() => {
    if (isLoading) return;
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, [isLoading]);

  // While a new room's feed connects, don't briefly show the old room's photos.
  const feedReady = roomId !== undefined && feedRoomId === roomId;
  const isFeedPending = isLoading || !feedReady;
  const visiblePhotos = useMemo(
    () => (feedReady ? photos : []),
    [feedReady, photos]
  );

  const handleImageLoad = useCallback(
    (photoId: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget;
      if (!image.naturalWidth || !image.naturalHeight) return;
      const nextRatio = Math.min(
        1.45,
        Math.max(0.66, image.naturalWidth / image.naturalHeight)
      );
      setRatios((current) =>
        current[photoId] === nextRatio
          ? current
          : { ...current, [photoId]: nextRatio }
      );
    },
    []
  );

  const handleNavigate = useCallback(
    (nextIndex: number) => {
      const nextPhoto = visiblePhotos[nextIndex];
      if (nextPhoto) setActivePhotoId(nextPhoto.id);
    },
    [visiblePhotos]
  );

  const handleCloseLightbox = useCallback(() => {
    setActivePhotoId(null);
  }, []);

  const handleDeletePhoto = useCallback(
    async (photo: GalleryPhoto) => {
      if (!roomId) return;
      if (!confirm("Hapus foto ini dari galeri kalian?")) return;

      const currentIndex = visiblePhotos.findIndex(
        (item) => item.id === photo.id
      );
      const fallback =
        currentIndex >= 0
          ? visiblePhotos[currentIndex + 1] ?? visiblePhotos[currentIndex - 1]
          : undefined;

      // Advance immediately: the live feed removes the doc optimistically, and
      // waiting would briefly close the viewer before the delete resolves.
      setActivePhotoId(fallback ? fallback.id : null);

      try {
        await deleteGalleryPhoto(roomId, photo.id);
        toast.success("Foto berhasil dihapus dari galeri.");
      } catch {
        setActivePhotoId(photo.id);
        toast.error("Gagal menghapus foto. Coba lagi ya.");
      }
    },
    [roomId, visiblePhotos]
  );

  const activeIndex = activePhotoId
    ? visiblePhotos.findIndex((photo) => photo.id === activePhotoId)
    : -1;

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#b80035]" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffdada] text-[#b80035]">
          <HeartHandshake className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#1e1b19]">
          Hubungkan Ruang Cinta Kalian
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-[#5c3f40]">
          Buat atau gabung ke room terlebih dahulu untuk mulai mengumpulkan
          foto manis kalian berdua!
        </p>
        <Link
          href="/story"
          className="mt-5 rounded-full bg-[#b80035] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-900/20 transition-all active:scale-95"
        >
          Masuk ke Room
        </Link>
      </div>
    );
  }

  const heroPhoto = visiblePhotos[0];
  const heroDate = heroPhoto ? formatPhotoDate(heroPhoto) : null;

  return (
    <>
      <div className="flex w-full flex-col space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {/* Title */}
        <div className="pt-1">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#1e1b19]">
            Our Gallery
            <Images className="h-5 w-5 text-[#b80035]" />
          </h2>
          <p className="mt-0.5 text-xs text-[#5c3f40]">
            Album kecil yang kita rawat berdua 💞
          </p>
        </div>

        {/* Count pill row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#e5bdbe]/60 bg-white/90 px-3 py-1.5 shadow-xs backdrop-blur-md">
            {isFeedPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-[#b80035]" />
            ) : (
              <span className="h-2 w-2 animate-ping rounded-full bg-[#e11d48]" />
            )}
            <span className="text-[11px] font-bold text-[#1e1b19]">
              {isFeedPending
                ? "Memuat galeri..."
                : `${visiblePhotos.length} Foto Terpilih 💕`}
            </span>
          </div>
          {!isFeedPending && visiblePhotos.length > 1 && (
            <span className="text-[10px] font-medium text-[#5c3f40]/80">
              Momen terbaru di atas ✨
            </span>
          )}
        </div>

        {/* Curated feed */}
        {isFeedPending ? (
          <div className="space-y-3" aria-busy="true" aria-label="Memuat galeri">
            <div className="flex items-center gap-2 rounded-2xl border border-[#e5bdbe]/40 bg-[#faf2ee]/60 px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#b80035]" />
              <span className="text-[11px] font-semibold text-[#5c3f40]">
                Memuat galeri kenangan kalian...
              </span>
            </div>
            <div className="h-52 animate-pulse rounded-3xl border border-[#e5bdbe]/30 bg-[#f4ece8]" />
            <div className="columns-2 gap-3">
              {[148, 196, 168, 132, 208, 156].map((height) => (
                <div
                  key={height}
                  className="mb-3 break-inside-avoid animate-pulse rounded-2xl border border-[#e5bdbe]/30 bg-[#f4ece8]"
                  style={{ height }}
                />
              ))}
            </div>
          </div>
        ) : visiblePhotos.length === 0 ? (
          <div className="flex animate-in fade-in flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#e5bdbe]/70 bg-[#faf2ee]/50 px-6 py-12 text-center">
            <div className="mb-4 flex items-end gap-1">
              <span className="text-4xl">📸</span>
              <span className="text-3xl">💕</span>
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="text-base font-bold text-[#1e1b19]">
              Belum ada foto terpilih
            </h3>
            <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-[#5c3f40]">
              Mulai kurasi momen kalian ✨ Satu foto manis bisa jadi cerita
              yang kalian buka lagi nanti.
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="mt-5 flex items-center gap-1.5 rounded-full bg-[#b80035] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-900/20 transition-all hover:bg-[#a1002e] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Unggah Foto Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Newest photo gets an editorial hero frame */}
            {heroPhoto && (
              <button
                type="button"
                onClick={() => setActivePhotoId(heroPhoto.id)}
                aria-label="Buka foto terbaru"
                className={cn(
                  "group relative block w-full overflow-hidden rounded-3xl border border-[#e5bdbe]/60 bg-[#f4ece8] text-left shadow-md transition-[opacity,transform] duration-500 ease-out active:brightness-95",
                  revealed
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
                )}
              >
                <div className="aspect-[16/11] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroPhoto.url}
                    alt={
                      heroPhoto.caption ||
                      `Foto kenangan dari ${heroPhoto.uploadedBy.name}`
                    }
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>

                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#b80035] shadow-sm backdrop-blur-md">
                  <Sparkles className="h-3 w-3" />
                  Terbaru
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-12">
                  <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow-sm">
                    {heroPhoto.caption || "Momen terbaru kita 💕"}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-white/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff8fa3]" />
                    <span>{getFirstName(heroPhoto.uploadedBy.name)}</span>
                    {heroDate && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {heroDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            )}

            {visiblePhotos.length > 1 && (
              <div className="columns-2 gap-3">
                {visiblePhotos.slice(1).map((photo, index) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    ratio={
                      ratios[photo.id] ??
                      FALLBACK_RATIOS[index % FALLBACK_RATIOS.length]
                    }
                    delay={Math.min(index + 1, 12) * 45}
                    revealed={revealed}
                    onOpen={(selected) => setActivePhotoId(selected.id)}
                    onImageLoad={handleImageLoad}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating upload action, stacked above the Room FAB in the nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 pb-safe pointer-events-none">
        <div className="mx-auto max-w-md px-4 pb-[140px]">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              title="Tambah foto ke galeri"
              aria-label="Tambah foto ke galeri"
              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#b80035] text-white shadow-lg shadow-rose-900/25 transition-all hover:bg-[#a1002e] active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <GalleryLightbox
        photos={visiblePhotos}
        index={activeIndex >= 0 ? activeIndex : null}
        onClose={handleCloseLightbox}
        onNavigate={handleNavigate}
        onDelete={handleDeletePhoto}
      />

      <GalleryUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
}
