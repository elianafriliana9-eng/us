import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { ScheduleEvent, CreateScheduleInput } from "@/types/schedule";
import { CurrentUser } from "@/types/room";

export async function createScheduleEvent(
  roomId: string,
  author: CurrentUser,
  input: CreateScheduleInput
): Promise<ScheduleEvent> {
  const eventRef = doc(collection(db, "rooms", roomId, "schedule"));
  const newEvent: ScheduleEvent = {
    id: eventRef.id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    date: input.date,
    time: input.time || undefined,
    location: input.location?.trim() || undefined,
    category: input.category || "date",
    createdBy: {
      id: author.id,
      name: author.name,
    },
    createdAt: Date.now(),
  };

  await setDoc(eventRef, removeUndefinedFields(newEvent));
  return newEvent;
}

export async function deleteScheduleEvent(
  roomId: string,
  eventId: string
): Promise<void> {
  const eventRef = doc(db, "rooms", roomId, "schedule", eventId);
  await deleteDoc(eventRef);
}

export function subscribeToScheduleEvents(
  roomId: string,
  onEvents: (events: ScheduleEvent[]) => void
): Unsubscribe {
  const colRef = collection(db, "rooms", roomId, "schedule");
  const q = query(colRef, orderBy("date", "asc"));
  return onSnapshot(q, (snapshot) => {
    const events: ScheduleEvent[] = [];
    snapshot.forEach((d) => {
      events.push(d.data() as ScheduleEvent);
    });
    onEvents(events);
  });
}
