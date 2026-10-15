export interface RoomMember {
  id: string;
  name: string;
  role: "creator" | "partner";
  joinedAt: number;
  avatarUrl?: string;
}

export interface Room {
  id: string;
  code: string;
  name?: string;
  createdAt: number;
  createdBy: string;
  members: RoomMember[];
  connectedAt?: number;
  relationshipStartDate?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: "creator" | "partner";
}
