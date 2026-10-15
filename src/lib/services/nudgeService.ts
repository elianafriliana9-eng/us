import {
  db,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { HeartNudge } from "@/types/presence";

export async function sendHeartNudge(
  roomId: string,
  currentUser: { id: string; name: string },
  emoji: string = "💕"
): Promise<void> {
  if (!roomId || !currentUser) return;
  const nudgeRef = doc(db, "rooms", roomId, "nudge", "heart");
  const data: HeartNudge = {
    senderId: currentUser.id,
    senderName: currentUser.name,
    emoji,
    sentAt: Date.now(),
  };
  await setDoc(nudgeRef, removeUndefinedFields(data));
}

export function subscribeToHeartNudge(
  roomId: string,
  onNudge: (nudge: HeartNudge | null) => void
): Unsubscribe {
  const nudgeRef = doc(db, "rooms", roomId, "nudge", "heart");
  return onSnapshot(nudgeRef, (snap) => {
    if (snap.exists()) {
      onNudge(snap.data() as HeartNudge);
    } else {
      onNudge(null);
    }
  });
}
