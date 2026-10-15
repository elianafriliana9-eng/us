import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "@/lib/firebase/firestore";
import { Post, CreatePostInput } from "@/types/post";
import { CurrentUser } from "@/types/room";

export async function createStoryPost(
  roomId: string,
  author: CurrentUser,
  input: CreatePostInput
): Promise<Post> {
  const postRef = doc(collection(db, "rooms", roomId, "posts"));
  const postId = postRef.id;

  const newPost: Post = {
    id: postId,
    authorId: author.id,
    authorName: author.name,
    title: input.title.trim(),
    caption: input.caption.trim(),
    category: input.category,
    location: input.location?.trim() || undefined,
    images: input.images,
    likes: 0,
    date: input.date || new Date().toISOString().split("T")[0],
    createdAt: Date.now(),
    quote: input.quote?.trim() || undefined,
  };

  await setDoc(postRef, newPost);
  return newPost;
}

export function subscribeToStoryPosts(
  roomId: string,
  onPostsUpdate: (posts: Post[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "posts"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const posts: Post[] = [];
    snapshot.forEach((docSnap) => {
      posts.push(docSnap.data() as Post);
    });
    onPostsUpdate(posts);
  });
}

export async function likeStoryPost(
  roomId: string,
  postId: string,
  currentLikes: number = 0
): Promise<void> {
  const postRef = doc(db, "rooms", roomId, "posts", postId);
  await updateDoc(postRef, {
    likes: currentLikes + 1,
  });
}

export async function deleteStoryPost(
  roomId: string,
  postId: string
): Promise<void> {
  const postRef = doc(db, "rooms", roomId, "posts", postId);
  await deleteDoc(postRef);
}
