import type { Timestamp } from "firebase/firestore";

export interface UserPresence {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: number; // Timestamp in ms
}

export interface HeartNudge {
  senderId: string;
  senderName: string;
  emoji: string;
  // Firestore Timestamp from server clock (new); legacy docs may hold ms numbers
  sentAt: Timestamp | number;
}
