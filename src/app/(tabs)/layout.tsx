"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRoomStore } from "@/stores/roomStore";
import { subscribeToRoom } from "@/lib/services/roomService";
import {
  updatePresence,
  subscribeToRoomPresence,
} from "@/lib/services/presenceService";
import { subscribeToHeartNudge } from "@/lib/services/nudgeService";
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
  const mountTimeRef = useRef(Date.now());

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

    // 4. Subscribe to real-time heart nudges from partner
    const unsubscribeNudge = subscribeToHeartNudge(roomId, (nudge) => {
      if (nudge && nudge.senderId !== currentUserId && nudge.sentAt > mountTimeRef.current) {
        triggerFloatingHearts(nudge.emoji || "💕", 10);
        toast("❤️ Kiriman Cinta!", {
          description: `${nudge.senderName} baru saja mengirimkan cinta untukmu! ${nudge.emoji}`,
          duration: 4000,
        });
      }
    });

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
