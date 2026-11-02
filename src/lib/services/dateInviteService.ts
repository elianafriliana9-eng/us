import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import { DateInvite, CreateDateInviteInput, DateInviteStatus } from "@/types/dateInvite";
import { CurrentUser } from "@/types/room";
import { createScheduleEvent } from "@/lib/services/scheduleService";

export async function createDateInvite(
  roomId: string,
  author: CurrentUser,
  recipientId: string | undefined,
  input: CreateDateInviteInput
): Promise<DateInvite> {
  const inviteRef = doc(collection(db, "rooms", roomId, "dateInvites"));
  const newInvite: DateInvite = {
    id: inviteRef.id,
    senderId: author.id,
    senderName: author.name,
    recipientId: recipientId || undefined,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    date: input.date,
    time: input.time?.trim() || undefined,
    location: input.location?.trim() || undefined,
    status: "pending",
    createdAt: Date.now(),
  };

  await setDoc(inviteRef, removeUndefinedFields(newInvite));
  return newInvite;
}

export function subscribeToDateInvites(
  roomId: string,
  onUpdate: (invites: DateInvite[]) => void
): Unsubscribe {
  const colRef = collection(db, "rooms", roomId, "dateInvites");
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as DateInvite);
    onUpdate(list);
  });
}

export async function respondToDateInvite(
  roomId: string,
  inviteId: string,
  status: "accepted" | "declined",
  responseNote?: string
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "dateInvites", inviteId);
  await updateDoc(
    ref,
    removeUndefinedFields({
      status,
      respondedAt: Date.now(),
      responseNote: responseNote?.trim() || undefined,
    })
  );

  // If approved/accepted, automatically integrate into the room's calendar schedule!
  if (status === "accepted") {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const inviteData = snap.data() as DateInvite;
        await createScheduleEvent(
          roomId,
          {
            id: inviteData.senderId,
            name: inviteData.senderName,
            role: "partner",
          },
          {
            title: `Date: ${inviteData.title}`,
            description: inviteData.description || `Undangan kencan dari ${inviteData.senderName} yang telah disetujui 💕`,
            date: inviteData.date,
            time: inviteData.time,
            location: inviteData.location,
            category: "date",
          }
        );
      }
    } catch (err) {
      console.error("Gagal auto-sync date invite ke schedule:", err);
    }
  }
}
