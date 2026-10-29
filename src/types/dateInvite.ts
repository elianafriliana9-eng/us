export type DateInviteStatus = "pending" | "accepted" | "declined";

export interface DateInvite {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  status: DateInviteStatus;
  respondedAt?: number;
  responseNote?: string;
  createdAt: number;
}

export interface CreateDateInviteInput {
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
}
