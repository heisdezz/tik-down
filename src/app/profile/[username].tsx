import { FlashList } from "@shopify/flash-list";
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
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { VideoCard } from "@/components/video-card";

const TypedFlashList = FlashList as any;

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
        <TypedFlashList
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
});
