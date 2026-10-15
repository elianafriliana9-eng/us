import {
  db,
  collection,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { UserPresence } from "@/types/presence";

export async function updatePresence(
  roomId: string,
  userId: string,
  userName: string,
  isOnline: boolean
): Promise<void> {
  if (!roomId || !userId) return;
  try {
    const presenceRef = doc(db, "rooms", roomId, "presence", userId);
    const data: UserPresence = {
      userId,
      userName: userName || "Pasangan",
      isOnline,
      lastSeen: Date.now(),
    };
    await setDoc(presenceRef, removeUndefinedFields(data), { merge: true });
  } catch (error) {
    console.warn("Failed to update presence:", error);
  }
}

export function subscribeToRoomPresence(
  roomId: string,
  onUpdate: (presenceMap: Record<string, UserPresence>) => void
): Unsubscribe {
  const presenceCol = collection(db, "rooms", roomId, "presence");
  return onSnapshot(presenceCol, (snapshot) => {
    const map: Record<string, UserPresence> = {};
    snapshot.forEach((d) => {
      map[d.id] = d.data() as UserPresence;
    });
    onUpdate(map);
  });
}

/**
 * Checks if presence indicates active online status (within last 75 seconds)
 */
export function isUserOnline(presence?: UserPresence): boolean {
  if (!presence) return false;
  if (!presence.isOnline) return false;
  // If last heartbeat was within 75 seconds, consider online
  return Date.now() - presence.lastSeen < 75000;
}

/**
 * Formats last seen timestamp into human readable Indonesian string
 */
export function formatLastSeen(lastSeen?: number): string {
  if (!lastSeen) return "Offline";
  const diffSec = Math.floor((Date.now() - lastSeen) / 1000);

  if (diffSec < 60) return "Aktif baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Aktif ${diffMin} mnt lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Aktif ${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari lalu`;
}
