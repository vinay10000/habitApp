import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Redirect, Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnboardingStore } from "@/store/onboardingStore";
import { radius, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";

function FloatingGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useThemeTokens();
  const navWidth = Math.min(width - spacing.md * 2, Platform.OS === "web" ? 292 : 342);

  return (
    <View style={[styles.shell, { bottom: Math.max(bottom, spacing.sm), width }]}>
      <View
        style={[
          styles.bar,
          {
            width: navWidth,
            backgroundColor: colors.nav,
            borderTopColor: colors.lineStrong,
            borderLeftColor: colors.lineStrong,
            borderRightColor: colors.line,
            borderBottomColor: colors.line,
            shadowColor: colors.accent
          }
        ]}
      >
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const isFocused = state.index === index;
          const label =
            options?.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options?.title !== undefined
                ? options.title
                : route.name;
          const iconColor = isFocused ? colors.accent : colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                isFocused ? styles.itemActive : styles.itemIdle,
                {
                  backgroundColor: isFocused ? colors.accentSoft : colors.whiteGlass,
                  borderTopColor: isFocused ? colors.accent : colors.lineStrong,
                  borderLeftColor: isFocused ? colors.lineStrong : colors.line,
                  borderRightColor: colors.line,
                  borderBottomColor: colors.line
                },
                pressed && styles.itemPressed
              ]}
            >
              {options?.tabBarIcon?.({ focused: isFocused, color: iconColor, size: isFocused ? 23 : 25 })}
              {isFocused && typeof label === "string" ? (
                <Text style={[styles.label, { color: colors.accent }]}>{label}</Text>
              ) : null}
            </Pressable>
          );
        })}
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="streaks"
        options={{
          title: "Streaks",
          tabBarIcon: ({ color, size }) => <Ionicons name="flame-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />
        }}
      />
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
  bar: {
    minHeight: 68,
    borderRadius: radius.pill,
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 22,
    elevation: 14
  },
  item: {
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1
  },
  itemActive: {
    flex: 1.65,
    minWidth: 116,
    gap: spacing.xs,
    paddingHorizontal: spacing.md
  },
  itemIdle: {
    flex: 0.86,
    minWidth: 48
  },
  itemPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }]
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0
  }
});
