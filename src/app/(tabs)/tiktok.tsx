import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import tw from "@/lib/tw";
import { useProfilesStore } from "@/store/profiles";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ProfileCard } from "@/components/profile-card";

export default function TikTokScreen() {
  const colors = useTheme();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [input, setInput] = useState("");
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
      setInput("");
      router.push(`/profile/${username}`);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch profile",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={tw`px-4 pt-2 pb-2`}>
        <Text style={[tw`text-2xl font-bold mb-4`, { color: colors.text }]}>
          TikTok
        </Text>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          <Ionicons
            name="at"
            size={20}
            color={colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={inputRef}
            style={[tw`flex-1 py-3 text-sm`, { color: colors.text }]}
            placeholder="username or profile URL"
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
            disabled={loading || !input.trim()}
            style={({ pressed }) => [
              styles.fetchBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading || !input.trim() ? 0.75 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={18} color="#fff" />
            )}
          </Pressable>
        </View>

        {fetchError && (
          <View
            style={[
              tw`mt-3 px-4 py-3 rounded-xl flex-row items-center gap-2`,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color="#E97B8E" />
            <Text style={[tw`text-xs font-semibold`, { color: "#E97B8E" }]}>
              {fetchError}
            </Text>
          </View>
        )}
      </View>

      {profiles.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center gap-4 px-10`}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <Ionicons name="people-outline" size={40} color={colors.primary} />
          </View>
          <View style={tw`items-center gap-1`}>
            <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>
              No saved profiles
            </Text>
            <Text
              style={[tw`text-sm text-center`, { color: colors.textSecondary }]}
            >
              Search for a TikTok username above to save their profile for quick
              access.
            </Text>
          </View>
        </View>
      ) : (
        <View style={tw`flex-1`}>
          <View style={tw`px-4 py-3`}>
            <Text
              style={[
                tw`text-xs font-bold uppercase tracking-widest`,
                { color: colors.textSecondary },
              ]}
            >
              Saved Profiles · {profiles.length}
            </Text>
          </View>
          <FlashList
            data={profiles}
            keyExtractor={(p: any) => p.username}
            estimatedItemSize={100}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => (
              <View style={{ height: Spacing.two }} />
            )}
            renderItem={({ item }: any) => (
              <ProfileCard
                profile={item}
                onPress={() => router.push(`/profile/${item.username}`)}
                onRemove={() => removeProfile(item.username)}
              />
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    height: 56,
  },
  fetchBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
