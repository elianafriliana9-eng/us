export type PostCategory = "photo" | "trip" | "milestone" | "daily" | "voice";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  caption: string;
  category: PostCategory;
  location?: string;
  images: string[];
  likes?: number;
  date: string;
  createdAt: number;
  quote?: string;
  badgeText?: string;
  audioUrl?: string;
  audioDuration?: number; // duration in seconds
}

export interface CreatePostInput {
  title: string;
  caption: string;
  category: PostCategory;
  location?: string;
  images: string[];
  date: string;
  quote?: string;
  audioUrl?: string;
  audioDuration?: number;
}
