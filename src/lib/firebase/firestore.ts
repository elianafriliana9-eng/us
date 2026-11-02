import { db } from "./config";
import {
  collection as firestoreCollection,
  doc as firestoreDoc,
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

const PREFIX = process.env.NEXT_PUBLIC_DB_PREFIX || "";

function prefixPath(path: string): string {
  return path === "rooms" ? `${PREFIX}rooms` : path;
}

// Wrapper to transparently prefix root 'rooms' collection
export const collection = ((...args: any[]) => {
  if (args.length >= 2 && typeof args[1] === "string") {
    args[1] = prefixPath(args[1]);
  }
  return (firestoreCollection as any)(...args);
}) as typeof firestoreCollection;

export const doc = ((...args: any[]) => {
  if (args.length >= 2 && typeof args[1] === "string") {
    args[1] = prefixPath(args[1]);
  }
  return (firestoreDoc as any)(...args);
}) as typeof firestoreDoc;

// Helper to get room document ref
export const getRoomDocRef = (roomId: string): DocumentReference => {
  return doc(db, "rooms", roomId);
};

// Helper to get room subcollection ref
export const getRoomCollectionRef = (
  roomId: string,
  collectionName:
    | "posts"
    | "wishlist"
    | "expenses"
    | "dates"
    | "pins"
    | "members"
    | "moods"
): CollectionReference => {
  return collection(db, "rooms", roomId, collectionName);
};

/**
 * Strips all undefined fields from an object so Firestore setDoc / updateDoc
 * never throws "Unsupported field value: undefined".
 */
export function removeUndefinedFields<T extends object>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = removeUndefinedFields(val as Record<string, unknown>);
      } else {
        result[key] = val;
      }
    }
  }
  return result as unknown as T;
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
