import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";

import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

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
  const colors = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["55%"], []);

  useEffect(() => {
    if (visible) {
      // Use a small delay to ensure the modal is ready to be presented
      const handle = requestAnimationFrame(() => {
        sheetRef.current?.present();
      });
      return () => cancelAnimationFrame(handle);
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsAtIndex={-1}
        appearsAtIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      handleStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.backgroundSelected }}
      backgroundStyle={{ backgroundColor: colors.background }}
    >
      <BottomSheetView style={styles.content}>
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
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
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
