import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BestieRoom, BestieMember, BestieCurrentUser } from "@/types/bestie";
import { UserPresence } from "@/types/presence";

interface BestieRoomState {
  room: BestieRoom | null;
  currentUser: BestieCurrentUser | null;
  presenceMap: Record<string, UserPresence>;
  isHydrated: boolean;
  setRoom: (room: BestieRoom | null) => void;
  setCurrentUser: (user: BestieCurrentUser | null) => void;
  setPresenceMap: (presenceMap: Record<string, UserPresence>) => void;
  updateMembers: (members: BestieMember[]) => void;
  leaveRoom: () => void;
  setHydrated: (state: boolean) => void;
}

export const useBestieStore = create<BestieRoomState>()(
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
      name: "bestie-room-storage",
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
