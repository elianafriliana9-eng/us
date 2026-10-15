import {
  db,
  collection,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from "@/lib/firebase/firestore";
import { PartnerLocation } from "@/types/location";

export async function updatePartnerLocation(
  roomId: string,
  location: PartnerLocation
): Promise<void> {
  const locRef = doc(db, "rooms", roomId, "locations", location.userId);
  await setDoc(locRef, location, { merge: true });
}

export function subscribeToCoupleLocations(
  roomId: string,
  onUpdate: (locations: PartnerLocation[]) => void
): Unsubscribe {
  const colRef = collection(db, "rooms", roomId, "locations");
  return onSnapshot(colRef, (snapshot) => {
    const list: PartnerLocation[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as PartnerLocation);
    });
    onUpdate(list);
  });
}
