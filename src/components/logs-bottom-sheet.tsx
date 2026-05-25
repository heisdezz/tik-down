import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import Logger, { LogEntry } from "@/lib/logger";
import { useTheme } from "@/hooks/use-theme";

let controller: { open: () => void; close: () => void } = {
  open: () => {},
  close: () => {},
};

export function openLogsSheet() {
  controller.open();
}

export default function LogsBottomSheet() {
  const sheetRef = useRef<BottomSheetModal>(null);
  const colors = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    Logger.getLogs().slice().reverse(),
  );

  const snapPoints = useMemo(() => ["100%"], []);

  useEffect(() => {
    controller.open = () => {
      sheetRef.current?.present();
    };

    controller.close = () => {
      sheetRef.current?.dismiss();
    };
  }, []);

  useEffect(() => {
    const unsub = Logger.subscribe((items) => setLogs([...items].reverse()));
    return () => {
      unsub();
    };
  }, []);

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <Text style={[styles.ts, { color: colors.textSecondary }]}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
        <Text
          style={[
            styles.level,
            {
              color:
                item.level === "error"
                  ? "#ff4d4d"
                  : item.level === "warn"
                    ? "#ffcc00"
                    : colors.primary,
            },
          ]}
        >
          [{item.level.toUpperCase()}]
        </Text>
      </View>
      <Text style={[styles.msg, { color: colors.text }]}>{item.message}</Text>
      {item.meta ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {JSON.stringify(item.meta, null, 2)}
        </Text>
      ) : null}
    </View>
  );

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
      handleStyle={{ backgroundColor: colors.backgroundElement }}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
      backgroundStyle={{ backgroundColor: colors.backgroundElement }}
    >
      <BottomSheetView
        style={[
          styles.container,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>System Logs</Text>
        <FlatList
          data={logs}
          keyExtractor={(i) => `${i.timestamp}-${i.level}-${i.message}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  row: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.2)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  ts: { fontSize: 11, fontVariant: ["tabular-nums"] },
  level: { fontSize: 11, fontWeight: "bold" },
  msg: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 11, marginTop: 4, fontStyle: "italic" },
});
