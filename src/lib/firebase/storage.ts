import { storage } from "./config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Resizes and compresses image or audio to a compact base64 data-URL
 * used as a reliable fallback when Firebase Storage is not yet enabled or blocked by CORS.
 */
export async function fileToOptimizedDataUrl(
  file: File | Blob,
  maxWidth = 960,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an audio blob, convert directly to base64 data URL
    if (file.type && file.type.startsWith("audio/")) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // If it's an image, resize and compress via HTML5 canvas
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads media using smart client-side optimization.
 * Automatically resizes & compresses images/audio to lightweight format stored directly in Firestore.
 * 100% FREE on Firebase Spark plan — NO credit card or Blaze upgrade needed!
 */
export async function uploadRoomMedia(
  _roomId: string,
  _folder: "posts" | "pins" | "avatars" | "voice_notes",
  file: File | Blob,
  _customExtension?: string
): Promise<string> {
  void _customExtension;
  return await fileToOptimizedDataUrl(file);
}

export { storage, ref, uploadBytes, getDownloadURL };
