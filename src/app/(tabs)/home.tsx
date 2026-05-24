import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import tw from '@/lib/tw';
import { useDownloadsStore } from '@/store/downloads';
import { DownloadItem, DownloadStatus } from '@/types/download';
import { Colors, Spacing } from '@/constants/theme';

const STATUS_COLOR: Record<DownloadStatus, string> = {
  pending: '#f59e0b',
  fetching_url: '#3b82f6',
  downloading: '#3b82f6',
  done: '#22c55e',
  failed: '#ef4444',
};

const STATUS_LABEL: Record<DownloadStatus, string> = {
  pending: 'Pending',
  fetching_url: 'Getting URL…',
  downloading: 'Downloading',
  done: 'Done',
  failed: 'Failed',
};

function DownloadCard({ item, onPress }: { item: DownloadItem; onPress: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.75 : 1 },
      ]}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: colors.backgroundSelected }]} />
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardUser, { color: colors.textSecondary }]}>
          @{item.profileUsername}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
            {STATUS_LABEL[item.status]}
            {item.status === 'downloading' && item.progress != null
              ? ` ${Math.round(item.progress * 100)}%`
              : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function AllTab() {
  const items = useDownloadsStore((s) => s.items);
  const router = useRouter();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No downloads yet</Text>
        <Text style={styles.emptyHint}>Go to the TikTok tab to start downloading</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <DownloadCard item={item} onPress={() => router.push(`/history/${item.id}`)} />
      )}
    />
  );
}

function AccountsTab() {
  const items = useDownloadsStore((s) => s.items);
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const grouped = useMemo(() => {
    const map = new Map<string, DownloadItem[]>();
    for (const item of items) {
      const key = item.profileUsername;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  if (grouped.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No downloads yet</Text>
        <Text style={styles.emptyHint}>Go to the TikTok tab to start downloading</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={grouped}
      keyExtractor={([username]) => username}
      contentContainerStyle={styles.list}
      renderItem={({ item: [username, downloads] }) => (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>@{username}</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {downloads.length} video{downloads.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {downloads.map((dl) => (
            <DownloadCard key={dl.id} item={dl} onPress={() => router.push(`/history/${dl.id}`)} />
          ))}
        </View>
      )}
    />
  );
}

type Tab = 'all' | 'accounts';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={[tw`px-4 pt-2 pb-1`, { backgroundColor: colors.background }]}>
        <Text style={[tw`text-2xl font-bold mb-3`, { color: colors.text }]}>Downloads</Text>

        <View style={[tw`flex-row rounded-xl p-1`, { backgroundColor: colors.backgroundElement }]}>
          {(['all', 'accounts'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                tw`flex-1 py-2 rounded-lg items-center`,
                activeTab === t && { backgroundColor: colors.background },
              ]}>
              <Text
                style={[
                  tw`text-sm font-semibold`,
                  { color: activeTab === t ? colors.text : colors.textSecondary },
                ]}>
                {t === 'all' ? 'All' : 'By Account'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === 'all' ? <AllTab /> : <AccountsTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    gap: Spacing.three,
  },
  thumb: { width: 80, height: 80 },
  cardBody: { flex: 1, padding: Spacing.two, gap: 4, justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  cardUser: { fontSize: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#888' },
  emptyHint: { fontSize: 14, color: '#aaa', textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 13 },
});
