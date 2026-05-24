import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import tw from '@/lib/tw';
import { useProfilesStore } from '@/store/profiles';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ProfileCard } from '@/components/profile-card';

export default function TikTokScreen() {
  const colors = useTheme();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { profiles, fetchProfile, removeProfile } = useProfilesStore();

  async function handleFetch() {
    const raw = input.trim();
    if (!raw || loading) return;
    inputRef.current?.blur();
    setLoading(true);
    setFetchError(null);
    try {
      const username = await fetchProfile(raw);
      setInput('');
      router.push(`/profile/${username}`);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={tw`px-4 pt-2 pb-4`}>
        <Text style={[tw`text-2xl font-bold mb-4`, { color: colors.text }]}>TikTok</Text>

        <View style={tw`flex-row gap-2`}>
          <TextInput
            ref={inputRef}
            style={[
              tw`flex-1 px-4 py-3 rounded-xl text-sm`,
              { backgroundColor: colors.backgroundElement, color: colors.text },
            ]}
            placeholder="@username or profile URL"
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleFetch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            editable={!loading}
          />
          <Pressable
            onPress={handleFetch}
            disabled={loading}
            style={({ pressed }) => [
              tw`px-4 py-3 rounded-xl justify-center items-center`,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.75 : 1, minWidth: 64 },
            ]}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={tw`text-white font-bold text-sm`}>Fetch</Text>
            )}
          </Pressable>
        </View>

        {fetchError && (
          <View style={[tw`mt-3 px-4 py-3 rounded-xl`, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[tw`text-xs font-semibold`, { color: '#E97B8E' }]}>{fetchError}</Text>
          </View>
        )}
      </View>

      {profiles.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center gap-2 px-8`}>
          <Text style={[tw`text-lg font-semibold`, { color: colors.textSecondary }]}>
            No saved profiles
          </Text>
          <Text style={[tw`text-sm text-center`, { color: colors.textSecondary }]}>
            Enter a TikTok @username above to fetch and save a profile
          </Text>
        </View>
      ) : (
        <>
          <Text style={[tw`px-4 pb-2 text-xs font-bold uppercase tracking-widest`, { color: colors.textSecondary }]}>
            Saved Profiles · {profiles.length}
          </Text>
          <FlashList
            data={profiles}
            keyExtractor={(p) => p.username}
            estimatedItemSize={96}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
            renderItem={({ item }) => (
              <ProfileCard
                profile={item}
                onPress={() => router.push(`/profile/${item.username}`)}
                onRemove={() => removeProfile(item.username)}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
});
