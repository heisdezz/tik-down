import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDeviceContext } from 'twrnc';

import tw from '@/lib/tw';
import { useDownloadsStore } from '@/store/downloads';
import { useProfilesStore } from '@/store/profiles';
import { useSettingsStore } from '@/store/settings';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FolderPickerModal } from '@/components/folder-picker-modal';
import LogsBottomSheet from '@/components/logs-bottom-sheet';
import GlobalFab from '@/components/global-fab';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useDeviceContext(tw);

  const [showStorageModal, setShowStorageModal] = useState(false);

  const hydrateDownloads = useDownloadsStore((s) => s.hydrate);
  const hydrateProfiles = useProfilesStore((s) => s.hydrate);
  const loadSettings = useSettingsStore((s) => s.load);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const hasAskedStorage = useSettingsStore((s) => s.hasAskedStorage);

  useEffect(() => {
    hydrateDownloads();
    hydrateProfiles();
    loadSettings();
  }, [hydrateDownloads, hydrateProfiles, loadSettings]);

  useEffect(() => {
    if (!settingsLoaded || hasAskedStorage) return;

    if (Platform.OS !== 'android') {
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
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
        <FolderPickerModal
          visible={showStorageModal}
          onAppDocuments={handleAppDocuments}
          onChooseFolder={handleChooseFolder}
        />

        {/* Global logs bottom sheet and floating action button */}
        <LogsBottomSheet />
        <GlobalFab />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
