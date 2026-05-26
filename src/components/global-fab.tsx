import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Dimensions, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import tw from "@/lib/tw";
import { useTheme } from "@/hooks/use-theme";
import { openLogsSheet } from "@/components/logs-bottom-sheet";
import { useRouter } from "expo-router";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const FAB_SIZE = 56;
const EDGE_MARGIN = 20;
const EXPANDED_HEIGHT = 240;
const EXPANDED_BOTTOM = 100;

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  index: number;
  isExpanded: SharedValue<boolean>;
  onPress?: () => void;
  colors: any;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  index,
  isExpanded,
  onPress,
  colors,
}) => {
  const itemStyle = useAnimatedStyle(() => ({
    opacity: isExpanded.value
      ? withDelay(100 + index * 30, withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }))
      : withTiming(0, { duration: 100 }),
    transform: [
      {
        translateY: isExpanded.value
          ? withDelay(100 + index * 30, withTiming(0, { duration: 200, easing: Easing.out(Easing.back(0.5)) }))
          : withTiming(10, { duration: 150 }),
      },
    ],
  }));

  return (
    <Animated.View style={[tw`flex-row items-center py-4 px-2`, itemStyle]}>
      <TouchableOpacity
        style={tw`flex-row items-center flex-1`}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={[tw`w-10 h-10 rounded-full justify-center items-center mr-5`, { backgroundColor: colors.backgroundSelected }]}>
          <Ionicons name={icon as any} size={24} color={colors.text} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[tw`text-[13px] leading-[18px]`, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function GlobalFab() {
  const router = useRouter();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const isExpanded = useSharedValue(false);
  const isAnimatingClose = useSharedValue(false);

  const fabLeft = useSharedValue(screenWidth - EDGE_MARGIN - FAB_SIZE);
  const fabTop = useSharedValue(screenHeight - 90 - FAB_SIZE);
  const dragStartLeft = useSharedValue(0);
  const dragStartTop = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      dragStartLeft.value = fabLeft.value;
      dragStartTop.value = fabTop.value;
    })
    .onUpdate((e) => {
      if (isExpanded.value || isAnimatingClose.value) return;
      fabLeft.value = dragStartLeft.value + e.translationX;
      fabTop.value = dragStartTop.value + e.translationY;
    })
    .onEnd(() => {
      if (isExpanded.value || isAnimatingClose.value) return;
      const snapRight = fabLeft.value + FAB_SIZE / 2 > screenWidth / 2;
      fabLeft.value = withSpring(
        snapRight ? screenWidth - EDGE_MARGIN - FAB_SIZE : EDGE_MARGIN,
        { damping: 20, stiffness: 200 },
      );
      const minTop = 50;
      const maxTop = screenHeight - 120;
      if (fabTop.value < minTop) fabTop.value = withSpring(minTop);
      if (fabTop.value > maxTop) fabTop.value = withSpring(maxTop);
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(10)
    .onEnd((_, success) => {
      if (!success) return;
      if (isExpanded.value) {
        isAnimatingClose.value = true;
        isExpanded.value = false;
      } else {
        isExpanded.value = true;
      }
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 200 }),
    pointerEvents: isExpanded.value || isAnimatingClose.value ? "auto" : "none",
  }));

  const containerStyle = useAnimatedStyle(() => {
    const expandedWidth = screenWidth - 40;
    const expandedLeft = EDGE_MARGIN;
    const expandedTop = screenHeight - EXPANDED_BOTTOM - EXPANDED_HEIGHT;

    const closedLeft = isAnimatingClose.value
      ? withTiming(fabLeft.value, { duration: 250, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) isAnimatingClose.value = false;
        })
      : fabLeft.value;

    const closedTop = isAnimatingClose.value
      ? withTiming(fabTop.value, { duration: 250, easing: Easing.out(Easing.quad) })
      : fabTop.value;

    return {
      left: isExpanded.value
        ? withTiming(expandedLeft, { duration: 250, easing: Easing.out(Easing.quad) })
        : closedLeft,
      top: isExpanded.value
        ? withTiming(expandedTop, { duration: 250, easing: Easing.out(Easing.quad) })
        : closedTop,
      width: withTiming(isExpanded.value ? expandedWidth : FAB_SIZE, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      }),
      height: withTiming(isExpanded.value ? EXPANDED_HEIGHT : FAB_SIZE, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      }),
      borderRadius: withTiming(isExpanded.value ? 20 : 28, { duration: 250 }),
      backgroundColor: withTiming(
        isExpanded.value ? colors.backgroundElement : colors.primary,
        { duration: 250 },
      ),
    };
  });

  const iconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 0 : 1, { duration: 150 }),
    transform: [
      { rotate: withTiming(isExpanded.value ? "45deg" : "0deg", { duration: 200 }) },
    ],
  }));

  const closeButtonStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 150 }),
    transform: [
      { scale: withTiming(isExpanded.value ? 1 : 0.5, { duration: 150 }) },
    ],
  }));

  const handleClose = () => {
    isAnimatingClose.value = true;
    isExpanded.value = false;
  };

  const menuItems = [
    {
      icon: "list",
      title: "Logs",
      subtitle: "View application logs and debug info",
      onPress: () => {
        isExpanded.value = false;
        openLogsSheet();
      },
    },
    {
      icon: "settings-outline",
      title: "Settings",
      subtitle: "Configure app behavior and storage",
      onPress: () => {
        isExpanded.value = false;
        router.push("/(tabs)/settings");
      },
    },
  ];

  return (
    <>
      <Animated.View style={[tw`absolute inset-0`, { zIndex: 998 }, backdropStyle]}>
        <AnimatedBlurView
          intensity={80}
          style={tw`absolute inset-0`}
          tint={colorScheme === "dark" ? "dark" : "light"}
        >
          <TouchableOpacity
            style={tw`absolute inset-0`}
            onPress={handleClose}
            activeOpacity={1}
          />
        </AnimatedBlurView>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            tw`absolute overflow-hidden`,
            { zIndex: 1000, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
            containerStyle,
          ]}
        >
          <Animated.View style={[tw`absolute inset-0 justify-center items-center`, iconStyle]}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </Animated.View>

          <Animated.View style={[tw`absolute top-5 right-[22px] w-8 h-8 justify-center items-center`, closeButtonStyle]}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </Animated.View>

          <View style={tw`flex-1 pt-[50px] px-5`}>
            {menuItems.map((item, index) => (
              <MenuItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                index={index}
                isExpanded={isExpanded}
                onPress={item.onPress}
                colors={colors}
              />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}
