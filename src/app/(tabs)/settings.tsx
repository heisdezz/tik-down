import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";

import { useRouter } from "expo-router";
import tw from "@/lib/tw";
import { useDownloadsStore } from "@/store/downloads";
import { useSettingsStore, parseDownloadDirLabel } from "@/store/settings";
import { useAuthStore } from "@/store/auth";
import { FolderPickerModal } from "@/components/folder-picker-modal";
import { Colors, Spacing } from "@/constants/theme";

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
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.backgroundElement,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? "#E97B8E" : colors.text },
        ]}
      >
        {label}
      </Text>
      {value != null && (
        <Text
          style={[styles.rowValue, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textSecondary}
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [cacheSize, setCacheSize] = useState<string>("Calculating…");
  const [copiedCookies, setCopiedCookies] = useState(false);
  const sessionSheetRef = useRef<BottomSheetModal>(null);

  const tiktokSession = useAuthStore((s) => s.tiktok);
  const clearTikTokSession = useAuthStore((s) => s.clearSession);

  const items = useDownloadsStore((s) => s.items);
  const removeDownload = useDownloadsStore((s) => s.removeDownload);

  const {
    downloadDirUri,
    showFolderPicker,
    pickDownloadDir,
    resetDownloadDir,
    concurrentDownloads,
    setConcurrentDownloads,
    setShowFolderPicker,
  } = useSettingsStore();

  const downloadDirLabel = parseDownloadDirLabel(downloadDirUri);

  const calcCacheSize = useCallback(async () => {
    try {
      const dir = useSettingsStore.getState().getDownloadDir();
      if (dir.startsWith("content://")) {
        setCacheSize("N/A (external folder)");
        return;
      }
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        setCacheSize("0 MB");
        return;
      }
      const bytes = (info as { size: number }).size ?? 0;
      setCacheSize(`${(bytes / 1024 / 1024).toFixed(1)} MB`);
    } catch {
      setCacheSize("Unknown");
    }
  }, [downloadDirUri]);

  useEffect(() => {
    calcCacheSize();
  }, [calcCacheSize]);

  function handleChangeDownloadDir() {
    setShowFolderPicker(true);
  }

  function handleCycleConcurrent() {
    const next = concurrentDownloads >= 5 ? 1 : concurrentDownloads + 1;
    setConcurrentDownloads(next);
  }

  const renderSessionBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsAtIndex={-1}
        appearsAtIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  async function handleCopyCookies() {
    if (!tiktokSession?.cookies) return;
    await Clipboard.setStringAsync(tiktokSession.cookies);
    setCopiedCookies(true);
    setTimeout(() => setCopiedCookies(false), 2000);
  }

  function clearDownloads() {
    Alert.alert(
      "Clear All Downloads",
      "This will remove all download history and delete cached files.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            for (const item of items) await removeDownload(item.id);
            const dir = useSettingsStore.getState().getDownloadDir();
            if (!dir.startsWith("content://")) {
              await FileSystem.deleteAsync(dir, { idempotent: true }).catch(
                () => {},
              );
            }
            setCacheSize("0 MB");
          },
        },
      ],
    );
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={tw`px-4 pt-2 pb-3`}>
        <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-4 pb-8 gap-6`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            ACCOUNTS
          </Text>
          <View
            style={[
              styles.group,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <SettingRow
              label="TikTok Session"
              value={tiktokSession ? "Logged In" : "Not Logged In"}
              onPress={() => router.push("/auth/tiktok-login")}
            />
            {tiktokSession && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.backgroundSelected },
                  ]}
                />
                <SettingRow
                  label="View Session Details"
                  onPress={() => sessionSheetRef.current?.present()}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.backgroundSelected },
                  ]}
                />
                <SettingRow
                  label="Clear TikTok Session"
                  onPress={clearTikTokSession}
                  destructive
                />
              </>
            )}
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            STATISTICS
          </Text>
          <View
            style={[
              styles.group,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <SettingRow label="Total downloads" value={String(items.length)} />
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.backgroundSelected },
              ]}
            />
            <SettingRow label="Completed" value={String(doneCount)} />
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.backgroundSelected },
              ]}
            />
            <SettingRow label="Failed" value={String(failedCount)} />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            DOWNLOADS
          </Text>
          <View
            style={[
              styles.group,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <SettingRow
              label="Concurrent downloads"
              value={`${concurrentDownloads} videos`}
              onPress={handleCycleConcurrent}
            />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            STORAGE
          </Text>
          <View
            style={[
              styles.group,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <SettingRow
              label="Download location"
              value={downloadDirLabel}
              onPress={handleChangeDownloadDir}
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.backgroundSelected },
              ]}
            />
            <SettingRow label="Cache size" value={cacheSize} />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            DANGER ZONE
          </Text>
          <View
            style={[
              styles.group,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <SettingRow
              label="Clear all downloads"
              onPress={clearDownloads}
              destructive
            />
          </View>
        </View>

        <View style={tw`gap-2`}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
          <View
            style={[
              styles.group,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <SettingRow label="TikDown" value="1.0.0" />
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.backgroundSelected },
              ]}
            />
            <SettingRow label="Backend" value="tik-down-backend.vercel.app" />
          </View>
        </View>
      </ScrollView>

      <FolderPickerModal
        visible={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
        onAppDocuments={async () => {
          setShowFolderPicker(false);
          await resetDownloadDir();
          calcCacheSize();
        }}
        onChooseFolder={async () => {
          setShowFolderPicker(false);
          await pickDownloadDir();
          calcCacheSize();
        }}
      />

      <BottomSheetModal
        ref={sessionSheetRef}
        index={0}
        snapPoints={["60%", "90%"]}
        enablePanDownToClose
        backdropComponent={renderSessionBackdrop}
        handleStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.backgroundSelected }}
        backgroundStyle={{ backgroundColor: colors.background }}
      >
        <BottomSheetView style={styles.sessionHeader}>
          <View
            style={[
              styles.sessionIconWrap,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <Ionicons name="key-outline" size={26} color={colors.primary} />
          </View>
          <Text style={[styles.sessionTitle, { color: colors.text }]}>
            Session Details
          </Text>
        </BottomSheetView>

        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sessionBody,
            { paddingBottom: 40 },
          ]}
        >
          {[
            {
              label: "Username",
              value: tiktokSession?.username ?? "Not captured",
            },
            {
              label: "User ID",
              value: tiktokSession?.userId ?? "Not captured",
            },
            {
              label: "Last updated",
              value: tiktokSession?.updatedAt
                ? new Date(tiktokSession.updatedAt).toLocaleString()
                : "—",
            },
            {
              label: "Expires",
              value: tiktokSession?.expiresAt
                ? new Date(tiktokSession.expiresAt).toLocaleString()
                : "No expiry set",
            },
          ].map(({ label, value }) => (
            <View key={label} style={styles.sessionField}>
              <Text
                style={[styles.sessionFieldLabel, { color: colors.textSecondary }]}
              >
                {label}
              </Text>
              <Text style={[styles.sessionFieldValue, { color: colors.text }]}>
                {value}
              </Text>
            </View>
          ))}

          <View style={styles.sessionField}>
            <View style={styles.sessionCookiesHeader}>
              <Text
                style={[styles.sessionFieldLabel, { color: colors.textSecondary }]}
              >
                Cookies
              </Text>
              <Pressable
                onPress={handleCopyCookies}
                style={({ pressed }) => [
                  styles.copyBtn,
                  { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons
                  name={copiedCookies ? "checkmark" : "copy-outline"}
                  size={13}
                  color={copiedCookies ? "#72C9A3" : colors.primary}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: copiedCookies ? "#72C9A3" : colors.primary },
                  ]}
                >
                  {copiedCookies ? "Copied" : "Copy"}
                </Text>
              </Pressable>
            </View>
            <View
              style={[
                styles.cookiesBox,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <Text
                style={[styles.cookiesText, { color: colors.textSecondary }]}
                selectable
              >
                {tiktokSession?.cookies ?? ""}
              </Text>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  group: { borderRadius: 14, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: Spacing.two,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  rowValue: { fontSize: 13, maxWidth: 160 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  sessionHeader: {
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  sessionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTitle: { fontSize: 18, fontWeight: "700" },
  sessionBody: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  sessionField: { gap: 6 },
  sessionFieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  sessionFieldValue: { fontSize: 14 },
  sessionCookiesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  copyBtnText: { fontSize: 12, fontWeight: "600" },
  cookiesBox: { borderRadius: 10, padding: Spacing.three },
  cookiesText: { fontSize: 11, fontFamily: "monospace", lineHeight: 17 },
});
