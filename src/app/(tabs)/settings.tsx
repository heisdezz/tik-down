import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import tw from '@/lib/tw';
import { useDownloadsStore } from '@/store/downloads';
import { useSettingsStore, parseDownloadDirLabel } from '@/store/settings';
import { FolderPickerModal } from '@/components/folder-picker-modal';
import { Colors, Spacing } from '@/constants/theme';

function SettingRow({
  label,
  value,
  onPress,
  destructive,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.rowLabel, { color: destructive ? '#E97B8E' : colors.text }]}>{label}</Text>
      {value != null && (
        <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {onPress && (
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [cacheSize, setCacheSize] = useState<string>('Calculating…');

  const items = useDownloadsStore((s) => s.items);
  const removeDownload = useDownloadsStore((s) => s.removeDownload);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const { downloadDirUri, pickDownloadDir, resetDownloadDir } = useSettingsStore();

  const downloadDirLabel = parseDownloadDirLabel(downloadDirUri);

  const calcCacheSize = useCallback(async () => {
    try {
      const dir = useSettingsStore.getState().getDownloadDir();
      if (dir.startsWith('content://')) {
        setCacheSize('N/A (external folder)');
        return;
      }
      const info = await FileSystem.getInfoAsync(dir, { size: true });
      if (!info.exists) { setCacheSize('0 MB'); return; }
      const bytes = (info as { size: number }).size ?? 0;
      setCacheSize(`${(bytes / 1024 / 1024).toFixed(1)} MB`);
    } catch {
      setCacheSize('Unknown');
    }
  }, []);

  useEffect(() => { calcCacheSize(); }, [calcCacheSize]);

  function handleChangeDownloadDir() {
    setShowFolderModal(true);
  }

  function clearDownloads() {
    Alert.alert(
      'Clear All Downloads',
      'This will remove all download history and delete cached files.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            for (const item of items) await removeDownload(item.id);
            const dir = useSettingsStore.getState().getDownloadDir();
            if (!dir.startsWith('content://')) {
              await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
            }
            setCacheSize('0 MB');
          },
        },
      ],
    );
  }

  const doneCount = items.filter((i) => i.status === 'done').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={tw`px-4 pt-2 pb-3`}>
        <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={tw`px-4 gap-6`}>
        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STATISTICS</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundElement }]}>
            <SettingRow label="Total downloads" value={String(items.length)} />
            <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
            <SettingRow label="Completed" value={String(doneCount)} />
            <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
            <SettingRow label="Failed" value={String(failedCount)} />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STORAGE</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundElement }]}>
            <SettingRow
              label="Download location"
              value={downloadDirLabel}
              onPress={handleChangeDownloadDir}
            />
            <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
            <SettingRow label="Cache size" value={cacheSize} />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DANGER ZONE</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundElement }]}>
            <SettingRow label="Clear all downloads" onPress={clearDownloads} destructive />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ABOUT</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundElement }]}>
            <SettingRow label="TikDown" value="1.0.0" />
            <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
            <SettingRow label="Backend" value="tik-down-backend.vercel.app" />
          </View>
        </View>
      </View>

      <FolderPickerModal
        visible={showFolderModal}
        onAppDocuments={async () => {
          setShowFolderModal(false);
          await resetDownloadDir();
          calcCacheSize();
        }}
        onChooseFolder={async () => {
          setShowFolderModal(false);
          await pickDownloadDir();
          calcCacheSize();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingLeft: 4 },
  group: { borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: Spacing.two,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 13, maxWidth: 160 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
});
