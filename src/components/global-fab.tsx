import React from 'react';
import { View } from 'react-native';
// Using a maintained floating-action package instead of custom drag/menu implementation
// @ts-ignore - package types may not be present in the workspace
import { FloatingAction } from 'react-native-floating-action';
import tw from '@/lib/tw';
import { openLogsSheet } from '@/components/logs-bottom-sheet';
import { useRouter } from 'expo-router';

const actions = [
  {
    text: 'Logs',
    icon: null,
    name: 'logs',
    position: 1,
  },
  {
    text: 'Settings',
    icon: null,
    name: 'settings',
    position: 2,
  },
];

export default function GlobalFab() {
  const router = useRouter();

  function onPressItem(name: string) {
    if (name === 'logs') {
      openLogsSheet();
    } else if (name === 'settings') {
      router.push('/(tabs)/settings');
    }
  }

  return (
    <FloatingAction
      actions={actions}
      onPressItem={onPressItem}
      color="#7C3AED"
      animated={true}
      overrideWithAction={false}
      showBackground={false}
      // keep default position (bottom-right); the package supports draggable main button in some versions
      floatingIcon={<View />}
    />
  );
}
