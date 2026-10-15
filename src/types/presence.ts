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
  sentAt: number;
}
