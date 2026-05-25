import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useDeviceContext } from "twrnc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import tw from "@/lib/tw";
import { useDownloadsStore } from "@/store/downloads";
import { useProfilesStore } from "@/store/profiles";
import { useSettingsStore } from "@/store/settings";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { FolderPickerModal } from "@/components/folder-picker-modal";
import LogsBottomSheet from "@/components/logs-bottom-sheet";
import GlobalFab from "@/components/global-fab";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useDeviceContext(tw);

  const [showStorageModal, setShowStorageModal] = useState(false);

  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const hasAskedStorage = useSettingsStore((s) => s.hasAskedStorage);

  useEffect(() => {
    if (!settingsLoaded || hasAskedStorage) return;

    if (Platform.OS !== "android") {
      useSettingsStore.getState().resetDownloadDir();
      return;
    }

    setShowStorageModal(true);
  }, [settingsLoaded, hasAskedStorage]);

  async function handleAppDocuments() {
    setShowStorageModal(false);
    await useSettingsStore.getState().resetDownloadDir();
  }

  async function handleChooseFolder() {
    setShowStorageModal(false);
    await useSettingsStore.getState().pickDownloadDir();
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }} />
            <FolderPickerModal
              visible={showStorageModal}
              onClose={() => setShowStorageModal(false)}
              onAppDocuments={handleAppDocuments}
              onChooseFolder={handleChooseFolder}
            />

            {/* Global logs bottom sheet and floating action button */}
            <LogsBottomSheet />
            <GlobalFab />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
