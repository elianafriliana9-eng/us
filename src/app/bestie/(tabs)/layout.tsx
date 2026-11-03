"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBestieStore } from "@/stores/bestieStore";
import {
  subscribeToBestieRoom,
  subscribeToBestiePings,
  resolvePingSentAtMs,
  subscribeToHangoutPasses,
} from "@/lib/services/bestieService";
import {
  updatePresence,
  subscribeToRoomPresence,
} from "@/lib/services/presenceService";
import { HangoutPass } from "@/types/bestie";
import { BestieTopHeader } from "@/components/bestie/top-header";
import { BestieBottomNav } from "@/components/bestie/bottom-nav";
import { HangoutPassPopup } from "@/components/bestie/hangout-pass-popup";
import { toast } from "sonner";

export default function BestieTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { room, currentUser, isHydrated, setRoom, setPresenceMap } =
    useBestieStore();
  const [activePass, setActivePass] = useState<HangoutPass | null>(null);
  const [dismissedPassIds, setDismissedPassIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!isHydrated) return;

    const state = useBestieStore.getState();
    if (!state.room || !state.currentUser) {
      router.replace("/bestie");
      return;
    }

    const roomId = state.room.id;
    const currentUserId = state.currentUser.id;
    const currentUserName = state.currentUser.name;

    // 1. Subscribe to Bestie room updates
    const unsubRoom = subscribeToBestieRoom(roomId, (updatedRoom) => {
      const prevCount = useBestieStore.getState().room?.members.length || 0;
      const nextCount = updatedRoom.members.length;
      if (nextCount > prevCount && prevCount > 0) {
        const newest = updatedRoom.members[updatedRoom.members.length - 1];
        if (newest && newest.id !== currentUserId) {
          toast.success(`${newest.name} bergabung ke Circle`);
        }
      }
      setRoom(updatedRoom);
    });

    // 2. Presence heartbeat
    const markOnline = () =>
      updatePresence(roomId, currentUserId, currentUserName, true);
    const markOffline = () =>
      updatePresence(roomId, currentUserId, currentUserName, false);

    markOnline();
    const heartbeat = setInterval(markOnline, 35000);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") markOffline();
      else markOnline();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", markOffline);

    const unsubPresence = subscribeToRoomPresence(roomId, (map) => {
      setPresenceMap(map);
    });

    // 3. Subscribe to Squad Quick Pings
    const seenKey = `bestie:pingSeen:${roomId}:${currentUserId}`;
    let maxSeenAt: number | null = null;
    try {
      const raw = window.localStorage.getItem(seenKey);
      const parsed = raw ? Number(raw) : NaN;
      maxSeenAt = Number.isFinite(parsed) ? parsed : null;
    } catch {
      maxSeenAt = null;
    }

    const unsubPings = subscribeToBestiePings(roomId, (pings) => {
      if (!pings || pings.length === 0) return;
      pings.forEach((ping) => {
        if (ping.senderId === currentUserId) return;
        const sentAtMs = resolvePingSentAtMs(ping);
        if (sentAtMs === null) return;
        if (maxSeenAt !== null && sentAtMs <= maxSeenAt) return;

        maxSeenAt = sentAtMs;
        try {
          window.localStorage.setItem(seenKey, String(maxSeenAt));
        } catch {}

        toast(`Quick Ping dari ${ping.senderName}`, {
          description: ping.label || "Mengajak kumpul di Basecamp",
          duration: 3500,
        });
      });
    });

    // 4. Subscribe to Hangout Passes (show popup if current user hasn't RSVP'd yet)
    const unsubPasses = subscribeToHangoutPasses(roomId, (passes) => {
      const unanswered = passes.find(
        (p) =>
          p.senderId !== currentUserId &&
          !p.rsvps?.[currentUserId]
      );
      if (unanswered) {
        setActivePass((prev) => {
          if (dismissedPassIds.has(unanswered.id)) return prev;
          return unanswered;
        });
      } else {
        setActivePass(null);
      }
    });

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
      unsubRoom();
      unsubPresence();
      unsubPings();
      unsubPasses();
    };
  }, [isHydrated, router, setRoom, setPresenceMap, dismissedPassIds]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F6F7F3]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2554E8] border-t-transparent" />
      </div>
    );
  }

  if (!room || !currentUser) return null;

  return (
    <div className="flex flex-1 flex-col min-h-dvh relative bg-[#F6F7F3] text-[#141619]">
      <BestieTopHeader />
      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto px-4 pt-20 pb-28">
        {children}
      </main>
      <BestieBottomNav />

      {activePass && (
        <HangoutPassPopup
          pass={activePass}
          roomId={room.id}
          currentUser={currentUser}
          onDismiss={() => {
            setDismissedPassIds((prev) => new Set(prev).add(activePass.id));
            setActivePass(null);
          }}
        />
      )}
    </div>
  );
}
