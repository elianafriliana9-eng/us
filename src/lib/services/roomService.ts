import {
  db,
  doc,
  collection,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
} from "@/lib/firebase/firestore";
import { onSnapshot, Unsubscribe } from "firebase/firestore";
import { Room, RoomMember, CurrentUser } from "@/types/room";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length: number = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

export async function createRoom(creatorName: string): Promise<{
  room: Room;
  currentUser: CurrentUser;
}> {
  const cleanName = creatorName.trim();
  if (!cleanName) {
    throw new Error("Nama tidak boleh kosong");
  }

  const roomRef = doc(collection(db, "rooms"));
  const roomId = roomRef.id;
  const roomCode = generateRoomCode();
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const creatorMember: RoomMember = {
    id: userId,
    name: cleanName,
    role: "creator",
    joinedAt: Date.now(),
  };

  const roomData: Room = {
    id: roomId,
    code: roomCode,
    createdAt: Date.now(),
    createdBy: userId,
    members: [creatorMember],
  };

  // Create room document
  await setDoc(roomRef, roomData);

  // Add to members subcollection as well
  const memberRef = doc(db, "rooms", roomId, "members", userId);
  await setDoc(memberRef, creatorMember);

  const currentUser: CurrentUser = {
    id: userId,
    name: cleanName,
    role: "creator",
  };

  return { room: roomData, currentUser };
}

export async function joinRoomByCode(
  inputCode: string,
  partnerName: string
): Promise<{
  room: Room;
  currentUser: CurrentUser;
}> {
  const cleanName = partnerName.trim();
  const cleanCode = inputCode.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error("Kode room harus diisi");
  }
  if (!cleanName) {
    throw new Error("Nama tidak boleh kosong");
  }

  const q = query(
    collection(db, "rooms"),
    where("code", "==", cleanCode),
    limit(1)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Room dengan kode tersebut tidak ditemukan.");
  }

  const roomDoc = querySnapshot.docs[0];
  const roomData = roomDoc.data() as Room;
  const members = roomData.members || [];

  if (members.length >= 2) {
    throw new Error("Room ini sudah penuh (khusus 2 orang).");
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const partnerMember: RoomMember = {
    id: userId,
    name: cleanName,
    role: "partner",
    joinedAt: Date.now(),
  };

  const connectedAt = Date.now();
  const updatedMembers = [...members, partnerMember];

  // Update room doc with members and connection timestamp
  await updateDoc(roomDoc.ref, {
    members: updatedMembers,
    connectedAt: connectedAt,
  });

  // Add member doc
  const memberRef = doc(db, "rooms", roomData.id, "members", userId);
  await setDoc(memberRef, partnerMember);

  const updatedRoom: Room = {
    ...roomData,
    members: updatedMembers,
    connectedAt: connectedAt,
  };

  const currentUser: CurrentUser = {
    id: userId,
    name: cleanName,
    role: "partner",
  };

  return { room: updatedRoom, currentUser };
}

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: Room) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(
    roomRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as Room);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function updateRelationshipStartDate(
  roomId: string,
  startDate: string
): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, {
    relationshipStartDate: startDate,
  });
}
