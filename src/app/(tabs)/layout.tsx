"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoomStore } from "@/stores/roomStore";
import { subscribeToRoom } from "@/lib/services/roomService";
import {
  updatePresence,
  subscribeToRoomPresence,
} from "@/lib/services/presenceService";
import {
  subscribeToHeartNudge,
  nudgeSentAtMs,
} from "@/lib/services/nudgeService";
import { triggerFloatingHearts } from "@/lib/utils";
import { TopHeader } from "@/components/layout/top-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { toast } from "sonner";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { room, isHydrated, setRoom, setPresenceMap } = useRoomStore();

  useEffect(() => {
    if (!isHydrated) return;

    const state = useRoomStore.getState();
    if (!state.room || !state.currentUser) {
      router.replace("/");
      return;
    }

    const roomId = state.room.id;
    const currentUserId = state.currentUser.id;
    const currentUserName = state.currentUser.name;

    // 1. Subscribe to real-time room updates
    const unsubscribeRoom = subscribeToRoom(roomId, (updatedRoom) => {
      const currentRoom = useRoomStore.getState().room;
      const previousMemberCount = currentRoom?.members.length || 0;
      const newMemberCount = updatedRoom.members.length;

      if (previousMemberCount === 1 && newMemberCount === 2) {
        const partner = updatedRoom.members.find((m) => m.id !== currentUserId);
        toast.success(`Hore! ${partner?.name || "Pasanganmu"} baru saja bergabung! 💕`);
      }

      setRoom(updatedRoom);
    });

    // 2. Presence tracking: Online / Offline heartbeat
    const markOnline = () => updatePresence(roomId, currentUserId, currentUserName, true);
    const markOffline = () => updatePresence(roomId, currentUserId, currentUserName, false);

    markOnline();
    const heartbeatTimer = setInterval(markOnline, 35000);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        markOffline();
      } else {
        markOnline();
      }
    };

    const handleBeforeUnload = () => {
      markOffline();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 3. Subscribe to room members' presence
    const unsubscribePresence = subscribeToRoomPresence(roomId, (presenceMap) => {
      setPresenceMap(presenceMap);
    });

    // 4. Subscribe to heart nudges: realtime while app is open, plus replay of
    //    unseen hearts (sent while the app was closed) when the app is opened.
    //    "Seen" marker is persisted in localStorage per room+user.
    const seenKey = `us:heartNudgeSeen:${roomId}:${currentUserId}`;

    let maxSeenAt: number | null = null;
    try {
      const stored = window.localStorage.getItem(seenKey);
      const parsed = stored ? Number(stored) : NaN;
      maxSeenAt = Number.isFinite(parsed) ? parsed : null;
    } catch {
      // storage unavailable — treat as never seen
    }

    // Batch nudges arriving in quick succession (partner tapping repeatedly)
    // into a single burst + toast so the receiver isn't spammed
    type IncomingNudge = { senderName: string; emoji: string; sentAtMs: number };
    const pendingNudges: IncomingNudge[] = [];
    const queuedSentAts = new Set<number>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPendingNudges = () => {
      flushTimer = null;
      if (pendingNudges.length === 0) return;
      const batch = [...pendingNudges];
      pendingNudges.length = 0;
      queuedSentAts.clear();
      const latest = batch[batch.length - 1];

      triggerFloatingHearts(latest.emoji, Math.min(batch.length * 3, 15));
      toast("❤️ Kiriman Cinta!", {
        description:
          batch.length === 1
            ? `${latest.senderName} mengirimkan cinta untukmu! ${latest.emoji}`
            : `${latest.senderName} mengirim ${batch.length} hati untukmu! ${latest.emoji}`,
        duration: 4000,
      });

      if (maxSeenAt === null || latest.sentAtMs > maxSeenAt) {
        maxSeenAt = latest.sentAtMs;
        try {
          window.localStorage.setItem(seenKey, String(maxSeenAt));
        } catch {
          // storage unavailable — hearts may replay next open, harmless
        }
      }
    };

    const queueNudge = (nudge: IncomingNudge) => {
      if (queuedSentAts.has(nudge.sentAtMs)) return;
      queuedSentAts.add(nudge.sentAtMs);
      pendingNudges.push(nudge);
      if (!flushTimer) {
        flushTimer = setTimeout(flushPendingNudges, 600);
      }
    };

    const unsubscribeNudge = subscribeToHeartNudge(roomId, (nudges) => {
      if (!nudges || nudges.length === 0) return;
      nudges.forEach((nudge) => {
        if (nudge.senderId === currentUserId) return;
        const sentAtMs = nudgeSentAtMs(nudge);
        if (sentAtMs === null) return; // latency-compensated echo, not yet confirmed
        if (maxSeenAt !== null && sentAtMs <= maxSeenAt) return; // already seen
        queueNudge({
          senderName: nudge.senderName,
          emoji: nudge.emoji || "💕",
          sentAtMs,
        });
      });
    });

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (flushTimer) clearTimeout(flushTimer);
      markOffline();
      unsubscribeRoom();
      unsubscribePresence();
      unsubscribeNudge();
    };
  }, [isHydrated, router, setRoom, setPresenceMap]);

  if (!isHydrated) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-dvh">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#b80035] border-t-transparent" />
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col min-h-dvh relative bg-[#fff8f5]">
      <TopHeader />
      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto px-4 pt-18 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
