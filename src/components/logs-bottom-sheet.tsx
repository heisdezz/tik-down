import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Logger, { LogEntry } from '@/lib/logger';

let controller: { open: () => void; close: () => void } = {
  open: () => {},
  close: () => {},
};

export function openLogsSheet() {
  controller.open();
}

export default function LogsBottomSheet() {
  const sheetRef = useRef<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>(() => Logger.getLogs().slice().reverse());

  useEffect(() => {
    controller.open = () => {
      const ref = sheetRef.current;
      if (!ref) return;
      if (typeof ref.expand === 'function') {
        ref.expand();
      } else if (typeof ref.snapToIndex === 'function') {
        ref.snapToIndex(1);
      }
    };

    controller.close = () => {
      const ref = sheetRef.current;
      if (!ref) return;
      if (typeof ref.close === 'function') {
        ref.close();
      } else if (typeof ref.snapToIndex === 'function') {
        ref.snapToIndex(0);
      }
    };
  }, []);

  useEffect(() => {
    const unsub = Logger.subscribe((items) => setLogs([...items].reverse()));
    return unsub;
  }, []);

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={styles.row}>
      <Text style={styles.ts}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
      <Text style={styles.level}>[{item.level}]</Text>
      <Text style={styles.msg}>{item.message}</Text>
      {item.meta ? <Text style={styles.meta}>{JSON.stringify(item.meta)}</Text> : null}
    </View>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["30%", "70%"]}
      enablePanDownToClose
    >
      <View style={styles.container}>
        <Text style={styles.title}>Logs</Text>
        <FlatList
          data={logs}
          keyExtractor={(i) => `${i.timestamp}-${i.level}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  row: { marginBottom: 8 },
  ts: { fontSize: 12, color: '#666' },
  level: { fontSize: 12, fontWeight: '600' },
  msg: { fontSize: 14 },
  meta: { fontSize: 12, color: '#333' },
});
