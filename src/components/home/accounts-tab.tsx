import React, { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useDownloadsStore } from "@/store/downloads";
import { Colors, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export function AccountsTab() {
  const items = useDownloadsStore((s) => s.items);
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const accounts = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of items) {
      const username = item.profileUsername;
      const videoId = item.videoId || item.id;
      if (!map.has(username)) map.set(username, new Set());
      map.get(username)!.add(videoId);
    }
    return [...map.entries()]
      .map(([username, videos]) => [username, videos.size] as [string, number])
      .sort((a, b) => b[1] - a[1]);
  }, [items]);

  if (accounts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No downloads yet</Text>
        <Text style={styles.emptyHint}>
          Go to the TikTok tab to start downloading
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={accounts}
      keyExtractor={([username]) => username}
      contentContainerStyle={styles.list}
      renderItem={({ item: [username, count] }) => (
        <Pressable
          onPress={() => router.push(`/profile/${username}`)}
          style={({ pressed }) => [
            styles.accountCard,
            {
              backgroundColor: colors.backgroundElement,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.backgroundSelected },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: colors.text }]}>
              @{username}
            </Text>
            <Text style={[styles.accountMeta, { color: colors.textSecondary }]}>
              {count} video{count !== 1 ? "s" : ""} downloaded
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700" },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { fontSize: 16, fontWeight: "600" },
  accountMeta: { fontSize: 13 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#888" },
  emptyHint: { fontSize: 14, color: "#aaa", textAlign: "center" },
});
