import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "@/lib/firebase/firestore";
import { MemoryPin, CreatePinInput } from "@/types/pin";
import { CurrentUser } from "@/types/room";

export async function createMemoryPin(
  roomId: string,
  author: CurrentUser,
  input: CreatePinInput
): Promise<MemoryPin> {
  const pinRef = doc(collection(db, "rooms", roomId, "pins"));
  const pinId = pinRef.id;

  const newPin: MemoryPin = {
    id: pinId,
    authorId: author.id,
    authorName: author.name,
    title: input.title.trim(),
    caption: input.caption.trim(),
    category: input.category,
    lat: input.lat,
    lng: input.lng,
    locationName: input.locationName?.trim() || undefined,
    images: input.images,
    date: input.date || new Date().toISOString().split("T")[0],
    createdAt: Date.now(),
  };

  await setDoc(pinRef, newPin);
  return newPin;
}

export function subscribeToMemoryPins(
  roomId: string,
  onPinsUpdate: (pins: MemoryPin[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "pins"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const pins: MemoryPin[] = [];
    snapshot.forEach((docSnap) => {
      pins.push(docSnap.data() as MemoryPin);
    });
    onPinsUpdate(pins);
  });
}

export async function deleteMemoryPin(
  roomId: string,
  pinId: string
): Promise<void> {
  const pinRef = doc(db, "rooms", roomId, "pins", pinId);
  await deleteDoc(pinRef);
}
