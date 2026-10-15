import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { WishlistItem, CreateWishlistInput } from "@/types/wishlist";
import { CurrentUser } from "@/types/room";

export async function createWishlistItem(
  roomId: string,
  author: CurrentUser,
  input: CreateWishlistInput
): Promise<WishlistItem> {
  const itemRef = doc(collection(db, "rooms", roomId, "wishlist"));
  const itemId = itemRef.id;

  const target = input.targetPrice && input.targetPrice > 0 ? input.targetPrice : undefined;
  const saved = input.currentSaved && input.currentSaved > 0 ? input.currentSaved : 0;
  const percent = target ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  const newItem: WishlistItem = {
    id: itemId,
    title: input.title.trim(),
    category: input.category,
    targetPrice: target,
    currentSaved: target ? saved : undefined,
    progressPercent: percent,
    notes: input.notes?.trim() || undefined,
    url: input.url?.trim() || undefined,
    imageUrl: input.imageUrl || undefined,
    isCompleted: percent >= 100,
    completedAt: percent >= 100 ? Date.now() : undefined,
    completedBy: percent >= 100 ? author.name : undefined,
    createdBy: author.id,
    createdByName: author.name,
    createdAt: Date.now(),
  };

  await setDoc(itemRef, removeUndefinedFields(newItem));
  return newItem;
}

export function subscribeToWishlist(
  roomId: string,
  onUpdate: (items: WishlistItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "wishlist"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const items: WishlistItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as WishlistItem);
    });
    onUpdate(items);
  });
}

export async function updateWishlistProgress(
  roomId: string,
  itemId: string,
  newSaved: number,
  targetPrice?: number
): Promise<void> {
  const itemRef = doc(db, "rooms", roomId, "wishlist", itemId);
  const target = targetPrice || 0;
  const percent = target > 0 ? Math.min(100, Math.round((newSaved / target) * 100)) : 0;
  const isCompleted = target > 0 && newSaved >= target;

  await updateDoc(itemRef, {
    currentSaved: newSaved,
    progressPercent: percent,
    isCompleted,
    ...(isCompleted ? { completedAt: Date.now() } : { completedAt: null, completedBy: null }),
  });
}

export async function toggleWishlistCompleted(
  roomId: string,
  itemId: string,
  isCompleted: boolean,
  userName: string
): Promise<void> {
  const itemRef = doc(db, "rooms", roomId, "wishlist", itemId);
  await updateDoc(itemRef, {
    isCompleted,
    progressPercent: isCompleted ? 100 : 0,
    completedAt: isCompleted ? Date.now() : null,
    completedBy: isCompleted ? userName : null,
  });
}

export async function deleteWishlistItem(
  roomId: string,
  itemId: string
): Promise<void> {
  const itemRef = doc(db, "rooms", roomId, "wishlist", itemId);
  await deleteDoc(itemRef);
}
