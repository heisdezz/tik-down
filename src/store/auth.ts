import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "@/lib/mmkv";
import { AuthStore, TikTokSession } from "@/types/auth";
import Logger from "@/lib/logger";

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tiktok: null,

      setTikTokSession: (session) => {
        Logger.info("TikTok session updated", {
          hasCookies: !!session?.cookies,
          username: session?.username
        });
        set({ tiktok: session });
      },

      clearSession: () => {
        Logger.info("Clearing TikTok session");
        set({ tiktok: null });
      },
    }),
    {
      name: "tik-down-auth",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
