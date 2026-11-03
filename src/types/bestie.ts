export type MemberColorId =
  | "cobalt"
  | "tangerine"
  | "emerald"
  | "violet"
  | "amber"
  | "berry";

export interface MemberColorToken {
  id: MemberColorId;
  label: string;
  hex: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
}

export const MEMBER_COLORS: MemberColorToken[] = [
  {
    id: "cobalt",
    label: "Cobalt",
    hex: "#2554E8",
    bgHex: "#DBE4FF",
    textHex: "#0B2170",
    borderHex: "#2554E8",
  },
  {
    id: "tangerine",
    label: "Tangerine",
    hex: "#FF6B35",
    bgHex: "#FFE4D6",
    textHex: "#7C2D12",
    borderHex: "#FF6B35",
  },
  {
    id: "emerald",
    label: "Emerald",
    hex: "#059669",
    bgHex: "#D1FAE5",
    textHex: "#064E3B",
    borderHex: "#059669",
  },
  {
    id: "violet",
    label: "Violet",
    hex: "#7C3AED",
    bgHex: "#EDE9FE",
    textHex: "#4C1D95",
    borderHex: "#7C3AED",
  },
  {
    id: "amber",
    label: "Amber",
    hex: "#D97706",
    bgHex: "#FEF3C7",
    textHex: "#78350F",
    borderHex: "#D97706",
  },
  {
    id: "berry",
    label: "Berry",
    hex: "#DB2777",
    bgHex: "#FCE7F3",
    textHex: "#831843",
    borderHex: "#DB2777",
  },
];

export function getMemberColor(colorId?: MemberColorId | string, index: number = 0): MemberColorToken {
  const found = MEMBER_COLORS.find((c) => c.id === colorId);
  if (found) return found;
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export const MAX_BESTIE_MEMBERS = 6;

export interface BestieMember {
  id: string;
  name: string;
  role: "host" | "member";
  colorId: MemberColorId;
  /** Optional birthday in MM-DD format (e.g. "08-24") */
  birthday?: string;
  joinedAt: number;
}

export interface BestieRoom {
  id: string;
  code: string;
  roomType: "bestie";
  name: string;
  maxMembers: number;
  createdAt: number;
  createdBy: string;
  members: BestieMember[];
  circleStartDate?: string; // YYYY-MM-DD
  pickerOptions?: string[];
  lastPickedSpot?: {
    spot: string;
    pickedBy: string;
    pickedAt: number;
  } | null;
}

export interface BestieCurrentUser {
  id: string;
  name: string;
  role: "host" | "member";
  colorId: MemberColorId;
}

export type BestieStatusKey = "ready" | "good" | "chill" | "busy" | "lowbat" | "off";

export interface BestieStatusOption {
  key: BestieStatusKey;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
}

export const BESTIE_STATUS_OPTIONS: BestieStatusOption[] = [
  {
    key: "ready",
    label: "Ready Gas",
    sublabel: "Siap diajak keluar",
    color: "#2554E8",
    bg: "#DBE4FF",
  },
  {
    key: "good",
    label: "Good Vibe",
    sublabel: "Mood lagi bagus",
    color: "#059669",
    bg: "#D1FAE5",
  },
  {
    key: "chill",
    label: "Santai",
    sublabel: "Rebahan / ngopi",
    color: "#0D9488",
    bg: "#CCFBF1",
  },
  {
    key: "busy",
    label: "Sibuk / Lembur",
    sublabel: "Fokus kerjaan dulu",
    color: "#FF6B35",
    bg: "#FFE4D6",
  },
  {
    key: "lowbat",
    label: "Lowbat",
    sublabel: "Butuh istirahat",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  {
    key: "off",
    label: "Do Not Disturb",
    sublabel: "Lagi off dulu",
    color: "#525866",
    bg: "#E6E9DF",
  },
];

export interface BestieStatusEntry {
  id: string;
  userId: string;
  userName: string;
  dateKey: string; // YYYY-MM-DD
  status: BestieStatusKey;
  label: string;
  note?: string | null;
  updatedAt: number;
}

export type BestiePingKey = "hangout" | "gather" | "game" | "urgent";

export interface BestiePing {
  id?: string;
  senderId: string;
  senderName: string;
  pingKey: BestiePingKey;
  label: string;
  sentAt: unknown;
}

export type BestiePostCategory = "photo" | "trip" | "moment" | "note" | "voice";

export interface BestiePost {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  caption: string;
  category: BestiePostCategory;
  location?: string;
  images: string[];
  likedByIds: string[];
  date: string;
  createdAt: number;
  quote?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface CreateBestiePostInput {
  title: string;
  caption: string;
  category: BestiePostCategory;
  location?: string;
  images: string[];
  date: string;
  quote?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface SquadPollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface SquadPoll {
  id: string;
  question: string;
  options: SquadPollOption[];
  createdById: string;
  createdByName: string;
  createdAt: number;
  isActive: boolean;
}

export type WacanaCategory = "trip" | "culinary" | "gift" | "activity";

export interface WacanaItem {
  id: string;
  title: string;
  category: WacanaCategory;
  targetPrice?: number;
  currentSaved: number;
  progressPercent: number;
  /** Map of memberId -> amount contributed */
  contributions: Record<string, number>;
  targetDate?: string;
  notes?: string;
  url?: string;
  imageUrl?: string;
  isCompleted: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface CreateWacanaInput {
  title: string;
  category: WacanaCategory;
  targetPrice?: number;
  initialContribution?: number;
  targetDate?: string;
  notes?: string;
  url?: string;
  imageUrl?: string;
}

export type BestieExpenseCategory =
  | "food"
  | "hangout"
  | "trip"
  | "transport"
  | "gift"
  | "accommodation"
  | "settlement"
  | "other";

export type BestieSplitType = "equal" | "custom" | "treat";

export interface BestieExpense {
  id: string;
  title: string;
  amount: number;
  category: BestieExpenseCategory;
  date: string; // YYYY-MM-DD
  payerId: string;
  payerName: string;
  splitType: BestieSplitType;
  participantIds: string[]; // 1 to 6 member IDs
  customShares?: Record<string, number>; // memberId -> owed amount
  isSettled: boolean;
  settledAt?: number | null;
  notes?: string;
  createdAt: number;
  createdBy: string;
}

export interface CreateBestieExpenseInput {
  title: string;
  amount: number;
  category: BestieExpenseCategory;
  date: string;
  payerId: string;
  payerName: string;
  splitType: BestieSplitType;
  participantIds: string[];
  customShares?: Record<string, number>;
  notes?: string;
}

export interface DebtTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export type RsvpChoice = "going" | "maybe" | "cant";

export interface RsvpRecord {
  userId: string;
  userName: string;
  choice: RsvpChoice;
  updatedAt: number;
}

export interface HangoutPass {
  id: string;
  senderId: string;
  senderName: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  rsvps: Record<string, RsvpRecord>;
  createdAt: number;
}

export interface CreateHangoutPassInput {
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
}

export type BestiePinCategory = "basecamp" | "culinary" | "trip" | "history" | "favorite";

export interface BestiePin {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  caption: string;
  category: BestiePinCategory;
  lat: number;
  lng: number;
  locationName?: string;
  images: string[];
  date: string;
  createdAt: number;
}

export interface CreateBestiePinInput {
  title: string;
  caption: string;
  category: BestiePinCategory;
  lat: number;
  lng: number;
  locationName?: string;
  images: string[];
  date: string;
}

export type BestieScheduleCategory =
  | "hangout"
  | "trip"
  | "birthday"
  | "reminder"
  | "other";

export interface BestieScheduleEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  category: BestieScheduleCategory;
  hangoutPassId?: string;
  attendeeNames?: string[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface CreateBestieScheduleInput {
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  category: BestieScheduleCategory;
  hangoutPassId?: string;
  attendeeNames?: string[];
}

/**
 * Computes simplified pairwise debt transfers across up to 6 members
 * so the group can settle all balances with the minimum number of transfers.
 */
export function simplifyBestieDebts(
  expenses: BestieExpense[],
  members: BestieMember[]
): {
  netBalances: Record<string, number>;
  transfers: DebtTransfer[];
} {
  const netBalances: Record<string, number> = {};
  const nameMap: Record<string, string> = {};

  members.forEach((m) => {
    netBalances[m.id] = 0;
    nameMap[m.id] = m.name;
  });

  expenses.forEach((exp) => {
    if (exp.isSettled) return;
    if (exp.splitType === "treat") return;

    const payerId = exp.payerId;
    if (!nameMap[payerId]) nameMap[payerId] = exp.payerName;
    if (netBalances[payerId] === undefined) netBalances[payerId] = 0;

    const participants =
      exp.participantIds && exp.participantIds.length > 0
        ? exp.participantIds
        : members.map((m) => m.id);

    if (exp.splitType === "equal") {
      if (participants.length === 0) return;
      const share = Math.round(exp.amount / participants.length);
      participants.forEach((pid) => {
        if (pid === payerId) return;
        if (netBalances[pid] === undefined) netBalances[pid] = 0;
        netBalances[payerId] += share;
        netBalances[pid] -= share;
      });
    } else if (exp.splitType === "custom" && exp.customShares) {
      Object.entries(exp.customShares).forEach(([pid, shareVal]) => {
        const share = Math.round(Number(shareVal) || 0);
        if (pid === payerId || share <= 0) return;
        if (netBalances[pid] === undefined) netBalances[pid] = 0;
        netBalances[payerId] += share;
        netBalances[pid] -= share;
      });
    }
  });

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([id, bal]) => {
    const rounded = Math.round(bal);
    if (rounded < -100) {
      debtors.push({ id, amount: -rounded });
    } else if (rounded > 100) {
      creditors.push({ id, amount: rounded });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: nameMap[debtor.id] || "Anggota",
        toId: creditor.id,
        toName: nameMap[creditor.id] || "Anggota",
        amount: settledAmount,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 100) i++;
    if (creditor.amount <= 100) j++;
  }

  return { netBalances, transfers };
}

/**
 * Calculates the next upcoming member birthday (from MM-DD strings).
 */
export function getUpcomingBirthday(
  members: BestieMember[]
): { member: BestieMember; daysUntil: number; formattedDate: string } | null {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let closest: { member: BestieMember; daysUntil: number; formattedDate: string } | null = null;

  for (const m of members) {
    if (!m.birthday || !/^\d{2}-\d{2}$/.test(m.birthday)) continue;
    const [mm, dd] = m.birthday.split("-").map(Number);
    if (!mm || !dd || mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;

    let nextBday = new Date(now.getFullYear(), mm - 1, dd);
    if (nextBday < todayMidnight) {
      nextBday = new Date(now.getFullYear() + 1, mm - 1, dd);
    }

    const diffMs = nextBday.getTime() - todayMidnight.getTime();
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const formattedDate = nextBday.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });

    if (!closest || daysUntil < closest.daysUntil) {
      closest = { member: m, daysUntil, formattedDate };
    }
  }

  return closest;
}
