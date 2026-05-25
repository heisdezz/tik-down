import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import tw from "@/lib/tw";
import { useDownloadsStore } from "@/store/downloads";
import { DownloadStatus } from "@/types/download";
import { Colors, Spacing } from "@/constants/theme";
import Logger from "@/lib/logger";

const STATUS_COLOR: Record<DownloadStatus, string> = {
  pending: "#f59e0b",
  fetching_url: "#3b82f6",
  downloading: "#3b82f6",
  done: "#22c55e",
  failed: "#ef4444",
};

const STATUS_LABEL: Record<DownloadStatus, string> = {
  pending: "Pending",
  fetching_url: "Getting download URL…",
  downloading: "Downloading",
  done: "Download Complete",
  failed: "Failed",
};

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const item = useDownloadsStore((s) => s.items.find((i) => i.id === id));
  const retryDownload = useDownloadsStore((s) => s.retryDownload);
  const removeDownload = useDownloadsStore((s) => s.removeDownload);

  if (!item) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 items-center justify-center`,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>Download not found</Text>
      </SafeAreaView>
    );
  }

  const isActive =
    item.status === "downloading" ||
    item.status === "fetching_url" ||
    item.status === "pending";

  async function handlePlay() {
    if (!item?.localPath) return;
    try {
      if (Platform.OS === "android") {
        const uri = item.localPath.startsWith("content://")
          ? item.localPath
          : await FileSystem.getContentUriAsync(item.localPath);

        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: uri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: "video/*",
        });
      } else {
        await Sharing.shareAsync(item.localPath, {
          UTI: "public.mpeg-4",
          mimeType: "video/mp4",
        });
      }
    } catch (err) {
      Logger.error("Failed to open external player", {
        error: (err as Error).message,
      });
      Alert.alert(
        "Error",
        "Could not open external player. Make sure you have a video player installed.",
      );
    }
  }

  async function handleShare() {
    if (!item?.localPath) return;
    try {
      await Share.share({ url: item.localPath, title: item.title });
    } catch {}
  }

  async function handleDelete() {
    Alert.alert("Delete Download", "Remove this download from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (item?.localPath) {
            await FileSystem.deleteAsync(item.localPath, {
              idempotent: true,
            }).catch(() => {});
          }
          if (item?.id) {
            await removeDownload(item.id);
            router.back();
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View
        style={[
          tw`flex-row items-center px-4 py-3 gap-3`,
          { borderBottomColor: colors.backgroundElement, borderBottomWidth: 1 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text
          style={[tw`flex-1 text-lg font-bold`, { color: colors.text }]}
          numberOfLines={1}
        >
          Download Detail
        </Text>
      </View>

      <ScrollView contentContainerStyle={tw`pb-12`}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.hero}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.hero, { backgroundColor: colors.backgroundElement }]}
          />
        )}

        <View style={tw`px-4 pt-4 gap-4`}>
          <Text
            style={[tw`text-xl font-bold leading-7`, { color: colors.text }]}
          >
            {item.title}
          </Text>
          <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>
            @{item.profileUsername}
          </Text>

          {/* Status */}
          <View
            style={[
              tw`p-4 rounded-2xl gap-3`,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_COLOR[item.status] },
                ]}
              />
              <Text
                style={[
                  tw`font-semibold text-base`,
                  { color: STATUS_COLOR[item.status] },
                ]}
              >
                {STATUS_LABEL[item.status]}
              </Text>
            </View>

            {item.status === "downloading" && item.progress != null && (
              <View style={tw`gap-2`}>
                <View
                  style={[
                    styles.progressBg,
                    { backgroundColor: colors.backgroundSelected },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(item.progress * 100)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                  {Math.round(item.progress * 100)}%
                </Text>
              </View>
            )}

            {item.error && (
              <Text style={[tw`text-sm`, { color: "#ef4444" }]}>
                {item.error}
              </Text>
            )}

            {item.localPath && (
              <Text
                style={[tw`text-xs font-mono`, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.localPath}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={tw`gap-3`}>
            {item.status === "done" && (
              <>
                <Pressable
                  onPress={handlePlay}
                  style={({ pressed }) => [
                    tw`py-4 rounded-2xl items-center flex-row justify-center gap-2`,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={tw`text-white font-bold text-base`}>
                    Play Video
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [
                    tw`py-4 rounded-2xl items-center flex-row justify-center gap-2`,
                    {
                      backgroundColor: colors.backgroundSelected,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[tw`font-bold text-base`, { color: colors.primary }]}
                  >
                    Share Video
                  </Text>
                </Pressable>
              </>
            )}

            {item.status === "failed" && (
              <Pressable
                onPress={() => retryDownload(item.id)}
                style={({ pressed }) => [
                  tw`py-4 rounded-2xl items-center`,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={tw`text-white font-bold text-base`}>
                  Retry Download
                </Text>
              </Pressable>
            )}

            {!isActive && (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  tw`py-4 rounded-2xl items-center`,
                  {
                    backgroundColor: colors.backgroundElement,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[tw`font-bold text-base`, { color: "#ef4444" }]}>
                  Delete
                </Text>
              </Pressable>
            )}
          </View>

          {/* Meta */}
          <View
            style={[
              tw`p-4 rounded-2xl gap-2`,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <Text
              style={[
                tw`text-xs font-bold uppercase tracking-widest mb-1`,
                { color: colors.textSecondary },
              ]}
            >
              Details
            </Text>
            <DetailRow label="Video ID" value={item.videoId} colors={colors} />
            <DetailRow
              label="Profile"
              value={item.profileUrl}
              colors={colors}
            />
            <DetailRow
              label="Added"
              value={new Date(item.createdAt).toLocaleString()}
              colors={colors}
            />
            <DetailRow
              label="Updated"
              value={new Date(item.updatedAt).toLocaleString()}
              colors={colors}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <View style={tw`flex-row gap-2`}>
      <Text
        style={[
          tw`text-xs font-semibold w-16`,
          { color: colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[tw`flex-1 text-xs`, { color: colors.text }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 240 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
});
