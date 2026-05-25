import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import tw from "@/lib/tw";
import { useDownloadsStore } from "@/store/downloads";
import { useProfilesStore } from "@/store/profiles";
import { VideoPost } from "@/types/api";
import { DownloadItem } from "@/types/download";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

function formatDuration(secs?: number): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCount(n?: number): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function VideoStatusButton({
  item,
  isDone,
  onDownload,
  onRetry,
  colors,
}: {
  item: DownloadItem | undefined;
  isDone: boolean;
  onDownload: () => void;
  onRetry: () => void;
  colors: any;
}) {
  if (isDone) {
    return (
      <View
        style={[
          styles.statusBtn,
          { backgroundColor: colors.backgroundSelected },
        ]}
      >
        <Ionicons name="checkmark-circle" size={13} color="#72C9A3" />
        <Text style={[tw`text-xs font-bold`, { color: "#72C9A3" }]}>
          Downloaded
        </Text>
      </View>
    );
  }

  if (!item) {
    return (
      <Pressable
        onPress={onDownload}
        style={({ pressed }) => [
          styles.statusBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons name="arrow-down-outline" size={13} color="#fff" />
        <Text style={[tw`text-xs font-bold`, { color: "#fff" }]}>Download</Text>
      </Pressable>
    );
  }

  if (item.status === "failed") {
    return (
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.statusBtn,
          {
            backgroundColor: colors.backgroundSelected,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="refresh-outline" size={13} color="#E97B8E" />
        <Text style={[tw`text-xs font-bold`, { color: "#E97B8E" }]}>Retry</Text>
      </Pressable>
    );
  }

  if (item.status === "fetching_url") {
    return (
      <View
        style={[
          styles.statusBtn,
          { backgroundColor: colors.backgroundSelected },
        ]}
      >
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ transform: [{ scale: 0.7 }] }}
        />
        <Text style={[tw`text-xs font-bold`, { color: colors.textSecondary }]}>
          Getting URL…
        </Text>
      </View>
    );
  }

  if (item.status === "pending") {
    return (
      <View
        style={[
          styles.statusBtn,
          { backgroundColor: colors.backgroundSelected },
        ]}
      >
        <Ionicons
          name="hourglass-outline"
          size={13}
          color={colors.textSecondary}
        />
        <Text style={[tw`text-xs font-bold`, { color: colors.textSecondary }]}>
          Queued
        </Text>
      </View>
    );
  }

  // downloading
  const pct = Math.round((item.progress ?? 0) * 100);
  return (
    <View
      style={[
        styles.progressBtn,
        { backgroundColor: colors.backgroundSelected },
      ]}
    >
      <View style={styles.progressBtnTrack}>
        <View
          style={[
            styles.progressBtnFill,
            { backgroundColor: colors.primary, width: `${pct}%` },
          ]}
        />
      </View>
      <Text style={[styles.progressBtnLabel, { color: colors.primary }]}>
        {pct}%
      </Text>
    </View>
  );
}

function VideoCard({
  video,
  username,
  profileUrl,
  downloadedVideoIds,
}: {
  video: VideoPost;
  username: string;
  profileUrl: string;
  downloadedVideoIds: string[];
}) {
  const colors = useTheme();
  const startDownload = useDownloadsStore((s) => s.startDownload);
  const retryDownload = useDownloadsStore((s) => s.retryDownload);
  const items = useDownloadsStore((s) => s.items);

  const item = items.find(
    (i) => i.videoId === video.id && i.profileUsername === username,
  );
  const isDone =
    downloadedVideoIds.includes(video.id) || item?.status === "done";

  const thumbnail = video.thumbnails?.at(-1)?.url ?? video.thumbnail;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Image
        source={{ uri: thumbnail }}
        style={styles.thumb}
        contentFit="cover"
      />
      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, { color: colors.text }]}
          numberOfLines={3}
        >
          {video.title || "Untitled"}
        </Text>
        <View style={tw`flex-row gap-3`}>
          {video.duration != null && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatDuration(video.duration)}
            </Text>
          )}
          {video.view_count != null && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatCount(video.view_count)} views
            </Text>
          )}
        </View>
        <VideoStatusButton
          item={item}
          isDone={isDone}
          onDownload={() => startDownload(video, username, profileUrl)}
          onRetry={() => item && retryDownload(item.id)}
          colors={colors}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const colors = useTheme();

  const { profiles, fetching, errors, fetchProfile } = useProfilesStore();
  const startDownload = useDownloadsStore((s) => s.startDownload);
  const downloadItems = useDownloadsStore((s) => s.items);

  const profile = profiles.find((p) => p.username === username);
  const isUpdating = fetching[username] ?? false;
  const updateError = errors[username];

  const pendingVideos = (profile?.videos ?? []).filter(
    (v) =>
      !(profile?.downloadedVideoIds ?? []).includes(v.id) &&
      !downloadItems.some(
        (i) =>
          i.videoId === v.id &&
          i.profileUsername === username &&
          (i.status === "pending" ||
            i.status === "downloading" ||
            i.status === "fetching_url"),
      ),
  );

  const activeCount = downloadItems.filter(
    (i) =>
      i.profileUsername === username &&
      (i.status === "pending" ||
        i.status === "downloading" ||
        i.status === "fetching_url"),
  ).length;

  function handleDownloadAll() {
    if (!profile) return;
    for (const video of pendingVideos) {
      startDownload(video, profile.username, profile.url);
    }
  }

  if (!profile && !isUpdating) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 items-center justify-center`,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>Profile not found</Text>
      </SafeAreaView>
    );
  }

  const allDone = profile
    ? pendingVideos.length === 0 && activeCount === 0
    : false;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center px-4 py-3 gap-3`,
          { borderBottomColor: colors.backgroundElement, borderBottomWidth: 1 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>
            @{username}
          </Text>
          {profile && (
            <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
              {profile.videos.length} video
              {profile.videos.length !== 1 ? "s" : ""} ·{" "}
              {new Date(profile.fetchedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => fetchProfile(username)}
          disabled={isUpdating}
          style={({ pressed }) => [
            tw`px-3 py-2 rounded-xl`,
            {
              backgroundColor: colors.backgroundElement,
              opacity: pressed || isUpdating ? 0.6 : 1,
            },
          ]}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>
              Update
            </Text>
          )}
        </Pressable>
      </View>

      {/* Download All bar */}
      {profile && (
        <View
          style={[
            tw`flex-row items-center gap-3 px-4 py-3`,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          <View style={tw`flex-1`}>
            <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
              {allDone
                ? `All ${profile.videos.length} downloaded`
                : activeCount > 0
                  ? `Downloading ${activeCount} video${activeCount !== 1 ? "s" : ""}…`
                  : `${pendingVideos.length} of ${profile.videos.length} remaining`}
            </Text>
          </View>
          <Pressable
            onPress={handleDownloadAll}
            disabled={pendingVideos.length === 0}
            style={({ pressed }) => [
              tw`px-4 py-2 rounded-xl flex-row items-center gap-1`,
              {
                backgroundColor: allDone
                  ? colors.backgroundSelected
                  : colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {allDone ? (
              <Ionicons name="checkmark-circle" size={14} color="#72C9A3" />
            ) : (
              <Ionicons name="arrow-down-outline" size={14} color="#fff" />
            )}
            <Text
              style={[
                tw`text-xs font-bold`,
                { color: allDone ? "#72C9A3" : "#fff" },
              ]}
            >
              {allDone ? "All Done" : `Download All (${pendingVideos.length})`}
            </Text>
          </Pressable>
        </View>
      )}

      {updateError && (
        <View
          style={[
            tw`mx-4 my-2 px-4 py-3 rounded-xl`,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          <Text style={[tw`text-xs font-semibold`, { color: "#E97B8E" }]}>
            {updateError}
          </Text>
        </View>
      )}

      {isUpdating && !profile && (
        <View style={tw`flex-1 items-center justify-center gap-3`}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>
            Fetching profile…
          </Text>
        </View>
      )}

      {profile && (
        <FlashList
          data={profile.videos}
          keyExtractor={(v: any) => v.id}
          estimatedItemSize={120}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={{ height: Spacing.two }} />
          )}
          ListHeaderComponent={
            isUpdating ? (
              <View style={tw`flex-row items-center gap-2 px-1 pb-2`}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                  Updating…
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }: any) => (
            <VideoCard
              video={item}
              username={profile.username}
              profileUrl={profile.url}
              downloadedVideoIds={profile.downloadedVideoIds}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    gap: Spacing.two,
  },
  thumb: { width: 100, height: 120 },
  cardBody: {
    flex: 1,
    padding: Spacing.two,
    gap: 6,
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  meta: { fontSize: 11 },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 2,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  progressBtn: {
    marginTop: 2,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressBtnTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  progressBtnFill: { height: "100%", borderRadius: 2 },
  progressBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "right",
  },
});
