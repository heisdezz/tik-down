import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { Colors, Spacing } from "@/constants/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
  colors,
}: {
  icon: IoniconsName;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        {
          backgroundColor: colors.backgroundSelected,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

export function FolderPickerModal({
  visible,
  onAppDocuments,
  onChooseFolder,
  onClose,
}: {
  visible: boolean;
  onAppDocuments: () => void;
  onChooseFolder: () => void;
  onClose?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, sheetY]);

  return (
    <Modal
      transparent
      visible={visible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
      </Pressable>

      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.backgroundSelected },
            ]}
          />

          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          )}

          <View style={styles.header}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <Ionicons name="folder-open" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Choose Download Folder
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Where should TikDown save your videos?{"\n"}You can change this
              later in Settings.
            </Text>
          </View>

          <View style={styles.options}>
            <OptionCard
              icon="phone-portrait-outline"
              title="App Documents"
              subtitle="Private to TikDown, always available"
              onPress={onAppDocuments}
              colors={colors}
            />
            <OptionCard
              icon="folder-open-outline"
              title="Choose Folder"
              subtitle="Pick any folder on your device"
              onPress={onChooseFolder}
              colors={colors}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.four,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.four,
    right: Spacing.four,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: Spacing.four },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.one,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  options: { gap: Spacing.two },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 15, fontWeight: "600" },
  optionSubtitle: { fontSize: 12 },
});
