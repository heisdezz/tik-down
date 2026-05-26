import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Logger, { LogEntry } from "@/lib/logger";
import { useTheme } from "@/hooks/use-theme";
import tw from "@/lib/tw";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const snapPoints = useMemo(() => ["80%", "100%"], []);

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

  const copyToClipboard = async (text: string, id: string | "all") => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    const text = logs
      .map((l) => {
        const ts = new Date(l.timestamp).toISOString();
        const meta = l.meta ? `\nMeta: ${JSON.stringify(l.meta, null, 2)}` : "";
        return `[${ts}] [${l.level.toUpperCase()}] ${l.message}${meta}`;
      })
      .join("\n---\n");
    await copyToClipboard(text, "all");
  };

  const renderItem = ({ item }: { item: LogEntry }) => {
    const id = `${item.timestamp}-${item.level}-${item.message}`;
    const isCopied = copiedId === id;

    const fullLog = `[${new Date(item.timestamp).toISOString()}] [${item.level.toUpperCase()}] ${item.message}${item.meta ? `\nMeta: ${JSON.stringify(item.meta, null, 2)}` : ""}`;

    return (
      <View
        style={[styles.row, { backgroundColor: colors.backgroundSelected }]}
      >
        <View style={styles.headerRow}>
          <View style={tw`flex-row items-center gap-2`}>
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
          <Pressable
            onPress={() => copyToClipboard(fullLog, id)}
            hitSlop={8}
            style={tw`flex-row items-center gap-1`}
          >
            <Ionicons
              name={isCopied ? "checkmark" : "copy-outline"}
              size={14}
              color={isCopied ? "#72C9A3" : colors.textSecondary}
            />
          </Pressable>
        </View>
        <Text selectable style={[styles.msg, { color: colors.text }]}>
          {item.message}
        </Text>
        {item.meta ? (
          <Text
            selectable
            style={[styles.meta, { color: colors.textSecondary }]}
          >
            {JSON.stringify(item.meta, null, 2)}
          </Text>
        ) : null}
      </View>
    );
  };

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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={[styles.title, { color: colors.text }]}>
            System Logs
          </Text>
          <Pressable
            onPress={copyAll}
            style={[
              tw`flex-row items-center gap-2 px-3 py-1.5 rounded-lg`,
              {
                backgroundColor:
                  copiedId === "all" ? "#72C9A3" : colors.backgroundSelected,
              },
            ]}
          >
            <Ionicons
              name={copiedId === "all" ? "checkmark" : "copy-outline"}
              size={16}
              color={copiedId === "all" ? "#fff" : colors.text}
            />
            <Text
              style={[
                tw`text-xs font-bold`,
                { color: copiedId === "all" ? "#fff" : colors.text },
              ]}
            >
              {copiedId === "all" ? "Copied All" : "Copy All"}
            </Text>
          </Pressable>
        </View>

        <BottomSheetFlatList
          data={logs}
          keyExtractor={(i) => `${i.timestamp}-${i.level}-${i.message}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 0 },
  row: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ts: { fontSize: 11, fontVariant: ["tabular-nums"] },
  level: { fontSize: 11, fontWeight: "bold" },
  msg: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  meta: { fontSize: 11, marginTop: 6, fontStyle: "italic", opacity: 0.8 },
});
