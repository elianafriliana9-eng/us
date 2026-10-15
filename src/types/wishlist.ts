export type WishlistCategory = "item" | "trip" | "future" | "daily";

export interface WishlistItem {
  id: string;
  title: string;
  category: WishlistCategory;
  targetPrice?: number;
  currentSaved?: number;
  progressPercent: number; // 0 - 100
  notes?: string;
  url?: string;
  imageUrl?: string;
  isCompleted: boolean;
  completedAt?: number;
  completedBy?: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface CreateWishlistInput {
  title: string;
  category: WishlistCategory;
  targetPrice?: number;
  currentSaved?: number;
  notes?: string;
  url?: string;
  imageUrl?: string;
}
