export type MoodKey = "love" | "happy" | "okay" | "tired" | "sad" | "hard";

export interface MoodOption {
  key: MoodKey;
  emoji: string;
  label: string;
  /** Accent color used for chips / glows */
  color: string;
}

/**
 * Mood palette for the daily check-in ritual.
 * Kept intentionally small (6 options) so picking one stays a single tap.
 */
export const MOODS: MoodOption[] = [
  { key: "love", emoji: "🥰", label: "Bucin", color: "#e11d48" },
  { key: "happy", emoji: "😄", label: "Bahagia", color: "#f59e0b" },
  { key: "okay", emoji: "🙂", label: "Oke", color: "#00845a" },
  { key: "tired", emoji: "😴", label: "Capek", color: "#7c5cbf" },
  { key: "sad", emoji: "😔", label: "Sedih", color: "#3b6ea5" },
  { key: "hard", emoji: "😤", label: "Berat", color: "#ba1a1a" },
];

export const MOOD_MAP: Record<MoodKey, MoodOption> = MOODS.reduce(
  (acc, mood) => ({ ...acc, [mood.key]: mood }),
  {} as Record<MoodKey, MoodOption>
);

export function getMoodOption(key?: string | null): MoodOption | undefined {
  if (!key) return undefined;
  return MOOD_MAP[key as MoodKey];
}

/** One check-in per user per day, stored at rooms/{roomId}/moods/{userId}_{dateKey} */
export interface MoodEntry {
  id: string;
  userId: string;
  userName: string;
  /** Local calendar day as YYYY-MM-DD */
  dateKey: string;
  mood: MoodKey;
  emoji: string;
  label: string;
  note?: string | null;
  createdAt: number;
  updatedAt: number;
}
