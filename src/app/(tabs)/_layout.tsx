import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  outlineName,
  focused,
  color,
}: {
  name: IoniconsName;
  outlineName: IoniconsName;
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={focused ? name : outlineName} size={22} color={color} />;
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" outlineName="home-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tiktok"
        options={{
          title: 'TikTok',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="download" outlineName="download-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="instagram"
        options={{
          title: 'Instagram',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="camera" outlineName="camera-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" outlineName="settings-outline" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
