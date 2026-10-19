import type { Timestamp } from "firebase/firestore";

export interface GalleryPhoto {
  id: string;
  url: string; // optimized data-URL (compressed client-side, max width ~800)
  caption?: string;
  uploadedBy: { id: string; name: string };
  createdAt: Timestamp | null; // null only for latency-compensated local echoes
}
