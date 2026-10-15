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
