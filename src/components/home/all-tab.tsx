import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";

import { useDownloadsStore } from "@/store/downloads";
import { DownloadCard } from "@/components/download-card";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const TypedFlashList = FlashList as any;

export function AllTab() {
  const items = useDownloadsStore((s) => s.items);
  const router = useRouter();
  const colors = useTheme();

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.videoId || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  if (uniqueItems.length === 0) {
    return (
      <View style={styles.empty}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          <Ionicons
            name="cloud-download-outline"
            size={40}
            color={colors.primary}
          />
        </View>
        <View style={styles.emptyTextContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No downloads yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            Go to the TikTok tab to search and download videos
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TypedFlashList
        data={uniqueItems}
        keyExtractor={(i: any) => i.id}
        estimatedItemSize={90}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        renderItem={({ item }: any) => (
          <DownloadCard
            item={item}
            onPress={() => {
              router.push(`/history/${item.id}`);
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, paddingBottom: 64 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextContainer: { alignItems: "center", gap: 4 },
  emptyText: { fontSize: 18, fontWeight: "700" },
  emptyHint: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
