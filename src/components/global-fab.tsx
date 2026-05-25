import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import { openLogsSheet } from "@/components/logs-bottom-sheet";
import { useRouter } from "expo-router";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const { width: screenWidth } = Dimensions.get("window");

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
  const itemStyle = useAnimatedStyle(() => {
    return {
      opacity: isExpanded.value
        ? withDelay(
            100 + index * 30,
            withTiming(1, {
              duration: 150,
              easing: Easing.out(Easing.ease),
            }),
          )
        : withTiming(0, { duration: 100 }),
      transform: [
        {
          translateY: isExpanded.value
            ? withDelay(
                100 + index * 30,
                withTiming(0, {
                  duration: 200,
                  easing: Easing.out(Easing.back(0.5)),
                }),
              )
            : withTiming(10, { duration: 150 }),
        },
      ],
    };
  });

  return (
    <AnimatedTouchableOpacity
      style={[styles.menuItem, itemStyle]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuItemIcon,
          { backgroundColor: colors.backgroundSelected },
        ]}
      >
        <Ionicons name={icon as any} size={24} color={colors.text} />
      </View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text
          style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}
        >
          {subtitle}
        </Text>
      </View>
    </AnimatedTouchableOpacity>
  );
};

export default function GlobalFab() {
  const router = useRouter();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const isExpanded = useSharedValue(false);

  const animatedOverlayOpacity = useDerivedValue(() =>
    withTiming(isExpanded.value ? 1 : 0, { duration: 200 }),
  );

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: animatedOverlayOpacity.value,
    };
  });

  const backdropProps = useAnimatedProps(() => {
    return {
      pointerEvents: (isExpanded.value ? "auto" : "none") as any,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    const expandedWidth = screenWidth - 40;
    const expandedHeight = 240;
    const fabSize = 56;

    return {
      width: withTiming(isExpanded.value ? expandedWidth : fabSize, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      }),
      height: withTiming(isExpanded.value ? expandedHeight : fabSize, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      }),
      borderRadius: withTiming(isExpanded.value ? 20 : 28, {
        duration: 250,
      }),
      bottom: withTiming(isExpanded.value ? 100 : 90, {
        duration: 250,
      }),
      backgroundColor: isExpanded.value
        ? colors.backgroundElement
        : colors.primary,
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isExpanded.value ? 0 : 1, { duration: 150 }),
      transform: [
        {
          rotate: withTiming(isExpanded.value ? "45deg" : "0deg", {
            duration: 200,
          }),
        },
      ],
    };
  });

  const closeButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 150 }),
      transform: [
        {
          scale: withTiming(isExpanded.value ? 1 : 0.5, { duration: 150 }),
        },
      ],
    };
  });

  const handlePress = () => {
    isExpanded.value = !isExpanded.value;
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
      <AnimatedView
        style={[styles.backdrop, backdropStyle]}
        animatedProps={backdropProps}
      >
        <AnimatedBlurView
          intensity={80}
          style={StyleSheet.absoluteFill}
          tint={colorScheme === "dark" ? "dark" : "light"}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handlePress}
            activeOpacity={1}
          />
        </AnimatedBlurView>
      </AnimatedView>

      <AnimatedTouchableOpacity
        style={[styles.container, containerStyle]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </Animated.View>

        <Animated.View style={[styles.closeButton, closeButtonStyle]}>
          <TouchableOpacity onPress={handlePress}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.expandedContent}>
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
      </AnimatedTouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
    overflow: "hidden",
  },
  iconContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 22,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  expandedContent: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 998,
  },
});
