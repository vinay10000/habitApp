import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Redirect, Tabs, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  type GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTabIndexFromLocation } from "@/components/bottom-nav-hit-test";
import { useOnboardingStore } from "@/store/onboardingStore";
import { radius, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";

const visibleTabs = [
  { name: "index", title: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "streaks", title: "Streaks", icon: "flame-outline", activeIcon: "flame" },
  { name: "analytics", title: "Analytics", icon: "stats-chart-outline", activeIcon: "stats-chart" },
  { name: "settings", title: "Settings", icon: "settings-outline", activeIcon: "settings" }
] as const;

const longPressDelayMs = 180;

type NavFrame = {
  x: number;
  width: number;
};

function triggerSelectionHaptic() {
  void Haptics.selectionAsync().catch(() => undefined);
}

function triggerCommitHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

function FloatingGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useThemeTokens();
  const compact = width < 390;
  const voiceButtonSize = compact ? 56 : 60;
  const voiceGap = compact ? 8 : 12;
  const navWidth = Math.min(width - spacing.lg * 2 - voiceButtonSize - voiceGap, 370);
  const activeRouteName = state.routes[state.index]?.name;
  const activeIndex = Math.max(
    0,
    visibleTabs.findIndex((tab) => tab.name === activeRouteName)
  );
  const [previewIndex, setPreviewIndex] = useState(activeIndex);
  const [barWidth, setBarWidth] = useState(navWidth);
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<View>(null);
  const frameRef = useRef<NavFrame>({ x: 0, width: navWidth });
  const previewIndexRef = useRef(activeIndex);
  const draggingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [indicator] = useState(() => new Animated.Value(activeIndex));
  const [barScale] = useState(() => new Animated.Value(1));
  const displayIndex = dragging ? previewIndex : activeIndex;
  const indicatorWidth = barWidth / visibleTabs.length;

  const measureBar = useCallback(() => {
    barRef.current?.measureInWindow((x, _y, measuredWidth) => {
      if (measuredWidth > 0) {
        frameRef.current = { x, width: measuredWidth };
        setBarWidth(measuredWidth);
      }
    });
  }, []);

  const animateIndicator = useCallback(
    (index: number) => {
      Animated.spring(indicator, {
        toValue: index,
        damping: 18,
        stiffness: 260,
        mass: 0.75,
        useNativeDriver: true
      }).start();
    },
    [indicator]
  );

  const animateBarScale = useCallback(
    (toValue: number) => {
      Animated.spring(barScale, {
        toValue,
        damping: 16,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true
      }).start();
    },
    [barScale]
  );

  const setPreview = useCallback(
    (index: number, haptic = true) => {
      if (previewIndexRef.current === index) {
        return;
      }

      previewIndexRef.current = index;
      setPreviewIndex(index);
      animateIndicator(index);
      if (haptic) {
        triggerSelectionHaptic();
      }
    },
    [animateIndicator]
  );

  const indexFromEvent = useCallback((event: GestureResponderEvent) => {
    return getTabIndexFromLocation(frameRef.current, visibleTabs.length, event.nativeEvent.pageX);
  }, []);

  const selectTab = useCallback(
    (index: number) => {
      const tab = visibleTabs[index];
      const route = state.routes.find((item) => item.name === tab.name);

      if (!route) {
        return;
      }

      const focused = state.routes[state.index]?.key === route.key;
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    },
    [navigation, state.index, state.routes]
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const finishGesture = useCallback(
    (event: GestureResponderEvent) => {
      clearLongPressTimer();
      const releasedIndex = indexFromEvent(event) ?? previewIndexRef.current;
      const targetIndex = draggingRef.current ? previewIndexRef.current : releasedIndex;

      draggingRef.current = false;
      setDragging(false);
      animateBarScale(1);
      setPreview(targetIndex, false);
      selectTab(targetIndex);
      triggerCommitHaptic();
    },
    [animateBarScale, clearLongPressTimer, indexFromEvent, selectTab, setPreview]
  );

  const handleResponderGrant = useCallback(
    (event: GestureResponderEvent) => {
      measureBar();
      const index = indexFromEvent(event) ?? activeIndex;
      previewIndexRef.current = index;
      setPreviewIndex(index);
      animateIndicator(index);
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        draggingRef.current = true;
        setDragging(true);
        animateBarScale(1.035);
        triggerSelectionHaptic();
      }, longPressDelayMs);
    },
    [activeIndex, animateBarScale, animateIndicator, clearLongPressTimer, indexFromEvent, measureBar]
  );

  const handleResponderMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!draggingRef.current) {
        return;
      }

      const index = indexFromEvent(event);
      if (index !== null) {
        setPreview(index);
      }
    },
    [indexFromEvent, setPreview]
  );

  const handleResponderTerminate = useCallback(
    (event: GestureResponderEvent) => {
      clearLongPressTimer();
      draggingRef.current = false;
      setDragging(false);
      animateBarScale(1);
      finishGesture(event);
    },
    [animateBarScale, clearLongPressTimer, finishGesture]
  );

  useEffect(() => {
    if (!draggingRef.current) {
      previewIndexRef.current = activeIndex;
      setPreviewIndex(activeIndex);
      animateIndicator(activeIndex);
    }
  }, [activeIndex, animateIndicator]);

  useEffect(() => {
    return clearLongPressTimer;
  }, [clearLongPressTimer]);

  return (
    <View pointerEvents="box-none" style={[styles.shell, { bottom: Math.max(bottom, spacing.sm), width }]}>
      <View style={[styles.dock, { gap: voiceGap }]}>
        <Animated.View style={[styles.barShadow, { transform: [{ scale: barScale }] }]}>
          <View
            ref={barRef}
            onLayout={(event) => {
              setBarWidth(event.nativeEvent.layout.width);
              requestAnimationFrame(measureBar);
            }}
            style={[
              styles.bar,
              {
                width: navWidth,
                backgroundColor: Platform.OS === "android" ? `${colors.nav}D9` : "transparent",
                borderColor: dragging ? colors.accent : colors.lineStrong,
                shadowColor: dragging ? colors.accent : "#000"
              }
            ]}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleResponderGrant}
            onResponderMove={handleResponderMove}
            onResponderRelease={finishGesture}
            onResponderTerminate={handleResponderTerminate}
            onStartShouldSetResponder={() => true}
          >
            <BlurView
              intensity={compact ? 46 : 58}
              tint={colors.statusBar === "dark" ? "light" : "dark"}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glassTint, { backgroundColor: colors.whiteGlass }]} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                {
                  width: indicatorWidth,
                  backgroundColor: colors.accent,
                  transform: [{ translateX: Animated.multiply(indicator, indicatorWidth) }]
                }
              ]}
            />

            {visibleTabs.map((tab, index) => {
              const focused = displayIndex === index;
              const route = state.routes.find((item) => item.name === tab.name);
              const options = route ? descriptors[route.key]?.options : undefined;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.title}
                  key={tab.name}
                  onPress={() => selectTab(index)}
                  style={styles.item}
                >
                  <Ionicons
                    name={(focused ? tab.activeIcon : tab.icon) as keyof typeof Ionicons.glyphMap}
                    size={focused ? 22 : 21}
                    color={focused ? colors.accentText : colors.textMuted}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={[styles.label, { color: focused ? colors.accentText : colors.textMuted }]}
                  >
                    {tab.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add habit by voice"
          onPress={() => {
            triggerCommitHaptic();
            router.push("/voice");
          }}
          style={({ pressed }) => [
            styles.voiceTab,
            {
              width: voiceButtonSize,
              height: voiceButtonSize,
              backgroundColor: colors.accent,
              borderColor: colors.accent,
              shadowColor: colors.accent
            },
            pressed && styles.voiceTabPressed
          ]}
        >
          <Ionicons name="mic" size={24} color={colors.accentText} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useThemeTokens();
  const onboardingLoaded = useOnboardingStore((state) => state.loaded);
  const onboardingCompleted = useOnboardingStore((state) => state.completed);

  if (!onboardingLoaded) {
    return null;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home" }} />
      <Tabs.Screen name="streaks" options={{ title: "Streaks", tabBarAccessibilityLabel: "Streaks" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics", tabBarAccessibilityLabel: "Analytics" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarAccessibilityLabel: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center"
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  barShadow: {
    borderRadius: radius.pill,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
    elevation: 12
  },
  bar: {
    height: 76,
    borderRadius: radius.pill,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1
  },
  glassTint: {
    opacity: 0.88
  },
  indicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 6,
    borderRadius: radius.pill,
    opacity: 0.96
  },
  item: {
    flex: 1,
    height: "100%",
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: spacing.xs
  },
  label: {
    width: "100%",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0
  },
  voiceTab: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 12
  },
  voiceTabPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }]
  }
});
