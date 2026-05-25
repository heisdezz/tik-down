import React, { useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import tw from "@/lib/tw";
import { Colors } from "@/constants/theme";
import { AllTab } from "@/components/home/all-tab";
import { AccountsTab } from "@/components/home/accounts-tab";

type Tab = "all" | "accounts";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View
        style={[tw`px-4 pt-2 pb-1`, { backgroundColor: colors.background }]}
      >
        <Text style={[tw`text-2xl font-bold mb-3`, { color: colors.text }]}>
          Downloads
        </Text>

        <View
          style={[
            tw`flex-row rounded-xl p-1`,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          {(["all", "accounts"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                tw`flex-1 py-2 rounded-lg items-center`,
                activeTab === t && { backgroundColor: colors.background },
              ]}
            >
              <Text
                style={[
                  tw`text-sm font-semibold`,
                  {
                    color: activeTab === t ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                {t === "all" ? "All" : "By Account"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "all" ? <AllTab /> : <AccountsTab />}
    </SafeAreaView>
  );
}
