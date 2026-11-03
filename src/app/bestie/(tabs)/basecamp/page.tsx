"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBestieStore } from "@/stores/bestieStore";
import {
  subscribeToBestiePosts,
  toggleLikeBestiePost,
  createBestiePost,
  subscribeToBestieStatuses,
  setBestieStatus,
  sendBestiePing,
  subscribeToSquadPolls,
  createSquadPoll,
  voteInSquadPoll,
  deleteSquadPoll,
  subscribeToHangoutPasses,
  createHangoutPass,
  respondToHangoutPass,
  updateCircleMetadata,
  getTodayDateKey,
} from "@/lib/services/bestieService";
import {
  BestiePost,
  BestiePostCategory,
  BestieStatusEntry,
  BestieStatusKey,
  BESTIE_STATUS_OPTIONS,
  BestiePingKey,
  SquadPoll,
  HangoutPass,
  RsvpChoice,
  getMemberColor,
  getUpcomingBirthday,
  MAX_BESTIE_MEMBERS,
} from "@/types/bestie";
import { isUserOnline } from "@/lib/services/presenceService";
import { fileToOptimizedDataUrl } from "@/lib/firebase/storage";
import {
  Coffee,
  Users,
  Gamepad2,
  BellRing,
  Cake,
  Calendar,
  CalendarDays,
  Clock,
  Ticket,
  Images,
  Zap,
  Sun,
  Briefcase,
  BatteryLow,
  Moon,
  Plus,
  Shuffle,
  Vote,
  ImagePlus,
  MapPin,
  Quote,
  Heart,
  Trash2,
  X,
  Check,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

function StatusIcon({
  status,
  className = "w-3.5 h-3.5",
}: {
  status?: BestieStatusKey;
  className?: string;
}) {
  switch (status) {
    case "ready":
      return <Zap className={className} />;
    case "good":
      return <Sun className={className} />;
    case "chill":
      return <Coffee className={className} />;
    case "busy":
      return <Briefcase className={className} />;
    case "lowbat":
      return <BatteryLow className={className} />;
    case "off":
      return <Moon className={className} />;
    default:
      return <Zap className={className} />;
  }
}

const DEFAULT_HANGOUT_SPOTS = [
  "Kopi Sore & Roti Bakar",
  "Mie Pedas & Dimsum",
  "Ramen & Sushi",
  "Nasi Padang Bareng",
  "Boardgame Cafe",
  "Masak & Nonton di Basecamp",
];

export default function BestieBasecampPage() {
  const { room, currentUser, presenceMap } = useBestieStore();

  const [posts, setPosts] = useState<BestiePost[]>([]);
  const [statuses, setStatuses] = useState<BestieStatusEntry[]>([]);
  const [polls, setPolls] = useState<SquadPoll[]>([]);
  const [passes, setPasses] = useState<HangoutPass[]>([]);
  const [filter, setFilter] = useState<"all" | BestiePostCategory>("all");

  // Hangout Pass Modal
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passTitle, setPassTitle] = useState("");
  const [passDesc, setPassDesc] = useState("");
  const [passDate, setPassDate] = useState(() => getTodayDateKey());
  const [passTime, setPassTime] = useState("19:00");
  const [passLocation, setPassLocation] = useState("");

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [selectedStatusKey, setSelectedStatusKey] =
    useState<BestieStatusKey>("ready");

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postCategory, setPostCategory] =
    useState<BestiePostCategory>("photo");
  const [postLocation, setPostLocation] = useState("");
  const [postQuote, setPostQuote] = useState("");
  const [postDate, setPostDate] = useState(() => getTodayDateKey());
  const [postImage, setPostImage] = useState<string>("");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionsText, setPollOptionsText] = useState([
    "Sabtu Malam",
    "Minggu Sore",
    "Jumat Pulang Kerja",
  ]);

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(
    room?.circleStartDate || getTodayDateKey()
  );

  // Random Picker state
  const [pickerOptions, setPickerOptions] = useState<string[]>(
    DEFAULT_HANGOUT_SPOTS
  );
  const [newPickerSpot, setNewPickerSpot] = useState("");
  const [pickedSpot, setPickedSpot] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [mountNow] = useState(() => Date.now());

  useEffect(() => {
    if (!room?.id) return;
    const unsubPosts = subscribeToBestiePosts(room.id, setPosts);
    const unsubStatuses = subscribeToBestieStatuses(room.id, setStatuses);
    const unsubPolls = subscribeToSquadPolls(room.id, setPolls);
    const unsubPasses = subscribeToHangoutPasses(room.id, setPasses);
    return () => {
      unsubPosts();
      unsubStatuses();
      unsubPolls();
      unsubPasses();
    };
  }, [room?.id]);

  if (!room || !currentUser) return null;

  const todayKey = getTodayDateKey();
  const todayStatusesByUser: Record<string, BestieStatusEntry> = {};
  statuses.forEach((s) => {
    if (s.dateKey === todayKey) {
      todayStatusesByUser[s.userId] = s;
    }
  });

  const checkedInCount = room.members.filter(
    (m) => !!todayStatusesByUser[m.id]
  ).length;

  // Calculate Circle days
  const startMs = room.circleStartDate
    ? new Date(`${room.circleStartDate}T00:00:00`).getTime()
    : room.createdAt;
  const diffDays = Math.max(
    1,
    Math.floor((mountNow - startMs) / (1000 * 60 * 60 * 24)) + 1
  );

  const upcomingBday = getUpcomingBirthday(room.members);

  const handleQuickPing = async (
    key: BestiePingKey,
    label: string
  ) => {
    try {
      await sendBestiePing(room.id, currentUser, key, label);
      toast.success(`Ping "${label}" dikirim ke semua anggota Circle`);
    } catch {
      toast.error("Gagal mengirim ping");
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const opt =
      BESTIE_STATUS_OPTIONS.find((o) => o.key === selectedStatusKey) ||
      BESTIE_STATUS_OPTIONS[0];
    try {
      await setBestieStatus(room.id, currentUser, opt, statusNote);
      toast.success(`Status hari ini diperbarui: ${opt.label}`);
      setIsStatusModalOpen(false);
    } catch {
      toast.error("Gagal menyimpan status");
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOpts = pollOptionsText.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || validOpts.length < 2) {
      toast.error("Pertanyaan dan minimal 2 opsi harus diisi");
      return;
    }
    try {
      await createSquadPoll(room.id, currentUser, pollQuestion, validOpts);
      setPollQuestion("");
      setIsPollModalOpen(false);
      toast.success("Polling berhasil dibuat");
    } catch {
      toast.error("Gagal membuat polling");
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToOptimizedDataUrl(file, 900, 0.72);
      setPostImage(base64);
    } catch {
      toast.error("Gagal memproses gambar");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postCaption.trim()) {
      toast.error("Judul dan cerita wajib diisi");
      return;
    }
    setIsSubmittingPost(true);
    try {
      await createBestiePost(room.id, currentUser, {
        title: postTitle,
        caption: postCaption,
        category: postCategory,
        location: postLocation,
        quote: postQuote,
        date: postDate,
        images: postImage ? [postImage] : [],
      });
      setPostTitle("");
      setPostCaption("");
      setPostLocation("");
      setPostQuote("");
      setPostImage("");
      setIsPostModalOpen(false);
      toast.success("Cerita berhasil disimpan ke Timeline Circle");
    } catch {
      toast.error("Gagal menyimpan cerita");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const activePickerOptions =
    room.pickerOptions !== undefined ? room.pickerOptions : pickerOptions;
  const displayedPickedSpot =
    pickedSpot || room.lastPickedSpot?.spot || null;

  const syncPickerOptions = async (nextOptions: string[]) => {
    setPickerOptions(nextOptions);
    try {
      await updateCircleMetadata(room.id, { pickerOptions: nextOptions });
    } catch {
      // Fallback to local state if offline
    }
  };

  const handleAddPickerOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawParts = newPickerSpot
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawParts.length === 0) {
      toast.error("Ketik nama tempat atau makanan terlebih dahulu");
      return;
    }

    const nextList = [...activePickerOptions];
    let addedCount = 0;
    rawParts.forEach((item) => {
      const exists = nextList.some(
        (existing) => existing.toLowerCase() === item.toLowerCase()
      );
      if (!exists) {
        nextList.push(item);
        addedCount++;
      }
    });

    if (addedCount === 0) {
      toast.error("Opsi tersebut sudah ada di dalam daftar");
      return;
    }

    setNewPickerSpot("");
    await syncPickerOptions(nextList);
    toast.success(`${addedCount} opsi kandidat berhasil ditambahkan`);
  };

  const handleRemovePickerOption = async (optToRemove: string) => {
    const nextList = activePickerOptions.filter((o) => o !== optToRemove);
    if (pickedSpot === optToRemove) setPickedSpot(null);
    await syncPickerOptions(nextList);
  };

  const handleClearPickerOptions = async () => {
    setPickedSpot(null);
    await updateCircleMetadata(room.id, {
      pickerOptions: [],
      lastPickedSpot: null,
    });
    setPickerOptions([]);
    toast.info("Daftar opsi dikosongkan. Silakan masukkan opsi baru.");
  };

  const handleResetDefaultPickerOptions = async () => {
    setPickedSpot(null);
    await syncPickerOptions(DEFAULT_HANGOUT_SPOTS);
    toast.success("Daftar opsi dikembalikan ke rekomendasi awal");
  };

  const handleSpinSpot = () => {
    if (isSpinning) return;
    if (activePickerOptions.length < 2) {
      toast.error("Tambahkan minimal 2 opsi tempat/makanan untuk diacak");
      return;
    }
    setIsSpinning(true);
    let ticks = 0;
    let finalChoice = activePickerOptions[0];
    const timer = setInterval(() => {
      const idx = Math.floor(Math.random() * activePickerOptions.length);
      finalChoice = activePickerOptions[idx];
      setPickedSpot(finalChoice);
      ticks++;
      if (ticks >= 16) {
        clearInterval(timer);
        setIsSpinning(false);
        void updateCircleMetadata(room.id, {
          lastPickedSpot: {
            spot: finalChoice,
            pickedBy: currentUser.name,
            pickedAt: Date.now(),
          },
        });
      }
    }, 85);
  };

  const handleSaveStartDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCircleMetadata(room.id, {
        circleStartDate: customStartDate,
      });
      setIsDateModalOpen(false);
      toast.success("Tanggal terbentuknya Circle diperbarui");
    } catch {
      toast.error("Gagal memperbarui tanggal");
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passTitle.trim()) return;
    try {
      await createHangoutPass(room.id, currentUser, {
        title: passTitle,
        description: passDesc,
        date: passDate,
        time: passTime,
        location: passLocation,
      });
      setPassTitle("");
      setPassDesc("");
      setPassLocation("");
      setIsPassModalOpen(false);
      toast.success(
        "Tiket Hangout Pass dikirim & otomatis masuk ke Kalender Circle"
      );
    } catch {
      toast.error("Gagal mengirim tiket Hangout Pass");
    }
  };

  const filteredPosts = posts.filter((p) =>
    filter === "all" ? true : p.category === filter
  );

  // Build 6-slot array (actual members + empty slots up to 6)
  const sixSlots = Array.from({ length: MAX_BESTIE_MEMBERS }, (_, idx) => {
    return room.members[idx] || null;
  });

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* 1. SQUAD HERO CARD */}
      <div className="bento-card p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-mono-bestie text-[10px] font-bold uppercase tracking-wider text-[#525866] block">
              SQUAD CIRCLE • {room.members.length}/{MAX_BESTIE_MEMBERS} ANGGOTA
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display-bestie text-4xl font-bold text-[#141619] leading-none">
                {diffDays}
              </span>
              <span className="font-display-bestie text-sm font-bold text-[#2554E8] uppercase">
                Hari Solid
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDateModalOpen(true)}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#525866] hover:text-[#141619] underline cursor-pointer"
            >
              <Calendar className="w-3 h-3" />
              <span>
                Sejak {room.circleStartDate || "Circle dibuat"} (Ubah)
              </span>
            </button>
          </div>

          {/* Right: Birthday Radar or Member Stack */}
          <div className="flex flex-col items-end gap-2">
            {upcomingBday && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFE4D6] border border-[#FF6B35] text-[#7C2D12] text-[10px] font-bold">
                <Cake className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>
                  {upcomingBday.daysUntil === 0
                    ? `Hari Ini Ultah ${upcomingBday.member.name}`
                    : `Ultah ${upcomingBday.member.name}: ${upcomingBday.daysUntil} hari`}
                </span>
              </div>
            )}

            <div className="flex items-center -space-x-1.5">
              {room.members.map((m, idx) => {
                const token = getMemberColor(m.colorId, idx);
                const online =
                  m.id === currentUser.id || isUserOnline(presenceMap[m.id]);
                return (
                  <div
                    key={m.id}
                    className="relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                    style={{ backgroundColor: token.hex }}
                    title={m.name}
                  >
                    {m.name.charAt(0).toUpperCase()}
                    {online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 Vector Quick Pings */}
        <div className="pt-1 border-t border-[#E6E9DF] space-y-1.5">
          <span className="font-mono-bestie text-[10px] font-bold uppercase text-[#525866] block">
            QUICK PING KE SEMUA ANGGOTA
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              {
                key: "hangout" as BestiePingKey,
                label: "Nongkrong",
                msg: "Ayo nongkrong sore/malam ini",
                icon: Coffee,
                primary: true,
              },
              {
                key: "gather" as BestiePingKey,
                label: "Kumpul",
                msg: "Kumpul di basecamp sekarang",
                icon: Users,
                primary: false,
              },
              {
                key: "game" as BestiePingKey,
                label: "Mabar",
                msg: "Login mabar sekarang",
                icon: Gamepad2,
                primary: false,
              },
              {
                key: "urgent" as BestiePingKey,
                label: "Penting",
                msg: "Ada info penting di Circle",
                icon: BellRing,
                accent: true,
              },
            ].map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => handleQuickPing(btn.key, btn.msg)}
                  className={`py-2 px-1.5 rounded-xl border border-[#141619] text-[10px] font-bold flex flex-col items-center justify-center gap-1 active:translate-y-0.5 transition-all cursor-pointer ${
                    btn.primary
                      ? "bg-[#2554E8] text-white"
                      : btn.accent
                      ? "bg-[#C8F547] text-[#141619]"
                      : "bg-[#EFF1EA] text-[#141619] hover:bg-[#E6E9DF]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1.5 QUICK MENU BAR (AKSES CEPAT: KALENDER, HANGOUT PASS, GALERI, VOTING, CERITA) */}
      <div className="grid grid-cols-5 gap-2">
        <Link
          href="/bestie/schedule"
          className="bento-card-subtle p-2.5 flex flex-col items-center justify-center gap-1.5 text-center hover:border-[#2554E8] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] border border-[#2554E8]/30 text-[#2554E8] flex items-center justify-center">
            <CalendarDays className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#141619] leading-tight">
            Kalender
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsPassModalOpen(true)}
          className="bento-card-subtle p-2.5 flex flex-col items-center justify-center gap-1.5 text-center hover:border-[#2554E8] transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-[#141619] text-[#C8F547] flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#141619] leading-tight">
            Hangout Pass
          </span>
        </button>

        <Link
          href="/bestie/gallery"
          className="bento-card-subtle p-2.5 flex flex-col items-center justify-center gap-1.5 text-center hover:border-[#2554E8] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FFF3EE] border border-[#FF6B35]/30 text-[#FF6B35] flex items-center justify-center">
            <Images className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#141619] leading-tight">
            Brankas Foto
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsPollModalOpen(true)}
          className="bento-card-subtle p-2.5 flex flex-col items-center justify-center gap-1.5 text-center hover:border-[#2554E8] transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 text-[#047857] flex items-center justify-center">
            <Vote className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#141619] leading-tight">
            Buat Voting
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsPostModalOpen(true)}
          className="bento-card-subtle p-2.5 flex flex-col items-center justify-center gap-1.5 text-center hover:border-[#2554E8] transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-[#C8F547] border border-[#141619] text-[#141619] flex items-center justify-center">
            <ImagePlus className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#141619] leading-tight">
            Tulis Cerita
          </span>
        </button>
      </div>

      {/* 1.8 HANGOUT PASS (TIKET AJAKAN KUMPUL — TERINTEGRASI KALENDER) */}
      <div id="hangout-pass" className="bento-card-subtle p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#141619] text-[#C8F547] flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display-bestie text-xs font-bold text-[#141619] uppercase">
                Tiket Ajakan Kumpul (Hangout Pass)
              </h2>
              <p className="text-[10px] text-[#525866]">
                Konfirmasi kehadiran 6 anggota & sinkron otomatis ke Kalender Circle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/bestie/schedule"
              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#141619]/20 text-[#141619] text-[10px] font-bold flex items-center gap-1 hover:bg-[#EFF1EA]"
            >
              <CalendarDays className="w-3 h-3 text-[#2554E8]" />
              <span>Kalender</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsPassModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#2554E8] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Buat Tiket</span>
            </button>
          </div>
        </div>

        {passes.length === 0 ? (
          <div className="rounded-xl bg-[#F6F7F3] border border-dashed border-[#D8DDD0] p-4 text-center text-xs text-[#525866]">
            Belum ada tiket ajakan kumpul aktif. Klik &quot;Buat Tiket&quot; untuk
            mengundang semua sahabat dan menjadwalkannya di Kalender Circle.
          </div>
        ) : (
          <div className="space-y-2.5">
            {passes.slice(0, 3).map((pass) => {
              const rsvpValues = Object.values(pass.rsvps || {});
              const goingList = rsvpValues.filter((r) => r.choice === "going");
              const maybeList = rsvpValues.filter((r) => r.choice === "maybe");
              const cantList = rsvpValues.filter((r) => r.choice === "cant");
              const myChoice = pass.rsvps?.[currentUser.id]?.choice;

              return (
                <div
                  key={pass.id}
                  className="rounded-2xl bg-[#141619] text-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-bestie text-[10px] font-bold text-[#C8F547] uppercase">
                          DARI {pass.senderName}
                        </span>
                        <span className="text-[9px] font-mono-bestie px-1.5 py-0.5 rounded bg-[#2554E8] text-white font-bold">
                          SINKRON KALENDER
                        </span>
                      </div>
                      <h3 className="font-display-bestie text-base font-bold text-white mt-0.5">
                        {pass.title}
                      </h3>
                    </div>
                    <span className="font-mono-bestie text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#C8F547] shrink-0">
                      {goingList.length}/{room.members.length} HADIR
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#D8DDD0] font-mono-bestie">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C8F547]" />
                      {pass.date}
                    </span>
                    {pass.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C8F547]" />
                        {pass.time} WIB
                      </span>
                    )}
                    {pass.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
                        {pass.location}
                      </span>
                    )}
                  </div>

                  {/* Who's Going Summary */}
                  <div className="text-[10px] text-[#D8DDD0] space-y-0.5 pt-1 border-t border-white/10">
                    <div>
                      <b className="text-[#C8F547]">
                        Hadir ({goingList.length}):
                      </b>{" "}
                      {goingList.map((r) => r.userName).join(", ") || "-"}
                    </div>
                    {(maybeList.length > 0 || cantList.length > 0) && (
                      <div>
                        <b className="text-amber-300">
                          Liat Nanti ({maybeList.length}):
                        </b>{" "}
                        {maybeList.map((r) => r.userName).join(", ") || "-"} •{" "}
                        <b className="text-rose-400">
                          Absen ({cantList.length}):
                        </b>{" "}
                        {cantList.map((r) => r.userName).join(", ") || "-"}
                      </div>
                    )}
                  </div>

                  {/* Inline RSVP Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {(
                      [
                        { id: "going", label: "Hadir" },
                        { id: "maybe", label: "Liat Nanti" },
                        { id: "cant", label: "Absen" },
                      ] as { id: RsvpChoice; label: string }[]
                    ).map((btn) => {
                      const active = myChoice === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() =>
                            respondToHangoutPass(
                              room.id,
                              pass,
                              currentUser,
                              btn.id
                            )
                          }
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            active
                              ? "bg-[#C8F547] text-[#141619]"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. DAILY STATUS CHECK — 6-SLOT BENTO GRID (3x2) */}
      <div className="bento-card-subtle p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display-bestie text-sm font-bold text-[#141619] uppercase">
              Daily Status Check
            </h2>
            <p className="text-[11px] text-[#525866]">
              Ketuk kartu namamu untuk update status hari ini
            </p>
          </div>
          <span className="font-mono-bestie text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#DBE4FF] text-[#2554E8]">
            {checkedInCount}/{room.members.length} CHECK-IN
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {sixSlots.map((member, idx) => {
            if (!member) {
              return (
                <div
                  key={`empty_${idx}`}
                  className="min-h-[86px] rounded-xl border border-dashed border-[#D8DDD0] bg-[#F6F7F3]/60 p-2.5 flex flex-col items-center justify-center text-center"
                >
                  <UserPlus className="w-4 h-4 text-[#525866]/50 mb-1" />
                  <span className="text-[10px] font-bold text-[#525866]/70">
                    Slot #{idx + 1} Kosong
                  </span>
                </div>
              );
            }

            const isMe = member.id === currentUser.id;
            const entry = todayStatusesByUser[member.id];
            const statusOpt = BESTIE_STATUS_OPTIONS.find(
              (o) => o.key === entry?.status
            );
            const memberColor = getMemberColor(member.colorId, idx);

            return (
              <div
                key={member.id}
                onClick={() => {
                  if (isMe) {
                    setSelectedStatusKey(entry?.status || "ready");
                    setStatusNote(entry?.note || "");
                    setIsStatusModalOpen(true);
                  }
                }}
                role={isMe ? "button" : undefined}
                tabIndex={isMe ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isMe && (e.key === "Enter" || e.key === " ")) {
                    setSelectedStatusKey(entry?.status || "ready");
                    setStatusNote(entry?.note || "");
                    setIsStatusModalOpen(true);
                  }
                }}
                className={`min-h-[86px] rounded-xl p-2.5 flex flex-col justify-between transition-all ${
                  isMe
                    ? "bg-[#F6F7F3] border-2 border-[#2554E8] cursor-pointer active:scale-98"
                    : "bg-[#F6F7F3] border border-[#D8DDD0]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-[#141619] truncate">
                    {member.name}
                    {isMe ? " (Kamu)" : ""}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: memberColor.hex }}
                  />
                </div>

                {entry && statusOpt ? (
                  <div className="my-1">
                    <div
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: statusOpt.bg,
                        color: statusOpt.color,
                      }}
                    >
                      <StatusIcon
                        status={entry.status}
                        className="w-3 h-3 shrink-0"
                      />
                      <span className="truncate">{statusOpt.label}</span>
                    </div>
                    {entry.note && (
                      <p className="text-[9px] text-[#525866] truncate mt-1">
                        {entry.note}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="my-1">
                    <span className="text-[10px] font-semibold text-[#525866]">
                      {isMe ? "+ Pilih Status" : "Belum update"}
                    </span>
                  </div>
                )}

                <span className="text-[8px] font-mono-bestie uppercase text-[#525866]">
                  {isMe ? "KETUK UBAH" : member.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SQUAD POLL & RANDOM SPOT PICKER */}
      <div className="grid grid-cols-1 gap-3">
        {/* Squad Poll Card */}
        <div className="bento-card-subtle p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#DBE4FF] text-[#2554E8] flex items-center justify-center">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display-bestie text-xs font-bold text-[#141619] uppercase">
                  Voting Cepat Circle
                </h3>
                <p className="text-[10px] text-[#525866]">
                  Putuskan jadwal atau tempat tanpa debat panjang
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPollModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[#141619] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Buat Poll</span>
            </button>
          </div>

          {polls.length === 0 ? (
            <div className="rounded-xl bg-[#F6F7F3] border border-dashed border-[#D8DDD0] p-3 text-center text-xs text-[#525866]">
              Belum ada voting aktif. Klik &quot;Buat Poll&quot; untuk memulai.
            </div>
          ) : (
            <div className="space-y-2.5">
              {polls.slice(0, 2).map((poll) => {
                const totalVotes = poll.options.reduce(
                  (sum, o) => sum + (o.voterIds?.length || 0),
                  0
                );
                return (
                  <div
                    key={poll.id}
                    className="rounded-xl bg-[#F6F7F3] border border-[#D8DDD0] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#141619]">
                          {poll.question}
                        </h4>
                        <span className="text-[10px] text-[#525866]">
                          Oleh {poll.createdByName} • {totalVotes} suara
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSquadPoll(room.id, poll.id)}
                        className="text-[#525866] hover:text-rose-600 p-1 cursor-pointer"
                        title="Hapus polling"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {poll.options.map((opt) => {
                        const count = opt.voterIds?.length || 0;
                        const pct =
                          totalVotes > 0
                            ? Math.round((count / totalVotes) * 100)
                            : 0;
                        const votedByMe = (opt.voterIds || []).includes(
                          currentUser.id
                        );
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              voteInSquadPoll(
                                room.id,
                                poll,
                                opt.id,
                                currentUser.id
                              )
                            }
                            className={`w-full relative overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                              votedByMe
                                ? "border-[#2554E8] bg-white font-bold"
                                : "border-[#D8DDD0] bg-white/80 font-medium"
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-[#DBE4FF]/70 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[#141619]">{opt.text}</span>
                              <span className="font-mono-bestie text-[10px] font-bold text-[#2554E8]">
                                {count} suara ({pct}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Random Hangout / Food Picker */}
        <div className="bento-card-subtle p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFE4D6] text-[#FF6B35] flex items-center justify-center shrink-0">
                <Shuffle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display-bestie text-xs font-bold text-[#141619] uppercase">
                    Acak Tempat & Makanan
                  </h3>
                  <span className="font-mono-bestie text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EFF1EA] text-[#141619]">
                    {activePickerOptions.length} OPSI
                  </span>
                </div>
                <p className="text-[10px] text-[#525866]">
                  Buat daftar opsi tempat makan/nongkrong lalu putar acak
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSpinSpot}
              disabled={isSpinning || activePickerOptions.length < 2}
              className={`px-3 py-1.5 rounded-xl border border-[#141619] text-[10px] font-bold uppercase transition-all shrink-0 ${
                activePickerOptions.length < 2
                  ? "bg-[#EFF1EA] text-[#525866] opacity-60 cursor-not-allowed"
                  : "bg-[#C8F547] text-[#141619] shadow-[0_2px_0_#141619] active:translate-y-0.5 cursor-pointer"
              }`}
            >
              {isSpinning ? "Mengacak..." : "Putar Acak"}
            </button>
          </div>

          {/* FORM TAMBAH OPSI BARU */}
          <form onSubmit={handleAddPickerOption} className="flex gap-1.5">
            <input
              type="text"
              value={newPickerSpot}
              onChange={(e) => setNewPickerSpot(e.target.value)}
              placeholder="Ketik opsi (bisa pisah koma: Bakso, Sushi, Kopi)..."
              className="flex-1 h-9 px-3 rounded-xl bg-[#F6F7F3] border border-[#141619]/25 text-xs text-[#141619] focus:outline-none focus:border-[#2554E8]"
            />
            <button
              type="submit"
              className="px-3 h-9 rounded-xl bg-[#2554E8] text-white border border-[#141619] text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Opsi</span>
            </button>
          </form>

          {/* DAFTAR OPSI KANDIDAT (VISIBLE & REMOVABLE CHIPS) */}
          <div className="rounded-xl bg-[#F6F7F3] border border-[#D8DDD0] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-bestie text-[9px] font-bold uppercase text-[#525866]">
                DAFTAR KANDIDAT SAAT INI ({activePickerOptions.length})
              </span>
              <div className="flex items-center gap-2">
                {activePickerOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPickerOptions}
                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetDefaultPickerOptions}
                  className="text-[10px] font-bold text-[#2554E8] hover:underline cursor-pointer"
                >
                  Reset Rekomendasi
                </button>
              </div>
            </div>

            {activePickerOptions.length === 0 ? (
              <p className="text-[11px] text-[#525866] py-2 text-center">
                Belum ada opsi. Ketik minimal 2 nama tempat makan di atas lalu klik{" "}
                <b className="text-[#141619]">+ Tambah Opsi</b>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activePickerOptions.map((opt) => {
                  const isHighlighted = displayedPickedSpot === opt;
                  return (
                    <div
                      key={opt}
                      className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                        isHighlighted
                          ? "bg-[#C8F547] border-[#141619] text-[#141619] font-bold shadow-[1px_1px_0_#141619]"
                          : "bg-white border-[#D8DDD0] text-[#141619]"
                      }`}
                    >
                      <span>{opt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePickerOption(opt)}
                        className="w-4 h-4 rounded flex items-center justify-center text-[#525866] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title={`Hapus opsi ${opt}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HASIL ACAK */}
          {displayedPickedSpot && (
            <div className="p-3 rounded-xl bg-[#141619] text-white flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-mono-bestie uppercase text-[#C8F547] block">
                  HASIL PILIHAN ACAK
                  {room.lastPickedSpot?.pickedBy
                    ? ` • OLEH ${room.lastPickedSpot.pickedBy.toUpperCase()}`
                    : ""}
                </span>
                <span className="font-display-bestie text-sm font-bold block truncate">
                  {displayedPickedSpot}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassTitle(`Makan / Kumpul: ${displayedPickedSpot}`);
                  setPassLocation(displayedPickedSpot);
                  setIsPassModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#C8F547] text-[#141619] text-[10px] font-bold shrink-0 cursor-pointer"
              >
                Jadikan Hangout Pass
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. CIRCLE TIMELINE FILTER & FEED */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: "Semua Arsip" },
          { id: "photo", label: "Foto" },
          { id: "trip", label: "Perjalanan" },
          { id: "moment", label: "Momen" },
          { id: "note", label: "Catatan" },
        ].map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id as "all" | BestiePostCategory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                active
                  ? "bg-[#141619] text-white border-[#141619]"
                  : "bg-white text-[#525866] border-[#D8DDD0]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="font-display-bestie text-base font-bold text-[#141619] uppercase">
            Timeline Circle
          </span>
          <span className="font-mono-bestie text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF1EA] text-[#525866]">
            {posts.length} Entri
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsPostModalOpen(true)}
          className="h-9 px-3.5 rounded-xl bento-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          <span>+ Tambah Cerita</span>
        </button>
      </div>

      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="bento-card-subtle p-6 text-center space-y-2">
            <p className="font-display-bestie text-sm font-bold text-[#141619]">
              Belum ada arsip cerita di Circle ini
            </p>
            <p className="text-xs text-[#525866]">
              Simpan dokumentasi nongkrong, perjalanan, atau catatan pertama
              kalian.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const likedByMe = (post.likedByIds || []).includes(currentUser.id);
            return (
              <div key={post.id} className="bento-card-subtle p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-bestie text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EFF1EA] text-[#141619]">
                    {post.category}
                  </span>
                  <span className="font-mono-bestie text-[10px] text-[#525866]">
                    {post.date}
                  </span>
                </div>

                <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                  {post.title}
                </h3>

                {post.images && post.images.length > 0 && (
                  <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-[#EFF1EA] border border-[#D8DDD0]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    {post.location && (
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-[#141619]/80 text-white flex items-center gap-1 text-[10px] font-semibold">
                        <MapPin className="w-3 h-3" />
                        <span>{post.location}</span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-[#141619] leading-relaxed">
                  {post.caption}
                </p>

                {post.quote && (
                  <div className="px-3 py-2 rounded-lg bg-[#F6F7F3] border-l-2 border-[#2554E8] flex items-center gap-2 text-xs text-[#525866] italic">
                    <Quote className="w-3.5 h-3.5 text-[#2554E8] shrink-0" />
                    <span>&ldquo;{post.quote}&rdquo;</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#EFF1EA] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      toggleLikeBestiePost(room.id, post, currentUser.id)
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      likedByMe
                        ? "bg-[#DBE4FF] border-[#2554E8] text-[#2554E8]"
                        : "bg-[#F6F7F3] border-[#D8DDD0] text-[#525866]"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        likedByMe ? "fill-[#2554E8]" : ""
                      }`}
                    />
                    <span>{(post.likedByIds || []).length}</span>
                  </button>

                  <span className="text-[11px] text-[#525866]">
                    Ditulis oleh <b className="text-[#141619]">{post.authorName}</b>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: UPDATE DAILY STATUS */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Update Status Harianmu
              </h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1 text-[#525866] hover:text-[#141619]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                {BESTIE_STATUS_OPTIONS.map((opt) => {
                  const selected = selectedStatusKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedStatusKey(opt.key)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? "border-2 border-[#141619] bg-[#EFF1EA]"
                          : "border-[#D8DDD0] bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: opt.bg, color: opt.color }}
                        >
                          <StatusIcon status={opt.key} className="w-3 h-3" />
                          <span>{opt.label}</span>
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-[#141619]" />}
                      </div>
                      <p className="text-[10px] text-[#525866] mt-1">
                        {opt.sublabel}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#141619] block">
                  Catatan Singkat (Opsional)
                </label>
                <input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  maxLength={40}
                  placeholder="Contoh: Kosong habis jam 7 malam"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs text-[#141619]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-primary text-xs font-bold uppercase cursor-pointer"
              >
                Simpan Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE POLL */}
      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Buat Voting Cepat
              </h3>
              <button
                type="button"
                onClick={() => setIsPollModalOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#141619] block">
                  Pertanyaan Voting
                </label>
                <input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Contoh: Sabtu ini kumpul di mana?"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#141619] block">
                  Opsi Pilihan
                </label>
                {pollOptionsText.map((val, idx) => (
                  <input
                    key={idx}
                    value={val}
                    onChange={(e) => {
                      const copy = [...pollOptionsText];
                      copy[idx] = e.target.value;
                      setPollOptionsText(copy);
                    }}
                    placeholder={`Opsi ${idx + 1}`}
                    className="w-full h-9 px-3 rounded-lg border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                  />
                ))}
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-lime text-xs font-bold uppercase cursor-pointer"
              >
                Terbitkan Polling
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD TIMELINE STORY */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Tambah Arsip Cerita Circle
              </h3>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) =>
                      setPostCategory(e.target.value as BestiePostCategory)
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-bold"
                  >
                    <option value="photo">Foto</option>
                    <option value="trip">Perjalanan</option>
                    <option value="moment">Momen</option>
                    <option value="note">Catatan</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Judul Momen
                </label>
                <input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Contoh: Roadtrip Bandung Berenam"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Cerita / Catatan
                </label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan cerita momen ini..."
                  className="w-full p-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  placeholder="Lokasi (Opsional)"
                  className="h-9 px-3 rounded-lg border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                />
                <input
                  value={postQuote}
                  onChange={(e) => setPostQuote(e.target.value)}
                  placeholder="Kutipan lucu (Opsional)"
                  className="h-9 px-3 rounded-lg border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Unggah Foto (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="w-full text-xs text-[#525866]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPost}
                className="w-full h-11 rounded-xl bento-btn-primary text-xs font-bold uppercase cursor-pointer"
              >
                {isSubmittingPost ? "Menyimpan..." : "Simpan ke Timeline"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT CIRCLE START DATE */}
      {isDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xs bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-sm font-bold text-[#141619]">
                Tanggal Mulai Circle
              </h3>
              <button
                type="button"
                onClick={() => setIsDateModalOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStartDate} className="space-y-3">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie"
                required
              />
              <button
                type="submit"
                className="w-full h-10 rounded-xl bento-btn-primary text-xs font-bold uppercase cursor-pointer"
              >
                Simpan Tanggal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE HANGOUT PASS */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono-bestie text-[10px] font-bold uppercase text-[#2554E8] block">
                  SINKRON OTOMATIS KE KALENDER
                </span>
                <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                  Buat Tiket Hangout Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePass} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Agenda Kumpul
                </label>
                <input
                  value={passTitle}
                  onChange={(e) => setPassTitle(e.target.value)}
                  placeholder="Contoh: Ngopi Sore & Boardgame"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={passDate}
                    onChange={(e) => setPassDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Jam
                  </label>
                  <input
                    type="time"
                    value={passTime}
                    onChange={(e) => setPassTime(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Lokasi Kumpul
                </label>
                <input
                  value={passLocation}
                  onChange={(e) => setPassLocation(e.target.value)}
                  placeholder="Contoh: Kemang / Basecamp Raka"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Catatan Tambahan
                </label>
                <input
                  value={passDesc}
                  onChange={(e) => setPassDesc(e.target.value)}
                  placeholder="Contoh: Jangan ngaret, parkir di basement"
                  className="w-full h-10 px-3 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-lime text-xs font-bold uppercase cursor-pointer"
              >
                Kirim Tiket & Jadwalkan di Kalender
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
