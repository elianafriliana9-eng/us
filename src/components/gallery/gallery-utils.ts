import type { GalleryPhoto } from "@/types/gallery";

/** "Nadia Putri" → "Nadia" for compact card overlays. */
export function getFirstName(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "Kita";
  return trimmed.split(/\s+/)[0];
}

/** Human date for Indonesian copy. `createdAt` is null for local latency echoes. */
export function formatPhotoDate(photo: GalleryPhoto): string | null {
  if (!photo.createdAt) return null;
  try {
    return photo.createdAt.toDate().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
