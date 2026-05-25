import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
import { validateFileExists } from "@/lib/validator";
import {
  useProfileQuery,
  useUpdateProfileMutation,
} from "@/hooks/use-profile-query";
import Logger from "@/lib/logger";

const TypedFlashList = FlashList as any;

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const colors = useTheme();

  const {
    data: profile,
    isLoading,
    error: queryError,
  } = useProfileQuery(username);
  const updateMutation = useUpdateProfileMutation();
  const startDownload = useDownloadsStore((s) => s.startDownload);

  // Subscribe to ONLY items belonging to this profile for the count
  const activeCount = useDownloadsStore(
    (s) =>
      s.items.filter(
        (i) =>
          i.profileUsername === username &&
          (i.status === "pending" ||
            i.status === "downloading" ||
            i.status === "fetching_url"),
      ).length,
  );

  const pendingVideos = (profile?.videos ?? []).filter(
    (v) => !(profile?.downloadedVideoIds ?? []).includes(v.id),
  );

  function handleDownloadAll() {
    if (!profile) return;
    for (const video of pendingVideos) {
      startDownload(video, profile.username, profile.url, "low");
    }
  }

  const onRefresh = useCallback(async () => {
    try {
      await updateMutation.mutateAsync(username);

      // Validate existing downloads in the background
      const { itemsMap, retryDownload } = useDownloadsStore.getState();
      const profileItems = Object.values(itemsMap).filter(
        (i) => i.profileUsername === username && i.status === "done",
      );

      for (const item of profileItems) {
        if (item.localPath) {
          const exists = await validateFileExists(item.localPath);
          if (!exists) {
            retryDownload(item.id); // Automatically requeue if missing
          }
        }
      }
    } catch (e) {
      Logger.error("Manual refresh failed", { error: (e as Error).message });
    }
  }, [username, updateMutation]);

  if (!profile && isLoading) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 items-center justify-center`,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[tw`mt-4`, { color: colors.textSecondary }]}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  if (!profile && !isLoading) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 items-center justify-center`,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>Profile not found</Text>
        {queryError && (
          <Text style={[tw`mt-2 text-xs`, { color: "#ef4444" }]}>
            {(queryError as Error).message}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  const allDone = profile
    ? pendingVideos.length === 0 && activeCount === 0
    : false;

  const refreshing = updateMutation.isPending;

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
          onPress={() => onRefresh()}
          disabled={refreshing}
          style={({ pressed }) => [
            tw`px-3 py-2 rounded-xl`,
            {
              backgroundColor: colors.backgroundElement,
              opacity: pressed || refreshing ? 0.6 : 1,
            },
          ]}
        >
          {refreshing ? (
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

      {profile && (
        <TypedFlashList
          data={profile.videos}
          keyExtractor={(v: any) => v.id}
          estimatedItemSize={120}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: Spacing.two }} />
          )}
          ListHeaderComponent={
            refreshing ? (
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
