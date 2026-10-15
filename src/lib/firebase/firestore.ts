import { db } from "./config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
  CollectionReference,
  DocumentReference,
} from "firebase/firestore";

// Helper to get room document ref
export const getRoomDocRef = (roomId: string): DocumentReference => {
  return doc(db, "rooms", roomId);
};

// Helper to get room subcollection ref
export const getRoomCollectionRef = (
  roomId: string,
  collectionName: "posts" | "wishlist" | "expenses" | "dates" | "pins" | "members"
): CollectionReference => {
  return collection(db, "rooms", roomId, collectionName);
};

/**
 * Strips all undefined fields from an object so Firestore setDoc / updateDoc
 * never throws "Unsupported field value: undefined".
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = removeUndefinedFields(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

export {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
};
