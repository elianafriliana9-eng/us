import {
  db,
  doc,
  collection,
  getDoc,
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

export async function getRoomByCode(code: string): Promise<Room | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  const q = query(
    collection(db, "rooms"),
    where("code", "==", cleanCode),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  return querySnapshot.docs[0].data() as Room;
}

export async function joinRoomByCode(
  inputCode: string,
  partnerName: string = "",
  selectedMemberId?: string
): Promise<{
  room: Room;
  currentUser: CurrentUser;
}> {
  const cleanName = partnerName.trim();
  const cleanCode = inputCode.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error("Kode room harus diisi");
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
  let members = roomData.members || [];

  // 1. Auto-deduplicate if room accidentally has duplicate members with same name
  const memberNamesLower = members.map((m) => m.name.trim().toLowerCase());
  const hasDuplicateNames = new Set(memberNamesLower).size < members.length;
  if (members.length >= 2 && hasDuplicateNames) {
    const creator = members.find((m) => m.role === "creator") || members[0];
    members = [creator];
    await updateDoc(roomDoc.ref, {
      members,
      connectedAt: null,
    });
    roomData.members = members;
    roomData.connectedAt = undefined;
  }

  // 2. Check if re-entering by selected member ID
  if (selectedMemberId) {
    const matched = members.find((m) => m.id === selectedMemberId);
    if (matched) {
      const currentUser: CurrentUser = {
        id: matched.id,
        name: matched.name,
        role: matched.role,
      };
      return { room: roomData, currentUser };
    }
  }

  // 3. Check if cleanName matches an existing member (case-insensitive)
  if (cleanName) {
    const existingMember = members.find(
      (m) => m.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existingMember) {
      // Re-enter room as this existing member! No duplicate!
      const currentUser: CurrentUser = {
        id: existingMember.id,
        name: existingMember.name,
        role: existingMember.role,
      };
      return { room: roomData, currentUser };
    }
  }

  // 4. If name not matched and room already has 2 distinct members:
  if (members.length >= 2) {
    const names = members.map((m) => `"${m.name}"`).join(" & ");
    throw new Error(
      `Room ini sudah memiliki 2 anggota (${names}). Silakan pilih nama akunmu untuk masuk kembali.`
    );
  }

  // 5. If joining as a new partner for the first time
  if (!cleanName) {
    throw new Error("Tuliskan nama panggilanmu");
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

export async function resetPartnerSlot(roomId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;
  const roomData = roomSnap.data() as Room;
  const creator =
    (roomData.members || []).find((m) => m.role === "creator") || roomData.members[0];
  if (creator) {
    await updateDoc(roomRef, {
      members: [creator],
      connectedAt: null,
    });
  }
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
