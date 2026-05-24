import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import tw from '@/lib/tw';
import { Colors } from '@/constants/theme';

export default function InstagramScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={tw`px-4 pt-2 pb-3`}>
        <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Instagram</Text>
      </View>

      <View style={tw`flex-1 items-center justify-center gap-5 px-8`}>
        <View
          style={[
            tw`w-24 h-24 rounded-3xl items-center justify-center`,
            { backgroundColor: colors.backgroundElement },
          ]}>
          <Ionicons name="camera" size={44} color={colors.primary} />
        </View>

        <View style={tw`items-center gap-2`}>
          <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Coming Soon</Text>
          <Text style={[tw`text-sm text-center leading-5`, { color: colors.textSecondary }]}>
            Instagram downloads are on the way.{'\n'}Stay tuned for the next update.
          </Text>
        </View>

        <View
          style={[
            tw`px-5 py-3 rounded-full`,
            { backgroundColor: colors.backgroundElement },
          ]}>
          <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
            In Development
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
