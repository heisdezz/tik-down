import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import tw from "@/lib/tw";
import { useTheme } from "@/hooks/use-theme";
import { useSettingsStore } from "@/store/settings";

const { width } = Dimensions.get("window");
const SLIDES = [
  {
    title: "Welcome to TikDown",
    body: "Fast, reliable TikTok downloads with background queueing and offline storage.",
  },
  {
    title: "Safe Storage",
    body: "Choose a folder on Android (SAF supported) or use app documents on iOS.",
  },
  {
    title: "High Performance",
    body: "Concurrent downloads, automatic retries, and resume support.",
  },
];

export default function Onboarding() {
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const onboardingShown = useSettingsStore((s) => s.onboardingShown);
  const setOnboardingSeen = useSettingsStore((s) => s.setOnboardingSeen);
  const colors = useTheme();

  if (onboardingShown) return null;

  function goNext() {
    if (index >= SLIDES.length - 1) {
      setOnboardingSeen();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }

  function skip() {
    setOnboardingSeen();
  }

  function onScroll(e: any) {
    const x = e.nativeEvent.contentOffset.x;
    const page = Math.round(x / width);
    setIndex(page);
  }

  return (
    <SafeAreaView style={[tw`absolute inset-0 z-50`, { pointerEvents: 'box-none' }]}>
      <View style={[tw`flex-1 justify-center`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={tw`absolute top-3 right-3`}>
          <TouchableOpacity onPress={skip} style={tw`px-3 py-2`}>
            <Text style={[tw`text-base`, { color: colors.text }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={[tw`items-center justify-center px-6`, { width, minHeight: 360 }]}>
              <Text style={[tw`text-2xl font-bold text-center mb-3`, { color: colors.text }]}>
                {s.title}
              </Text>
              <Text style={[tw`text-base text-center`, { color: colors.textSecondary, maxWidth: 520 }]}>
                {s.body}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={tw`absolute left-0 right-0 bottom-10 items-center`}>
          <View style={tw`flex-row mb-3`}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={
                  i === index
                    ? [tw`rounded-full`, { width: 14, height: 8, backgroundColor: colors.primary, marginHorizontal: 6 }]
                    : [tw`rounded-full`, { width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 6 }]
                }
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={goNext}
            style={[tw`px-6 py-3 rounded-full`, { backgroundColor: colors.backgroundElement }]}
          >
            <Text style={[tw`font-bold`, { color: index === SLIDES.length - 1 ? colors.primary : colors.text }]}> 
              {index === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
