import {
  db,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { uploadRoomMedia } from "@/lib/firebase/storage";
import { GalleryPhoto } from "@/types/gallery";

const MAX_PHOTOS = 60;

/**
 * Uploads a gallery photo as an optimized data-URL stored directly in
 * its Firestore doc (reliable on Spark plan, no Storage bucket needed).
 * Photos are curated: both partners may upload.
 */
export async function uploadGalleryPhoto(
  roomId: string,
  uploader: { id: string; name: string },
  file: File | Blob,
  caption?: string
): Promise<void> {
  if (!roomId || !uploader) return;
  const url = await uploadRoomMedia(roomId, "gallery", file);
  const photosRef = collection(db, "rooms", roomId, "gallery");
  await addDoc(
    photosRef,
    removeUndefinedFields({
      url,
      caption,
      uploadedBy: uploader,
      createdAt: serverTimestamp(),
    })
  );
}

/**
 * Real-time gallery feed (newest → oldest, capped at MAX_PHOTOS).
 * Local latency-compensated echoes may surface with createdAt = null.
 */
export function subscribeToRoomGallery(
  roomId: string,
  onPhotos: (photos: GalleryPhoto[]) => void
): Unsubscribe {
  const photosRef = collection(db, "rooms", roomId, "gallery");
  const q = query(photosRef, orderBy("createdAt", "desc"), limit(MAX_PHOTOS));
  return onSnapshot(q, (snap) => {
    onPhotos(
      snap.docs.map((d) => ({
        ...(d.data() as Omit<GalleryPhoto, "id">),
        id: d.id,
      }))
    );
  });
}

/** Deletes a gallery photo doc (data-URL lives inside the doc — no orphan files). */
export async function deleteGalleryPhoto(
  roomId: string,
  photoId: string
): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "gallery", photoId));
}
