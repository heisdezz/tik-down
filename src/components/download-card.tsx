import React from "react";
import {
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { DownloadItem, DownloadStatus } from "@/types/download";
import { Colors, Spacing } from "@/constants/theme";

export const STATUS_COLOR: Record<DownloadStatus, string> = {
  pending: "#f59e0b",
  fetching_url: "#3b82f6",
  downloading: "#3b82f6",
  done: "#22c55e",
  failed: "#ef4444",
};

export const STATUS_LABEL: Record<DownloadStatus, string> = {
  pending: "Pending",
  fetching_url: "Getting URL…",
  downloading: "Downloading",
  done: "Done",
  failed: "Failed",
};

export function DownloadCard({
  item,
  onPress,
}: {
  item: DownloadItem;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.thumbContainer}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: colors.backgroundSelected,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons
              name="videocam-outline"
              size={24}
              color={colors.textSecondary}
            />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title || "Untitled Video"}
        </Text>
        <Text style={[styles.cardUser, { color: colors.textSecondary }]}>
          @{item.profileUsername}
        </Text>

        <View style={styles.footer}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: STATUS_COLOR[item.status] + "20" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[item.status] },
              ]}
            />
            <Text
              style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}
            >
              {STATUS_LABEL[item.status]}
              {item.status === "downloading" && item.progress != null
                ? ` ${Math.round(item.progress * 100)}%`
                : ""}
            </Text>
          </View>

          {item.status === "done" && (
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={STATUS_COLOR.done}
            />
          )}
        </View>
      </View>

      <View style={styles.chevron}>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textSecondary}
        />
      </View>
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
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumb: { width: 70, height: 70, borderRadius: 10 },
  cardBody: { flex: 1, marginLeft: Spacing.three, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  cardUser: { fontSize: 12, fontWeight: "500" },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  chevron: { paddingHorizontal: 4 },
});
