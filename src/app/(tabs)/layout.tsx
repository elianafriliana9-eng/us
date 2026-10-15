"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoomStore } from "@/stores/roomStore";
import { subscribeToRoom } from "@/lib/services/roomService";
import { TopHeader } from "@/components/layout/top-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { toast } from "sonner";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { room, isHydrated, setRoom } = useRoomStore();

  useEffect(() => {
    if (!isHydrated) return;

    const state = useRoomStore.getState();
    if (!state.room || !state.currentUser) {
      router.replace("/");
      return;
    }

    const roomId = state.room.id;
    const currentUserId = state.currentUser.id;

    // Subscribe to real-time room updates
    const unsubscribe = subscribeToRoom(roomId, (updatedRoom) => {
      const currentRoom = useRoomStore.getState().room;
      const previousMemberCount = currentRoom?.members.length || 0;
      const newMemberCount = updatedRoom.members.length;

      if (previousMemberCount === 1 && newMemberCount === 2) {
        const partner = updatedRoom.members.find((m) => m.id !== currentUserId);
        toast.success(`Hore! ${partner?.name || "Pasanganmu"} baru saja bergabung! 💕`);
      }

      setRoom(updatedRoom);
    });

    return () => unsubscribe();
  }, [isHydrated, router, setRoom]);

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
