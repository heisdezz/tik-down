import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '@/lib/tw';
import { openLogsSheet } from '@/components/logs-bottom-sheet';
import { useRouter } from 'expo-router';

const STORAGE_KEY = 'globalFabPosV1';
const { width, height } = Dimensions.get('window');

export default function GlobalFab() {
  const router = useRouter();
  const pan = useRef(new Animated.ValueXY({ x: width - 80, y: height - 200 })).current;
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem(STORAGE_KEY);
        if (val) {
          const { x, y } = JSON.parse(val);
          pan.setValue({ x, y });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan as any).x._value, y: (pan as any).y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: async () => {
        pan.flattenOffset();
        const pos = { x: (pan as any).x._value, y: (pan as any).y._value };
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch (e) {}
      },
    })
  ).current;

  function openLogs() {
    setMenuVisible(false);
    openLogsSheet();
  }

  function openSettings() {
    setMenuVisible(false);
    router.push('/(tabs)/settings');
  }

  return (
    <>
      <Animated.View
        style={[styles.fab, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.plus}>≡</Text>
        </Pressable>
      </Animated.View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={openLogs}>
              <Text style={styles.menuText}>Logs</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={openSettings}>
              <Text style={styles.menuText}>Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 999,
    elevation: 8,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  plus: { color: 'white', fontSize: 24, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  menu: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    minWidth: 140,
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 12 },
  menuText: { fontSize: 16 },
});
