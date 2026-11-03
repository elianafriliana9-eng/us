import {
  db,
  doc,
  collection,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  removeUndefinedFields,
} from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import {
  BestieRoom,
  BestieMember,
  BestieCurrentUser,
  MEMBER_COLORS,
  MAX_BESTIE_MEMBERS,
  BestieStatusEntry,
  BestieStatusOption,
  BestiePing,
  BestiePingKey,
  BestiePost,
  CreateBestiePostInput,
  SquadPoll,
  WacanaItem,
  CreateWacanaInput,
  BestieExpense,
  CreateBestieExpenseInput,
  HangoutPass,
  CreateHangoutPassInput,
  RsvpChoice,
  BestiePin,
  CreateBestiePinInput,
  BestieScheduleEvent,
  CreateBestieScheduleInput,
} from "@/types/bestie";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBestieCode(length: number = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

export function getTodayDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Picks the first unused colorId from the 6-member palette.
 */
function pickAvailableColorId(existingMembers: BestieMember[]) {
  const used = new Set(existingMembers.map((m) => m.colorId));
  const available = MEMBER_COLORS.find((c) => !used.has(c.id));
  return available ? available.id : MEMBER_COLORS[existingMembers.length % MEMBER_COLORS.length].id;
}

export async function createBestieRoom(
  circleName: string,
  hostName: string,
  birthday?: string
): Promise<{
  room: BestieRoom;
  currentUser: BestieCurrentUser;
}> {
  const cleanCircle = circleName.trim();
  const cleanHost = hostName.trim();
  if (!cleanCircle) throw new Error("Nama Circle tidak boleh kosong");
  if (!cleanHost) throw new Error("Nama panggilanmu tidak boleh kosong");

  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const roomId = `bst_${Date.now()}_${randomSuffix}`;
  const roomRef = doc(db, "rooms", roomId);
  const roomCode = generateBestieCode();
  const userId = `bst_usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const hostMember: BestieMember = {
    id: userId,
    name: cleanHost,
    role: "host",
    colorId: "cobalt",
    birthday: birthday?.trim() || undefined,
    joinedAt: Date.now(),
  };

  const todayKey = getTodayDateKey();

  const roomData: BestieRoom = {
    id: roomId,
    code: roomCode,
    roomType: "bestie",
    name: cleanCircle,
    maxMembers: MAX_BESTIE_MEMBERS,
    createdAt: Date.now(),
    createdBy: userId,
    members: [hostMember],
    circleStartDate: todayKey,
  };

  await setDoc(roomRef, removeUndefinedFields(roomData));

  const memberRef = doc(db, "rooms", roomId, "members", userId);
  await setDoc(memberRef, removeUndefinedFields(hostMember));

  const currentUser: BestieCurrentUser = {
    id: userId,
    name: cleanHost,
    role: "host",
    colorId: "cobalt",
  };

  return { room: roomData, currentUser };
}

export async function getBestieRoomByCode(code: string): Promise<BestieRoom | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  const q = query(
    collection(db, "rooms"),
    where("code", "==", cleanCode),
    limit(5)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  for (const d of snap.docs) {
    const data = d.data() as Partial<BestieRoom>;
    if (data.roomType === "bestie" || d.id.startsWith("bst_")) {
      return data as BestieRoom;
    }
  }

  return null;
}

export async function joinBestieRoomByCode(
  inputCode: string,
  memberName: string = "",
  selectedMemberId?: string,
  birthday?: string
): Promise<{
  room: BestieRoom;
  currentUser: BestieCurrentUser;
}> {
  const cleanCode = inputCode.trim().toUpperCase();
  const cleanName = memberName.trim();

  if (!cleanCode) {
    throw new Error("Kode Circle harus diisi");
  }

  const q = query(
    collection(db, "rooms"),
    where("code", "==", cleanCode),
    limit(5)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error("Circle dengan kode tersebut tidak ditemukan.");
  }

  const bestieDoc = snap.docs.find((d) => {
    const data = d.data() as Partial<BestieRoom>;
    return data.roomType === "bestie" || d.id.startsWith("bst_");
  });

  if (!bestieDoc) {
    throw new Error(
      "Kode ini adalah Room Pasangan (Couple). Gunakan kode khusus Bestie Circle."
    );
  }

  const roomData = bestieDoc.data() as BestieRoom;
  const members: BestieMember[] = roomData.members || [];

  // 1. Re-enter by selectedMemberId
  if (selectedMemberId) {
    const matched = members.find((m) => m.id === selectedMemberId);
    if (matched) {
      return {
        room: roomData,
        currentUser: {
          id: matched.id,
          name: matched.name,
          role: matched.role,
          colorId: matched.colorId || "cobalt",
        },
      };
    }
  }

  // 2. Re-enter if name matches an existing member (case-insensitive)
  if (cleanName) {
    const existing = members.find(
      (m) => m.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return {
        room: roomData,
        currentUser: {
          id: existing.id,
          name: existing.name,
          role: existing.role,
          colorId: existing.colorId || "cobalt",
        },
      };
    }
  }

  // 3. Enforce max 6 members
  const maxAllowed = roomData.maxMembers || MAX_BESTIE_MEMBERS;
  if (members.length >= maxAllowed) {
    throw new Error(
      `Circle "${roomData.name}" sudah penuh (${maxAllowed}/${maxAllowed} anggota). Pilih namamu di daftar profil untuk masuk kembali.`
    );
  }

  if (!cleanName) {
    throw new Error("Tuliskan nama panggilanmu untuk bergabung");
  }

  const userId = `bst_usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const colorId = pickAvailableColorId(members);

  const newMember: BestieMember = {
    id: userId,
    name: cleanName,
    role: "member",
    colorId,
    birthday: birthday?.trim() || undefined,
    joinedAt: Date.now(),
  };

  const updatedMembers = [...members, newMember];
  await updateDoc(bestieDoc.ref, {
    members: updatedMembers.map((m) => removeUndefinedFields(m)),
  });

  const memberRef = doc(db, "rooms", roomData.id, "members", userId);
  await setDoc(memberRef, removeUndefinedFields(newMember));

  const updatedRoom: BestieRoom = {
    ...roomData,
    members: updatedMembers,
  };

  return {
    room: updatedRoom,
    currentUser: {
      id: userId,
      name: cleanName,
      role: "member",
      colorId,
    },
  };
}

export function subscribeToBestieRoom(
  roomId: string,
  onUpdate: (room: BestieRoom) => void
): Unsubscribe {
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(roomRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as BestieRoom);
    }
  });
}

export async function removeBestieMemberSlot(
  roomId: string,
  memberIdToRemove: string
): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const data = snap.data() as BestieRoom;
  const updated = (data.members || []).filter((m) => m.id !== memberIdToRemove);
  if (updated.length === 0) return;

  await updateDoc(roomRef, {
    members: updated.map((m) => removeUndefinedFields(m)),
  });
}

export async function updateBestieMemberBirthday(
  roomId: string,
  memberId: string,
  birthday: string
): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const data = snap.data() as BestieRoom;
  const updated = (data.members || []).map((m) =>
    m.id === memberId ? { ...m, birthday: birthday.trim() || undefined } : m
  );

  await updateDoc(roomRef, {
    members: updated.map((m) => removeUndefinedFields(m)),
  });
}

export async function updateCircleMetadata(
  roomId: string,
  updates: {
    name?: string;
    circleStartDate?: string;
    pickerOptions?: string[];
    lastPickedSpot?: {
      spot: string;
      pickedBy: string;
      pickedAt: number;
    } | null;
  }
): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, removeUndefinedFields(updates));
}

// ==========================================
// QUICK PING (SQUAD NUDGE)
// ==========================================
export async function sendBestiePing(
  roomId: string,
  sender: { id: string; name: string },
  pingKey: BestiePingKey,
  label: string
): Promise<void> {
  const ref = collection(db, "rooms", roomId, "nudges");
  await addDoc(
    ref,
    removeUndefinedFields({
      senderId: sender.id,
      senderName: sender.name,
      pingKey,
      label,
      sentAt: serverTimestamp(),
    })
  );
}

export function subscribeToBestiePings(
  roomId: string,
  onPings: (pings: BestiePing[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "nudges"),
    orderBy("sentAt", "asc"),
    limit(25)
  );
  return onSnapshot(q, (snap) => {
    onPings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BestiePing) })));
  });
}

export function resolvePingSentAtMs(ping: BestiePing): number | null {
  const at = ping.sentAt;
  if (typeof at === "number") return at;
  if (at && typeof (at as Timestamp).toMillis === "function") {
    return (at as Timestamp).toMillis();
  }
  return null;
}

// ==========================================
// DAILY STATUS / VIBE CHECK (6 SLOTS)
// ==========================================
export async function setBestieStatus(
  roomId: string,
  user: BestieCurrentUser,
  option: BestieStatusOption,
  note?: string
): Promise<void> {
  const dateKey = getTodayDateKey();
  const docId = `${user.id}_${dateKey}`;
  const ref = doc(db, "rooms", roomId, "moods", docId);

  const entry: BestieStatusEntry = {
    id: docId,
    userId: user.id,
    userName: user.name,
    dateKey,
    status: option.key,
    label: option.label,
    note: note?.trim() || null,
    updatedAt: Date.now(),
  };

  await setDoc(ref, removeUndefinedFields(entry), { merge: true });
}

export function subscribeToBestieStatuses(
  roomId: string,
  onUpdate: (entries: BestieStatusEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "moods"),
    orderBy("dateKey", "desc"),
    limit(90)
  );
  return onSnapshot(q, (snap) => {
    const list: BestieStatusEntry[] = [];
    snap.forEach((d) => list.push(d.data() as BestieStatusEntry));
    onUpdate(list);
  });
}

// ==========================================
// SQUAD POLL (VOTING CEPAT 6 USER)
// ==========================================
export async function createSquadPoll(
  roomId: string,
  author: BestieCurrentUser,
  question: string,
  optionTexts: string[]
): Promise<void> {
  const pollRef = doc(collection(db, "rooms", roomId, "polls"));
  const options = optionTexts
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, idx) => ({
      id: `opt_${idx}_${Date.now()}`,
      text,
      voterIds: [],
    }));

  const poll: SquadPoll = {
    id: pollRef.id,
    question: question.trim(),
    options,
    createdById: author.id,
    createdByName: author.name,
    createdAt: Date.now(),
    isActive: true,
  };

  await setDoc(pollRef, poll);
}

export async function voteInSquadPoll(
  roomId: string,
  poll: SquadPoll,
  optionId: string,
  userId: string
): Promise<void> {
  const pollRef = doc(db, "rooms", roomId, "polls", poll.id);
  const updatedOptions = poll.options.map((opt) => {
    const withoutUser = (opt.voterIds || []).filter((id) => id !== userId);
    if (opt.id === optionId) {
      return { ...opt, voterIds: [...withoutUser, userId] };
    }
    return { ...opt, voterIds: withoutUser };
  });

  await updateDoc(pollRef, { options: updatedOptions });
}

export async function deleteSquadPoll(roomId: string, pollId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "polls", pollId));
}

export function subscribeToSquadPolls(
  roomId: string,
  onUpdate: (polls: SquadPoll[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "polls"),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as SquadPoll));
  });
}

// ==========================================
// BASECAMP TIMELINE POSTS
// ==========================================
export async function createBestiePost(
  roomId: string,
  author: BestieCurrentUser,
  input: CreateBestiePostInput
): Promise<void> {
  const postRef = doc(collection(db, "rooms", roomId, "posts"));
  const post: BestiePost = {
    id: postRef.id,
    authorId: author.id,
    authorName: author.name,
    title: input.title.trim(),
    caption: input.caption.trim(),
    category: input.category,
    location: input.location?.trim() || undefined,
    images: input.images || [],
    likedByIds: [],
    date: input.date,
    createdAt: Date.now(),
    quote: input.quote?.trim() || undefined,
    audioUrl: input.audioUrl,
    audioDuration: input.audioDuration,
  };

  await setDoc(postRef, removeUndefinedFields(post));
}

export async function toggleLikeBestiePost(
  roomId: string,
  post: BestiePost,
  userId: string
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "posts", post.id);
  const currentLikes = post.likedByIds || [];
  const exists = currentLikes.includes(userId);
  const nextLikes = exists
    ? currentLikes.filter((id) => id !== userId)
    : [...currentLikes, userId];

  await updateDoc(ref, { likedByIds: nextLikes });
}

export function subscribeToBestiePosts(
  roomId: string,
  onUpdate: (posts: BestiePost[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "posts"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as BestiePost));
  });
}

// ==========================================
// WACANA & TABUNGAN GRUP (MULTI-CONTRIBUTOR)
// ==========================================
export async function createWacanaItem(
  roomId: string,
  author: BestieCurrentUser,
  input: CreateWacanaInput
): Promise<void> {
  const ref = doc(collection(db, "rooms", roomId, "wishlist"));
  const initialAmount = Math.max(0, Math.round(Number(input.initialContribution) || 0));
  const target = input.targetPrice ? Math.round(Number(input.targetPrice)) : undefined;
  const percent =
    target && target > 0 ? Math.min(100, Math.round((initialAmount / target) * 100)) : 0;

  const contributions: Record<string, number> = {};
  if (initialAmount > 0) {
    contributions[author.id] = initialAmount;
  }

  const item: WacanaItem = {
    id: ref.id,
    title: input.title.trim(),
    category: input.category,
    targetPrice: target,
    currentSaved: initialAmount,
    progressPercent: percent,
    contributions,
    targetDate: input.targetDate || undefined,
    notes: input.notes?.trim() || undefined,
    url: input.url?.trim() || undefined,
    imageUrl: input.imageUrl || undefined,
    isCompleted: percent >= 100 && !!target,
    createdBy: author.id,
    createdByName: author.name,
    createdAt: Date.now(),
  };

  await setDoc(ref, removeUndefinedFields(item));
}

export async function addWacanaContribution(
  roomId: string,
  item: WacanaItem,
  memberId: string,
  deltaAmount: number
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "wishlist", item.id);
  const currentMap = { ...(item.contributions || {}) };
  const prevMemberTotal = currentMap[memberId] || 0;
  const nextMemberTotal = Math.max(0, prevMemberTotal + Math.round(deltaAmount));
  currentMap[memberId] = nextMemberTotal;

  const totalSaved = Object.values(currentMap).reduce((sum, val) => sum + val, 0);
  const target = item.targetPrice || 0;
  const percent =
    target > 0 ? Math.min(100, Math.round((totalSaved / target) * 100)) : item.progressPercent;

  await updateDoc(ref, {
    contributions: currentMap,
    currentSaved: totalSaved,
    progressPercent: percent,
    isCompleted: target > 0 ? totalSaved >= target : item.isCompleted,
  });
}

export async function toggleWacanaCompleted(
  roomId: string,
  item: WacanaItem
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "wishlist", item.id);
  const nextDone = !item.isCompleted;
  await updateDoc(ref, {
    isCompleted: nextDone,
    progressPercent: nextDone ? 100 : item.progressPercent,
  });
}

export async function deleteWacanaItem(roomId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "wishlist", itemId));
}

export function subscribeToWacana(
  roomId: string,
  onUpdate: (items: WacanaItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "wishlist"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as WacanaItem));
  });
}

// ==========================================
// PATUNGAN / MULTI-USER SPLIT BILL (2-6 USERS)
// ==========================================
export async function createBestieExpense(
  roomId: string,
  author: BestieCurrentUser,
  input: CreateBestieExpenseInput
): Promise<void> {
  const ref = doc(collection(db, "rooms", roomId, "expenses"));
  const exp: BestieExpense = {
    id: ref.id,
    title: input.title.trim(),
    amount: Math.round(Number(input.amount)),
    category: input.category,
    date: input.date,
    payerId: input.payerId,
    payerName: input.payerName,
    splitType: input.splitType,
    participantIds: input.participantIds,
    customShares: input.splitType === "custom" ? input.customShares : undefined,
    isSettled: false,
    notes: input.notes?.trim() || undefined,
    createdAt: Date.now(),
    createdBy: author.id,
  };

  await setDoc(ref, removeUndefinedFields(exp));
}

export async function toggleBestieExpenseSettled(
  roomId: string,
  expenseId: string,
  isSettled: boolean
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "expenses", expenseId);
  await updateDoc(ref, {
    isSettled,
    settledAt: isSettled ? Date.now() : null,
  });
}

export async function settleAllBestieExpenses(
  roomId: string,
  expenses: BestieExpense[]
): Promise<void> {
  const now = Date.now();
  await Promise.all(
    expenses
      .filter((e) => !e.isSettled)
      .map((e) =>
        updateDoc(doc(db, "rooms", roomId, "expenses", e.id), {
          isSettled: true,
          settledAt: now,
        })
      )
  );
}

export async function deleteBestieExpense(roomId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "expenses", expenseId));
}

export function subscribeToBestieExpenses(
  roomId: string,
  onUpdate: (expenses: BestieExpense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "expenses"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as BestieExpense);
    list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    });
    onUpdate(list);
  });
}

// ==========================================
// HANGOUT PASS (MULTI-USER RSVP TICKETS) & SCHEDULE SYNC
// ==========================================
export async function syncHangoutPassToSchedule(
  roomId: string,
  pass: HangoutPass
): Promise<void> {
  const scheduleDocId = `pass_${pass.id}`;
  const scheduleRef = doc(db, "rooms", roomId, "schedule", scheduleDocId);

  const goingNames = Object.values(pass.rsvps || {})
    .filter((r) => r.choice === "going")
    .map((r) => r.userName);

  const maybeNames = Object.values(pass.rsvps || {})
    .filter((r) => r.choice === "maybe")
    .map((r) => r.userName);

  const rsvpParts: string[] = [];
  if (goingNames.length > 0) {
    rsvpParts.push(`Hadir: ${goingNames.join(", ")}`);
  }
  if (maybeNames.length > 0) {
    rsvpParts.push(`Liat Nanti: ${maybeNames.join(", ")}`);
  }

  const descParts = [
    pass.description?.trim(),
    rsvpParts.length > 0 ? rsvpParts.join(" | ") : `Diajak oleh ${pass.senderName}`,
  ].filter(Boolean);

  const scheduleEvent: BestieScheduleEvent = {
    id: scheduleDocId,
    title: `Hangout: ${pass.title}`,
    date: pass.date,
    time: pass.time || undefined,
    location: pass.location || undefined,
    category: "hangout",
    description: descParts.join(" — "),
    createdBy: pass.senderId,
    createdByName: pass.senderName,
    createdAt: pass.createdAt || Date.now(),
    hangoutPassId: pass.id,
    attendeeNames: goingNames,
  };

  await setDoc(scheduleRef, removeUndefinedFields(scheduleEvent), { merge: true });
}

export async function createHangoutPass(
  roomId: string,
  sender: BestieCurrentUser,
  input: CreateHangoutPassInput
): Promise<void> {
  const ref = doc(collection(db, "rooms", roomId, "date_invites"));
  const pass: HangoutPass = {
    id: ref.id,
    senderId: sender.id,
    senderName: sender.name,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    date: input.date,
    time: input.time || undefined,
    location: input.location?.trim() || undefined,
    rsvps: {
      [sender.id]: {
        userId: sender.id,
        userName: sender.name,
        choice: "going",
        updatedAt: Date.now(),
      },
    },
    createdAt: Date.now(),
  };

  await setDoc(ref, removeUndefinedFields(pass));
  await syncHangoutPassToSchedule(roomId, pass);
}

export async function respondToHangoutPass(
  roomId: string,
  pass: HangoutPass,
  user: BestieCurrentUser,
  choice: RsvpChoice
): Promise<void> {
  const ref = doc(db, "rooms", roomId, "date_invites", pass.id);
  const nextRsvps = {
    ...(pass.rsvps || {}),
    [user.id]: {
      userId: user.id,
      userName: user.name,
      choice,
      updatedAt: Date.now(),
    },
  };
  await updateDoc(ref, { rsvps: nextRsvps });

  const updatedPass: HangoutPass = {
    ...pass,
    rsvps: nextRsvps,
  };
  await syncHangoutPassToSchedule(roomId, updatedPass);
}

export function subscribeToHangoutPasses(
  roomId: string,
  onUpdate: (passes: HangoutPass[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "date_invites"),
    orderBy("createdAt", "desc"),
    limit(15)
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as HangoutPass));
  });
}

// ==========================================
// BESTIE SCHEDULE / KALENDER CIRCLE
// ==========================================
export async function createBestieScheduleEvent(
  roomId: string,
  author: BestieCurrentUser,
  input: CreateBestieScheduleInput
): Promise<void> {
  const ref = doc(collection(db, "rooms", roomId, "schedule"));
  const event: BestieScheduleEvent = {
    id: ref.id,
    title: input.title.trim(),
    date: input.date,
    time: input.time || undefined,
    location: input.location?.trim() || undefined,
    category: input.category,
    description: input.description?.trim() || undefined,
    createdBy: author.id,
    createdByName: author.name,
    createdAt: Date.now(),
    hangoutPassId: input.hangoutPassId || undefined,
    attendeeNames: input.attendeeNames || undefined,
  };

  await setDoc(ref, removeUndefinedFields(event));
}

export async function deleteBestieScheduleEvent(
  roomId: string,
  eventId: string
): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "schedule", eventId));
}

export function subscribeToBestieSchedule(
  roomId: string,
  onUpdate: (events: BestieScheduleEvent[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "schedule"),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as BestieScheduleEvent);
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "23:59").localeCompare(b.time || "23:59");
    });
    onUpdate(list);
  });
}

// ==========================================
// BESTIE MAP PINS
// ==========================================
export async function createBestiePin(
  roomId: string,
  author: BestieCurrentUser,
  input: CreateBestiePinInput
): Promise<void> {
  const ref = doc(collection(db, "rooms", roomId, "pins"));
  const pin: BestiePin = {
    id: ref.id,
    authorId: author.id,
    authorName: author.name,
    title: input.title.trim(),
    caption: input.caption.trim(),
    category: input.category,
    lat: input.lat,
    lng: input.lng,
    locationName: input.locationName?.trim() || undefined,
    images: input.images || [],
    date: input.date,
    createdAt: Date.now(),
  };

  await setDoc(ref, removeUndefinedFields(pin));
}

export async function deleteBestiePin(roomId: string, pinId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "pins", pinId));
}

export function subscribeToBestiePins(
  roomId: string,
  onUpdate: (pins: BestiePin[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", roomId, "pins"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as BestiePin));
  });
}
