import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Room, RoomMember, CurrentUser } from "@/types/room";

interface RoomState {
  room: Room | null;
  currentUser: CurrentUser | null;
  isHydrated: boolean;
  setRoom: (room: Room | null) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  updateMembers: (members: RoomMember[]) => void;
  leaveRoom: () => void;
  setHydrated: (state: boolean) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      room: null,
      currentUser: null,
      isHydrated: false,
      setRoom: (room) => set({ room }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      updateMembers: (members) => {
        const currentRoom = get().room;
        if (currentRoom) {
          set({ room: { ...currentRoom, members } });
        }
      },
      leaveRoom: () => set({ room: null, currentUser: null }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: "us-room-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
