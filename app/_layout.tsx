import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { useAuthStore } from "@/store/authStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useSettingsStore } from "@/store/settingsStore";
import { getThemeTokens, setActiveTheme } from "@/theme/tokens";

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const loadOnboarding = useOnboardingStore((state) => state.load);
  const loadSettings = useSettingsStore((state) => state.load);
  const selectedTheme = useSettingsStore((state) => state.theme);
  const colors = getThemeTokens(selectedTheme).colors;

  useEffect(() => {
    void bootstrap();
    void loadOnboarding();
    void loadSettings();
  }, [bootstrap, loadOnboarding, loadSettings]);

  setActiveTheme(selectedTheme);

  return (
    <>
      <StatusBar style={colors.statusBar} backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" />
        <Stack.Screen name="voice" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="streaks/[habitId]" />
      </Stack>
    </>
  );
}
