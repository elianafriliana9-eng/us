"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBestieStore } from "@/stores/bestieStore";
import {
  removeBestieMemberSlot,
  updateBestieMemberBirthday,
  subscribeToBestieExpenses,
  subscribeToBestiePosts,
  subscribeToBestieStatuses,
} from "@/lib/services/bestieService";
import {
  BestieExpense,
  BestiePost,
  BestieStatusEntry,
  getMemberColor,
  MAX_BESTIE_MEMBERS,
} from "@/types/bestie";
import { formatRupiah } from "@/lib/utils";
import {
  Users,
  Copy,
  Check,
  UserMinus,
  CalendarDays,
  Ticket,
  LogOut,
  Images,
  Award,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";

export default function BestieCirclePage() {
  const router = useRouter();
  const { room, currentUser, leaveRoom } = useBestieStore();

  const [copied, setCopied] = useState(false);
  const [expenses, setExpenses] = useState<BestieExpense[]>([]);
  const [posts, setPosts] = useState<BestiePost[]>([]);
  const [statuses, setStatuses] = useState<BestieStatusEntry[]>([]);

  // Edit Birthday Modal
  const [isBdayModalOpen, setIsBdayModalOpen] = useState(false);
  const [bdayInput, setBdayInput] = useState("");

  useEffect(() => {
    if (!room?.id) return;
    const u1 = subscribeToBestieExpenses(room.id, setExpenses);
    const u2 = subscribeToBestiePosts(room.id, setPosts);
    const u3 = subscribeToBestieStatuses(room.id, setStatuses);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [room?.id]);

  // Compute data-driven Squad Insights
  const insights = useMemo(() => {
    const members = room?.members || [];
    if (members.length === 0) return null;

    const paidMap: Record<string, number> = {};
    const postMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    expenses.forEach((e) => {
      if (e.category === "settlement") return;
      paidMap[e.payerId] = (paidMap[e.payerId] || 0) + e.amount;
    });
    posts.forEach((p) => {
      postMap[p.authorId] = (postMap[p.authorId] || 0) + 1;
    });
    statuses.forEach((s) => {
      statusMap[s.userId] = (statusMap[s.userId] || 0) + 1;
    });

    const topPayer = [...members].sort(
      (a, b) => (paidMap[b.id] || 0) - (paidMap[a.id] || 0)
    )[0];
    const topArchivist = [...members].sort(
      (a, b) => (postMap[b.id] || 0) - (postMap[a.id] || 0)
    )[0];
    const topActive = [...members].sort(
      (a, b) => (statusMap[b.id] || 0) - (statusMap[a.id] || 0)
    )[0];

    return {
      topPayer: {
        name: topPayer.name,
        val: formatRupiah(paidMap[topPayer.id] || 0),
      },
      topArchivist: {
        name: topArchivist.name,
        val: `${postMap[topArchivist.id] || 0} cerita`,
      },
      topActive: {
        name: topActive.name,
        val: `${statusMap[topActive.id] || 0} check-in`,
      },
    };
  }, [room?.members, expenses, posts, statuses]);

  if (!room || !currentUser) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success("Kode Circle berhasil disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  const handleRemoveSlot = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Kosongkan slot anggota "${memberName}"? Gunakan ini jika akun duplikat atau ingin mengganti anggota.`
      )
    )
      return;
    try {
      await removeBestieMemberSlot(room.id, memberId);
      toast.success(`Slot ${memberName} berhasil dikosongkan`);
    } catch {
      toast.error("Gagal menghapus slot anggota");
    }
  };

  const handleSaveBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBestieMemberBirthday(room.id, currentUser.id, bdayInput);
      setIsBdayModalOpen(false);
      toast.success("Tanggal ulang tahun diperbarui & tampil di Kalender Circle");
    } catch {
      toast.error("Gagal menyimpan tanggal ulang tahun");
    }
  };

  const handleLeave = () => {
    if (
      confirm(
        "Keluar dari Circle ini di perangkatmu? Kamu bisa masuk kembali kapan saja dengan kode Circle."
      )
    ) {
      leaveRoom();
      toast.info("Berhasil keluar dari Circle");
      router.replace("/bestie");
    }
  };

  const sixSlots = Array.from({ length: MAX_BESTIE_MEMBERS }, (_, i) => {
    return room.members[i] || null;
  });

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Header & Quick Switch */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display-bestie text-xl font-bold text-[#141619] uppercase flex items-center gap-2">
            <span>Manajemen Circle</span>
            <Users className="w-5 h-5 text-[#2554E8]" />
          </h1>
          <p className="text-xs text-[#525866]">
            Kelola 6 slot anggota, ulang tahun, dan kontribusi grup
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/bestie/schedule"
            className="h-10 px-3 rounded-xl bg-white border border-[#141619] text-xs font-bold flex items-center gap-1.5 shadow-[0_2px_0_#141619]"
          >
            <CalendarDays className="w-4 h-4 text-[#2554E8]" />
            <span>Kalender</span>
          </Link>
          <Link
            href="/bestie/gallery"
            className="h-10 px-3 rounded-xl bg-white border border-[#141619] text-xs font-bold flex items-center gap-1.5 shadow-[0_2px_0_#141619]"
          >
            <Images className="w-4 h-4 text-[#FF6B35]" />
            <span>Foto</span>
          </Link>
        </div>
      </div>

      {/* 1. 6-SLOT SQUAD ROSTER */}
      <div className="bento-card p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6E9DF]">
          <div>
            <span className="font-mono-bestie text-[10px] font-bold uppercase text-[#525866] block">
              ROSTER ANGGOTA ({room.members.length}/{MAX_BESTIE_MEMBERS} SLOT)
            </span>
            <h2 className="font-display-bestie text-base font-bold text-[#141619]">
              {room.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-[#C8F547] border border-[#141619] font-mono-bestie text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>{room.code}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="space-y-2">
          {sixSlots.map((member, idx) => {
            if (!member) {
              return (
                <div
                  key={`empty_slot_${idx}`}
                  className="p-2.5 rounded-xl border border-dashed border-[#D8DDD0] bg-[#F6F7F3] flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-[#525866]">
                    Slot #{idx + 1} Tersedia
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-[11px] font-bold text-[#2554E8] underline cursor-pointer"
                  >
                    Salin Kode Undangan
                  </button>
                </div>
              );
            }

            const token = getMemberColor(member.colorId, idx);
            const isMe = member.id === currentUser.id;
            const canRemove =
              currentUser.role === "host" && !isMe && member.role !== "host";

            return (
              <div
                key={member.id}
                className="p-3 rounded-xl bg-[#F6F7F3] border border-[#D8DDD0] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#141619]"
                    style={{ backgroundColor: token.hex }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#141619] truncate">
                        {member.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-mono-bestie font-bold px-1.5 py-0.5 rounded bg-[#DBE4FF] text-[#2554E8]">
                          KAMU
                        </span>
                      )}
                      <span className="text-[9px] font-mono-bestie uppercase text-[#525866]">
                        • {member.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#525866] mt-0.5">
                      <span>
                        Ultah:{" "}
                        <b className="font-mono-bestie text-[#141619]">
                          {member.birthday || "Belum diatur"}
                        </b>
                      </span>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            setBdayInput(member.birthday || "");
                            setIsBdayModalOpen(true);
                          }}
                          className="text-[#2554E8] font-bold underline cursor-pointer"
                        >
                          Atur Ultah
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(member.id, member.name)}
                    className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Kosongkan slot anggota ini"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>Hapus Slot</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SQUAD INSIGHTS (AUTO-LEADERBOARD) */}
      {insights && (
        <div className="bento-card-subtle p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#2554E8]" />
            <h2 className="font-display-bestie text-xs font-bold text-[#141619] uppercase">
              Squad Insights & Kontribusi
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[#F6F7F3] border border-[#D8DDD0]">
              <span className="font-mono-bestie text-[9px] font-bold uppercase text-[#2554E8] block">
                TOP PAYER
              </span>
              <span className="text-xs font-bold text-[#141619] block truncate mt-0.5">
                {insights.topPayer.name}
              </span>
              <span className="font-mono-bestie text-[10px] text-[#525866]">
                {insights.topPayer.val}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F6F7F3] border border-[#D8DDD0]">
              <span className="font-mono-bestie text-[9px] font-bold uppercase text-[#059669] block">
                TOP ARCHIVIST
              </span>
              <span className="text-xs font-bold text-[#141619] block truncate mt-0.5">
                {insights.topArchivist.name}
              </span>
              <span className="font-mono-bestie text-[10px] text-[#525866]">
                {insights.topArchivist.val}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F6F7F3] border border-[#D8DDD0]">
              <span className="font-mono-bestie text-[9px] font-bold uppercase text-[#FF6B35] block">
                MOST ACTIVE
              </span>
              <span className="text-xs font-bold text-[#141619] block truncate mt-0.5">
                {insights.topActive.name}
              </span>
              <span className="font-mono-bestie text-[10px] text-[#525866]">
                {insights.topActive.val}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. SHORTCUT KE HANGOUT PASS (DI BERANDA) & KALENDER CIRCLE */}
      <div className="bento-card-subtle p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#141619] text-[#C8F547] flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display-bestie text-xs font-bold text-[#141619] uppercase">
              Hangout Pass & Kalender Circle
            </h3>
            <p className="text-[11px] text-[#525866]">
              Tiket ajakan kumpul kini tersedia langsung di Beranda (Basecamp)
            </p>
          </div>
        </div>
        <Link
          href="/bestie/basecamp#hangout-pass"
          className="px-3 py-2 rounded-xl bg-[#2554E8] text-white text-[11px] font-bold shrink-0"
        >
          Buka di Beranda
        </Link>
      </div>

      {/* Switch Mode / Logout Actions */}
      <div className="space-y-2 pt-1">
        <Link
          href="/"
          className="w-full h-11 rounded-xl bg-white border border-[#141619] text-[#141619] text-xs font-bold flex items-center justify-center gap-2"
        >
          <ArrowLeftRight className="w-4 h-4 text-[#2554E8]" />
          <span>Buka Mode Pasangan (Couple Version)</span>
        </Link>

        <button
          type="button"
          onClick={handleLeave}
          className="w-full h-11 rounded-xl bg-white border border-rose-300 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Circle Ini</span>
        </button>
      </div>

      {/* MODAL: EDIT BIRTHDAY */}
      {isBdayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xs bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-sm font-bold text-[#141619]">
                Atur Tanggal Ulang Tahun
              </h3>
              <button
                type="button"
                onClick={() => setIsBdayModalOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBirthday} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono-bestie text-[#525866] block mb-1">
                  Format: BB-HH (Bulan-Hari, contoh: 08-24)
                </label>
                <input
                  value={bdayInput}
                  onChange={(e) => setBdayInput(e.target.value)}
                  placeholder="08-24"
                  maxLength={5}
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl bento-btn-primary text-xs font-bold uppercase cursor-pointer"
              >
                Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
