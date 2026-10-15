import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Room, RoomMember, CurrentUser } from "@/types/room";
import { UserPresence } from "@/types/presence";

interface RoomState {
  room: Room | null;
  currentUser: CurrentUser | null;
  presenceMap: Record<string, UserPresence>;
  isHydrated: boolean;
  setRoom: (room: Room | null) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  setPresenceMap: (presenceMap: Record<string, UserPresence>) => void;
  updateMembers: (members: RoomMember[]) => void;
  leaveRoom: () => void;
  setHydrated: (state: boolean) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      room: null,
      currentUser: null,
      presenceMap: {},
      isHydrated: false,
      setRoom: (room) => set({ room }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      setPresenceMap: (presenceMap) => set({ presenceMap }),
      updateMembers: (members) => {
        const currentRoom = get().room;
        if (currentRoom) {
          set({ room: { ...currentRoom, members } });
        }
      },
      leaveRoom: () => set({ room: null, currentUser: null, presenceMap: {} }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: "us-room-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        room: state.room,
        currentUser: state.currentUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
