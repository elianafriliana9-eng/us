export type PinCategory =
  | "first_date"
  | "travel"
  | "cafe"
  | "anniversary"
  | "milestone"
  | "daily";

export interface MemoryPin {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  caption: string;
  category: PinCategory;
  lat: number;
  lng: number;
  locationName?: string;
  images: string[];
  date: string;
  createdAt: number;
}

export interface CreatePinInput {
  title: string;
  caption: string;
  category: PinCategory;
  lat: number;
  lng: number;
  locationName?: string;
  images: string[];
  date: string;
}
