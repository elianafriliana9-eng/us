import { storage } from "./config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a file under rooms/{roomId}/{folder}/{fileName}
 */
export async function uploadRoomMedia(
  roomId: string,
  folder: "posts" | "pins" | "avatars" | "voice_notes",
  file: File | Blob,
  customExtension?: string
): Promise<string> {
  let extension = customExtension;
  if (!extension) {
    if (file instanceof File && file.name) {
      extension = file.name.split(".").pop() || "jpg";
    } else {
      extension = "webm";
    }
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const filePath = `rooms/${roomId}/${folder}/${uniqueId}.${extension}`;
  const fileRef = ref(storage, filePath);

  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

export { storage, ref, uploadBytes, getDownloadURL };
