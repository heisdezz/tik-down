import React from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { VideoPost } from "@/types/api";
import { DownloadItem } from "@/types/download";
import { useDownloadsStore } from "@/store/downloads";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/constants/theme";
import { STATUS_COLOR, STATUS_LABEL } from "./download-card";

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

interface VideoCardProps {
  video: VideoPost;
  username: string;
  profileUrl: string;
  downloadedVideoIds: string[];
}

export function VideoCard({
  video,
  username,
  profileUrl,
  downloadedVideoIds,
}: VideoCardProps) {
  const colors = useTheme();
  const router = useRouter();
  const startDownload = useDownloadsStore((s) => s.startDownload);
  const retryDownload = useDownloadsStore((s) => s.retryDownload);
  const items = useDownloadsStore((s) => s.items);

  const item = items.find(
    (i) => i.videoId === video.id && i.profileUsername === username,
  );
  const isDone = downloadedVideoIds.includes(video.id) || item?.status === "done";
  const thumbnail = video.thumbnails?.at(-1)?.url ?? video.thumbnail;

  const handlePress = () => {
    if (item) {
      router.push(`/history/${item.id}`);
    } else if (isDone) {
      // If marked as done but no item found (shouldn't happen often), do nothing or search?
      // Usually isDone implies it's in the store.
    }
  };

  const handleDownload = (e: any) => {
    // Prevent event bubbling to the card's onPress
    // Pressable on Android/iOS doesn't have stopPropagation like web
    // But we can check if it was handled
    startDownload(video, username, profileUrl);
  };

  const handleRetry = () => {
    if (item) retryDownload(item.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          opacity: pressed && item ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.thumbContainer}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.backgroundSelected, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="videocam-outline" size={24} color={colors.textSecondary} />
          </View>
        )}
        {video.duration != null && (
          <View style={styles.durationTag}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {video.title || "Untitled Video"}
        </Text>

        <View style={styles.metaRow}>
           {video.view_count != null && (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatCount(video.view_count)} views
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          {!item && !isDone && (
            <Pressable
              onPress={handleDownload}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="arrow-down-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Download</Text>
            </Pressable>
          )}

          {item && item.status === 'failed' && (
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="refresh-outline" size={14} color={STATUS_COLOR.failed} />
              <Text style={[styles.actionBtnText, { color: STATUS_COLOR.failed }]}>Retry</Text>
            </Pressable>
          )}

          {(isDone || (item && item.status !== 'failed')) && (
            <View style={[styles.statusPill, { backgroundColor: (item ? STATUS_COLOR[item.status] : STATUS_COLOR.done) + '20' }]}>
              {item?.status === 'fetching_url' ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.6 }] }} />
              ) : item?.status === 'downloading' ? (
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR.downloading }]} />
              ) : (
                <Ionicons
                  name={isDone ? "checkmark-circle" : "hourglass-outline"}
                  size={12}
                  color={isDone ? STATUS_COLOR.done : colors.textSecondary}
                />
              )}
              <Text style={[styles.statusText, { color: item ? STATUS_COLOR[item.status] : STATUS_COLOR.done }]}>
                {isDone ? "Downloaded" : STATUS_LABEL[item!.status]}
                {item?.status === "downloading" && item.progress != null
                  ? ` ${Math.round(item.progress * 100)}%`
                  : ""}
              </Text>
            </View>
          )}
        </View>
      </View>

      {item && (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    padding: 10,
    alignItems: "center",
  },
  thumbContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: 80, height: 100, borderRadius: 10 },
  durationTag: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBody: { flex: 1, marginLeft: Spacing.three, gap: 2 },
  cardTitle: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 11, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  chevron: { paddingHorizontal: 4 },
});
