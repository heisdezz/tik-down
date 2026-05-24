import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDownloadsStore } from '@/store/downloads';
import { TikTokProfile } from '@/types/profile';

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ProfileCard({
  profile,
  onPress,
  onRemove,
}: {
  profile: TikTokProfile;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useTheme();
  const startDownload = useDownloadsStore((s) => s.startDownload);
  const downloadItems = useDownloadsStore((s) => s.items);

  const total = profile.videos.length;
  const doneCount = profile.downloadedVideoIds.length;

  // Items for this profile that are currently in flight
  const activeItems = downloadItems.filter(
    (i) =>
      i.profileUsername === profile.username &&
      (i.status === 'pending' || i.status === 'downloading' || i.status === 'fetching_url'),
  );

  const pendingVideos = profile.videos.filter(
    (v) =>
      !profile.downloadedVideoIds.includes(v.id) &&
      !activeItems.some((i) => i.videoId === v.id),
  );

  const allDone = total > 0 && pendingVideos.length === 0 && activeItems.length === 0;
  const hasActive = activeItems.length > 0;

  // Aggregate progress: completed + fractional progress of in-flight items
  const activeProgress = activeItems.reduce((sum, i) => sum + (i.progress ?? 0), 0);
  const progress = total > 0 ? Math.min((doneCount + activeProgress) / total, 1) : 0;
  const progressPct = Math.round(progress * 100);

  function handleDownload() {
    for (const video of pendingVideos) {
      startDownload(video, profile.username, profile.url);
    }
  }

  function statusLabel(): string {
    if (allDone) return `${doneCount}/${total} done`;
    if (hasActive) return `Downloading ${activeItems.length}…`;
    return `${doneCount}/${total}`;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() =>
        Alert.alert(
          'Remove Profile',
          `Remove @${profile.username} from saved profiles?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: onRemove },
          ],
        )
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.75 : 1 },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.backgroundSelected }]}>
        <Text style={styles.iconEmoji}>🎵</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.username, { color: colors.text }]}>@{profile.username}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {total} video{total !== 1 ? 's' : ''} · {timeAgo(profile.fetchedAt)}
        </Text>
        {total > 0 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: allDone ? '#72C9A3' : hasActive ? colors.primary : colors.backgroundSelected,
                    width: `${progressPct}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: allDone ? '#72C9A3' : colors.textSecondary }]}>
              {statusLabel()}
            </Text>
          </View>
        )}
      </View>

      {total > 0 && (
        <Pressable
          onPress={handleDownload}
          disabled={allDone || hasActive}
          hitSlop={8}
          style={({ pressed }) => [
            styles.dlBtn,
            { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.6 : hasActive ? 0.5 : 1 },
          ]}>
          <Ionicons
            name={allDone ? 'checkmark' : hasActive ? 'hourglass-outline' : 'arrow-down-outline'}
            size={15}
            color={allDone ? '#72C9A3' : colors.primary}
          />
        </Pressable>
      )}

      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  body: { flex: 1, gap: 2 },
  username: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 10, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  dlBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
