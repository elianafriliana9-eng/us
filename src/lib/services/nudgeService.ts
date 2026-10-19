import {
  db,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { HeartNudge } from "@/types/presence";

/**
 * Heart nudges are queued as individual docs (rooms/{roomId}/nudges/*)
 * so they survive until the partner opens the app — enabling replay.
 */
export async function sendHeartNudge(
  roomId: string,
  currentUser: { id: string; name: string },
  emoji: string = "💕"
): Promise<void> {
  if (!roomId || !currentUser) return;
  const nudgesRef = collection(db, "rooms", roomId, "nudges");
  // typed loosely: sentAt is a FieldValue sentinel until Firestore resolves it
  const data: Record<string, unknown> = {
    senderId: currentUser.id,
    senderName: currentUser.name,
    emoji,
    // Server clock — immune to device clock skew between partners
    sentAt: serverTimestamp(),
  };
  await addDoc(nudgesRef, removeUndefinedFields(data));
}

/**
 * Subscribe to the room's recent nudges (oldest→newest, last 30).
 * The callback receives the full ordered list; the caller decides
 * which items are new/unseen (persisted marker) and shows them.
 */
export function subscribeToHeartNudge(
  roomId: string,
  onNudges: (nudges: HeartNudge[]) => void
): Unsubscribe {
  const nudgesRef = collection(db, "rooms", roomId, "nudges");
  const q = query(nudgesRef, orderBy("sentAt", "asc"), limit(30));
  return onSnapshot(q, (snap) => {
    onNudges(snap.docs.map((d) => d.data() as HeartNudge));
  });
}

/**
 * Resolve nudge.sentAt to epoch ms.
 * New writes store a Firestore Timestamp (server clock); legacy docs may hold ms numbers.
 */
export function nudgeSentAtMs(nudge: HeartNudge | null): number | null {
  const at = nudge?.sentAt;
  if (typeof at === "number") return at;
  if (at && typeof (at as Timestamp).toMillis === "function") {
    return (at as Timestamp).toMillis();
  }
  return null;
}
