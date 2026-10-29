"use client";

import { useEffect, useState, useRef } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { subscribeToStoryPosts, likeStoryPost } from "@/lib/services/storyService";
import { subscribeToMoods } from "@/lib/services/moodService";
import { AddStoryModal } from "@/components/story/add-story-modal";
import { MoodCard } from "@/components/mood/mood-card";
import { Post, PostCategory } from "@/types/post";
import { MoodEntry } from "@/types/mood";
import {
  Heart,
  Cake,
  ImagePlus,
  Mic,
  MapPin,
  Quote,
  PenLine,
  UserPlus,
  CalendarHeart,
  Sparkles,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { calculateRelationshipStats, triggerFloatingHearts } from "@/lib/utils";
import { isUserOnline, formatLastSeen } from "@/lib/services/presenceService";
import { sendHeartNudge } from "@/lib/services/nudgeService";
import { EditDateModal } from "@/components/story/edit-date-modal";
import { VoiceNoteModal } from "@/components/story/voice-note-modal";
import { AudioPlayer } from "@/components/story/audio-player";
import { CreateInviteModal } from "@/components/date-invite/create-invite-modal";

export default function StoryPage() {
  const { room, currentUser, presenceMap } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);
  const isSolo = !partner || (room?.members.length ?? 0) < 2;

  const partnerPresence = partner ? presenceMap[partner.id] : undefined;
  const partnerOnline = isUserOnline(partnerPresence);

  const [posts, setPosts] = useState<Post[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [filter, setFilter] = useState<"all" | PostCategory>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [heartCount, setHeartCount] = useState(0);

  const spawnAreaRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time posts in this room
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToStoryPosts(room.id, (loadedPosts) => {
      setPosts(loadedPosts);
    });

    return () => unsubscribe();
  }, [room?.id]);

  // Subscribe to real-time daily mood check-ins (both partners)
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToMoods(room.id, (loadedMoods) => {
      setMoods(loadedMoods);
    });

    return () => unsubscribe();
  }, [room?.id]);

  // Days together & anniversary calculation (custom start date or connection date)
  const connectedTimestamp = room?.connectedAt || partner?.joinedAt;
  const stats = calculateRelationshipStats(
    room?.relationshipStartDate,
    connectedTimestamp,
    isSolo
  );
  const diffDays = stats.diffDays;
  const daysUntilNextAnniversary = stats.daysUntilNextAnniversary;
  const connectionDateText = stats.startDateText;

  // Interactive floating hearts micro-interaction & Firestore broadcast to partner
  const handleSendHeart = async () => {
    setHeartCount((prev) => prev + 1);

    const emojis = ["💕", "💖", "❤️", "✨", "🥰", "💌"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // 1. Local animation burst
    triggerFloatingHearts(randomEmoji, 7);

    // 2. Broadcast to partner in real-time
    if (room && currentUser) {
      try {
        await sendHeartNudge(room.id, currentUser, randomEmoji);
        toast.success(`Hati cinta terkirim ke ${partner?.name || "pasangan"}! 💕`, {
          duration: 2000,
        });
      } catch (err) {
        console.error("Gagal mengirim heart nudge:", err);
      }
    }
  };

  const handleLike = async (post: Post) => {
    if (!room) return;
    try {
      await likeStoryPost(room.id, post.id, post.likes || 0);
    } catch {
      toast.error("Gagal menyukai postingan");
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filter === "all") return true;
    return p.category === filter;
  });

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Milestone & Heart Connection Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] border border-rose-100/50">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ffdada]/40 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#ffddb8]/40 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-3">
          {/* Top row: Avatar pairing & live status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                <div className="relative w-10 h-10 rounded-full ring-2 ring-white overflow-hidden shadow-xs bg-[#ffdada] flex items-center justify-center font-bold text-[#b80035] text-sm">
                  {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                </div>

                {!isSolo && partner ? (
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full ring-2 ring-white overflow-hidden shadow-xs bg-[#ffddb8] flex items-center justify-center font-bold text-[#855300] text-sm">
                      {partner.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                    {/* Live presence indicator dot on partner avatar */}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        partnerOnline
                          ? "bg-emerald-500 ring-2 ring-emerald-300 animate-pulse"
                          : "bg-stone-300"
                      }`}
                      title={partnerOnline ? "Online" : formatLastSeen(partnerPresence?.lastSeen)}
                    />
                  </div>
                ) : (
                  <div className="relative w-10 h-10 rounded-full ring-2 ring-white border-2 border-dashed border-[#e5bdbe] bg-[#fff8f5] flex items-center justify-center text-[#5c3f40] text-xs">
                    <UserPlus className="w-4 h-4 text-[#e11d48]" />
                  </div>
                )}

                <div className="w-6 h-6 rounded-full bg-[#e11d48] text-white flex items-center justify-center text-[12px] shadow-xs ml-1">
                  <Heart className="w-3.5 h-3.5 fill-white text-white" />
                </div>
              </div>

              {!isSolo && partner && (
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#1e1b19] leading-tight">
                    {partner.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                      partnerOnline ? "text-emerald-600" : "text-[#5c3f40]/70"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        partnerOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                      }`}
                    />
                    <span>{partnerOnline ? "Online sekarang 💕" : formatLastSeen(partnerPresence?.lastSeen)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Anniversary / Connection Status Tag */}
            {stats.daysUntilNextAnniversary === 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdada] text-[#b80035] animate-bounce shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#b80035]" />
                <span className="text-[11px] font-bold">
                  Hari ini Anniversary! 🎉
                </span>
              </div>
            ) : !isSolo || stats.hasCustomDate ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffddb8]/50 text-[#653e00]">
                <Cake className="w-3.5 h-3.5 text-[#855300]" />
                <span className="text-[11px] font-bold">
                  {daysUntilNextAnniversary} hari lagi
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a]">
                <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-pulse" />
                <span className="text-[11px] font-bold">
                  Menunggu Pasangan
                </span>
              </div>
            )}
          </div>

          {/* Main Counter Display */}
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-[44px] font-extrabold text-[#1e1b19] tracking-tight leading-none">
                {diffDays}
              </span>
              <span className="text-[18px] font-bold text-[#b80035] ml-1.5">
                Hari Bersama
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] text-[#5c3f40] font-normal text-right">
                {stats.hasCustomDate
                  ? connectionDateText
                  : !isSolo
                  ? connectionDateText
                  : "Dihitung saat pasangan memasukkan kode room"}
              </span>
              <button
                onClick={() => setIsDateModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#faf2ee] hover:bg-[#ffdada] text-[#b80035] text-[10px] font-bold border border-[#e5bdbe]/60 active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="Atur tanggal jadian / mulai hubungan"
              >
                <CalendarHeart className="w-3 h-3 text-[#b80035]" />
                <span>{stats.hasCustomDate ? "Ubah Tanggal" : "Atur Tanggal"}</span>
              </button>
            </div>
          </div>

          {/* Quick Intimacy Action: Send a Heart Nudge & Date Invite */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleSendHeart}
              className="flex-1 h-11 px-4 rounded-full bg-[#ffdada] text-[#40000c] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
            >
              <Heart className="w-4 h-4 fill-[#b80035] text-[#b80035]" />
              <span className="text-sm font-semibold">Kirim Hati</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#b80035] text-[11px] shadow-xs font-bold">
                {heartCount > 0 ? `Terkirim ${heartCount}!` : "Tap! 💕"}
              </span>
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="h-11 px-3.5 rounded-full bg-[#faf2ee] hover:bg-[#ffdada] text-[#5c3f40] hover:text-[#b80035] flex items-center justify-center gap-1.5 active:scale-90 transition-all shadow-xs cursor-pointer border border-[#e5bdbe]/40 text-xs font-bold"
              title="Ajak kencan dengan surat cinta"
            >
              <Mail className="w-4 h-4 text-[#e11d48]" />
              <span>Ajak Ngedate</span>
            </button>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="h-11 w-11 rounded-full bg-[#faf2ee] hover:bg-[#ffdada] text-[#5c3f40] hover:text-[#b80035] flex items-center justify-center active:scale-90 transition-all shadow-xs cursor-pointer"
              title="Kirim pesan suara"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Heart Container */}
          <div ref={spawnAreaRef} className="relative w-full h-0 pointer-events-none overflow-visible" />
        </div>
      </div>

      {/* Daily Mood Check-in Ritual */}
      <MoodCard moods={moods} />

      {/* Memory Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: "Semua Cerita" },
          { id: "photo", label: "Foto 📸" },
          { id: "voice", label: "Suara 🎙️" },
          { id: "trip", label: "Liburan ✈️" },
          { id: "milestone", label: "Momen Penting 💍" },
          { id: "daily", label: "Hal Kecil ☕" },
        ].map((chip) => {
          const isSelected = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id as "all" | PostCategory)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-transform active:scale-95 ${
                isSelected
                  ? "bg-[#1e1b19] text-[#fff8f5] shadow-xs"
                  : "bg-[#f4ece8] text-[#1e1b19]"
              }`}
            >
              <span>{chip.label}</span>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48]" />}
            </button>
          );
        })}
      </div>

      {/* Primary Action Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold text-[#1e1b19]">Timeline</span>
          <span className="px-2 py-0.5 rounded-full bg-[#eee7e3] text-[#5c3f40] text-[11px] font-bold">
            {posts.length} kenangan
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-4 rounded-full bg-[#e11d48] text-white flex items-center gap-1.5 shadow-[0_4px_14px_0_rgba(225,29,72,0.3)] active:scale-95 transition-all text-xs font-bold"
        >
          <ImagePlus className="w-4 h-4" />
          <span>+ Tambah Cerita</span>
        </button>
      </div>

      {/* Timeline Feed */}
      <div className="flex flex-col space-y-5 relative pt-1">
        {/* Timeline track line */}
        <div className="absolute left-3.5 top-4 bottom-8 w-0.5 bg-[#e9e1dd] -z-0" />

        {filteredPosts.length === 0 ? (
          /* Empty State */
          <div className="relative z-10 pl-8">
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#eee7e3] text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#ffdada] text-[#b80035] flex items-center justify-center mb-2">
                <Heart className="w-6 h-6 fill-[#b80035]" />
              </div>
              <h3 className="font-bold text-sm text-[#1e1b19]">Belum ada cerita di sini</h3>
              <p className="text-xs text-[#5c3f40] mt-1 max-w-[220px]">
                Klik tombol <b>+ Tambah Cerita</b> di atas untuk menyimpan momen indah pertama kalian!
              </p>
            </div>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="relative z-10 pl-8">
              {/* Timeline Node Marker */}
              <div className="absolute left-1.5 top-5 -translate-x-1/2 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
              </div>

              {/* Memory Card */}
              <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(68,64,60,0.06),0_8px_10px_-6px_rgba(225,29,72,0.04)] flex flex-col space-y-3 border border-rose-100/50">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffddb8]/50 text-[#653e00] text-[11px] font-bold capitalize">
                      {post.category === "photo" && "📸 Foto"}
                      {post.category === "trip" && "✈️ Liburan"}
                      {post.category === "milestone" && "💍 Momen Spesial"}
                      {post.category === "daily" && "☕ Hal Kecil"}
                      {post.category === "voice" && "🎙️ Pesan Suara"}
                    </span>
                    <span className="text-xs text-[#5c3f40]">{post.date}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#1e1b19] leading-snug">
                  {post.title}
                </h3>

                {/* Audio Voice Note module */}
                {post.audioUrl && (
                  <div className="pt-1">
                    <AudioPlayer src={post.audioUrl} duration={post.audioDuration} />
                  </div>
                )}

                {/* Photo module */}
                {post.images && post.images.length > 0 && (
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#f4ece8] shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    {post.location && (
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-[#1e1b19]/70 backdrop-blur-md text-white flex items-center gap-1 text-[11px] font-medium">
                        <MapPin className="w-3 h-3 text-white" />
                        <span>{post.location}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Caption */}
                <p className="text-sm text-[#1e1b19] leading-relaxed">
                  {post.caption}
                </p>

                {/* Quote snippet if present */}
                {post.quote && (
                  <div className="px-3 py-2 rounded-xl bg-[#faf2ee] flex items-center gap-2">
                    <Quote className="w-4 h-4 text-[#b80035] shrink-0" />
                    <span className="text-xs text-[#5c3f40] italic">
                      “{post.quote}”
                    </span>
                  </div>
                )}

                {/* Reaction & Attribution */}
                <div className="pt-1 flex items-center justify-between border-t border-[#faf2ee]">
                  <button
                    onClick={() => handleLike(post)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a] active:scale-95 transition-transform"
                  >
                    <Heart className="w-3.5 h-3.5 fill-[#b80035] text-[#b80035]" />
                    <span className="text-xs font-bold">{post.likes || 0}</span>
                  </button>

                  <span className="text-[11px] text-[#5c3f40]">
                    Oleh <b className="text-[#1e1b19]">{post.authorName}</b>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Intimate Bottom Nudge Prompt */}
      <div className="rounded-3xl bg-[#faf2ee] p-4 text-center flex flex-col items-center space-y-2 mt-2 border border-[#eee7e3]">
        <div className="w-10 h-10 rounded-full bg-[#ffdada] flex items-center justify-center text-[#b80035]">
          <PenLine className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold text-[#1e1b19]">Ingat waktu itu...?</span>
        <p className="text-xs text-[#5c3f40] max-w-xs leading-relaxed">
          Pertanyaan hari ini: Apa lagu pertama yang paling sering kalian dengarkan bersama saat lagi berdua di perjalanan?
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-full bg-white text-[#b80035] text-xs font-bold shadow-xs active:scale-95 transition-all mt-1 border border-rose-100"
        >
          Catat Kenangan Ini
        </button>
      </div>

      {/* Add Memory Modal */}
      <AddStoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Edit Relationship Start Date Modal */}
      {room?.id && (
        <EditDateModal
          isOpen={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          roomId={room.id}
          currentStartDate={room.relationshipStartDate}
        />
      )}

      {/* Voice Note Modal */}
      <VoiceNoteModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Date Invite Modal */}
      <CreateInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
