import {
  db,
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { CurrentUser } from "@/types/room";
import { MoodEntry, MoodOption } from "@/types/mood";

/** Local calendar day key (YYYY-MM-DD) — matches the user's own timezone */
export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayKey(): string {
  return getDateKey(new Date());
}

/** Deterministic doc id so one user can only have one mood per day */
export function getMoodDocId(userId: string, dateKey: string): string {
  return `${userId}_${dateKey}`;
}

/**
 * Creates or updates today's mood for the current user.
 * Changing the mood on the same day overwrites the existing entry.
 */
export async function setMood(
  roomId: string,
  user: CurrentUser,
  mood: MoodOption,
  note?: string
): Promise<void> {
  if (!roomId || !user?.id) return;

  const dateKey = getTodayKey();
  const moodRef = doc(db, "rooms", roomId, "moods", getMoodDocId(user.id, dateKey));

  const entry: MoodEntry = {
    id: getMoodDocId(user.id, dateKey),
    userId: user.id,
    userName: user.name || "Pasangan",
    dateKey,
    mood: mood.key,
    emoji: mood.emoji,
    label: mood.label,
    note: note?.trim() || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(moodRef, removeUndefinedFields(entry), { merge: true });
}

/**
 * Real-time stream of mood entries in the room, newest day first.
 * Limit keeps the listener light: ~45 days per partner.
 */
export function subscribeToMoods(
  roomId: string,
  onMoodsUpdate: (moods: MoodEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "moods"),
    orderBy("dateKey", "desc"),
    limit(90)
  );

  return onSnapshot(q, (snapshot) => {
    const moods: MoodEntry[] = [];
    snapshot.forEach((docSnap) => {
      moods.push(docSnap.data() as MoodEntry);
    });
    onMoodsUpdate(moods);
  });
}

/** Mood of a specific user on a specific day, if any */
export function getMoodOn(
  moods: MoodEntry[],
  userId: string,
  dateKey: string
): MoodEntry | undefined {
  return moods.find((m) => m.userId === userId && m.dateKey === dateKey);
}

/**
 * Consecutive days (ending today, or yesterday when today is not checked in yet)
 * where the user recorded a mood.
 */
export function getMoodStreak(
  moods: MoodEntry[],
  userId: string,
  todayKey: string = getTodayKey()
): number {
  const dates = new Set(
    moods.filter((m) => m.userId === userId).map((m) => m.dateKey)
  );
  if (dates.size === 0) return 0;

  const cursor = new Date(`${todayKey}T00:00:00`);
  if (!dates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dates.has(getDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (dates.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Last N days of a user's moods, oldest first. Missing days are `undefined`
 * so the UI can render an empty slot instead of shifting the timeline.
 */
export function getRecentMoodDays(
  moods: MoodEntry[],
  userId: string,
  days: number = 7,
  todayKey: string = getTodayKey()
): (MoodEntry | undefined)[] {
  const byDate = new Map<string, MoodEntry>();
  moods
    .filter((m) => m.userId === userId)
    .forEach((m) => byDate.set(m.dateKey, m));

  const cursor = new Date(`${todayKey}T00:00:00`);
  const result: (MoodEntry | undefined)[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - i);
    result.push(byDate.get(getDateKey(day)));
  }

  return result;
}
