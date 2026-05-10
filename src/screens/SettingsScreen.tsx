import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { CONTRACT_VERSION } from "@/lib/contract-version";
import { toDateKey } from "@/lib/dates";
import { syncReminderSchedule } from "@/lib/reminders";
import { useAuthStore } from "@/store/authStore";
import { useHabitStore } from "@/store/habitStore";
import { type ThemeName, useSettingsStore } from "@/store/settingsStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";

const themes: { value: ThemeName; label: string; detail: string; colors: string[] }[] = [
  { value: "amoled", label: "Forest", detail: "Dark, high contrast", colors: ["#10120F", "#D7F66D", "#8ED8C5"] },
  { value: "monochrome", label: "Mono", detail: "Quiet grayscale", colors: ["#090909", "#F0F0DE", "#B9C7BA"] },
  { value: "paper", label: "Paper", detail: "Warm daylight", colors: ["#F5F1E6", "#245C47", "#9C4F32"] },
  { value: "pastel", label: "Dusk", detail: "Soft night color", colors: ["#14151D", "#F2C36B", "#84C8E8"] }
];

const hourOptions = [8, 12, 18, 20, 22];

export default function SettingsScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const userId = useAuthStore((state) => state.userId);
  const email = useAuthStore((state) => state.email);
  const signOut = useAuthStore((state) => state.signOut);
  const allHabits = useHabitStore((state) => state.habits);
  const habits = useMemo(() => allHabits.filter((habit) => isHabitActiveOnDate(habit)), [allHabits]);
  const completions = useHabitStore((state) => state.completions);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const loadSettings = useSettingsStore((state) => state.load);
  const dailyReminder = useSettingsStore((state) => state.dailyReminder);
  const reminderHour = useSettingsStore((state) => state.reminderHour);
  const habitReminders = useSettingsStore((state) => state.habitReminders);
  const setReminderHour = useSettingsStore((state) => state.setReminderHour);
  const toggle = useSettingsStore((state) => state.toggle);
  const signedIn = userId !== "local-user";
  const dateKey = toDateKey();
  const completedToday = habits.filter((habit) => completions.some((completion) => completion.habitId === habit.id && completion.completedOn === dateKey && completion.count > 0)).length;
  const remaining = Math.max(habits.length - completedToday, 0);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void syncReminderSchedule({ habits: allHabits, completions, dailyReminder, reminderHour, habitReminders }).catch(() => undefined);
  }, [allHabits, completions, dailyReminder, habitReminders, reminderHour, remaining]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader showBack={false} eyebrow="Settings" title="Make it yours." />

        <View style={styles.accountPanel}>
          <View style={styles.accountIcon}>
            <Ionicons name="person-outline" size={20} color={colors.accentText} />
          </View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountLabel}>Signed in</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{email}</Text>
          </View>
          <Pressable onPress={() => signedIn ? void signOut() : router.push("/auth")} style={styles.signOutButton}>
            <Text style={styles.signOutText}>{signedIn ? "Sign out" : "Sign in"}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeGrid}>
            {themes.map((option) => {
              const active = theme === option.value;

              return (
                <Pressable key={option.value} onPress={() => setTheme(option.value)} style={[styles.themeCard, active && styles.themeCardActive]}>
                  <View style={styles.swatches}>
                    {option.colors.map((swatch) => (
                      <View key={swatch} style={[styles.swatch, { backgroundColor: swatch }]} />
                    ))}
                  </View>
                  <Text style={[styles.themeTitle, active && styles.themeTitleActive]}>{option.label}</Text>
                  <Text style={styles.themeDetail}>{option.detail}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <SettingToggle title="Daily reminder" subtitle={`A quiet nudge around ${reminderHour}:00 for unfinished habits.`} value={dailyReminder} onChange={() => toggle("dailyReminder")} styles={styles} colors={colors} />
          <Pressable onPress={() => router.push("/notifications")} style={styles.notificationLink}>
            <View style={styles.notificationIcon}>
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.notificationCopy}>
              <Text style={styles.notificationTitle}>Habit reminders</Text>
              <Text style={styles.notificationSubtitle}>Set custom reminder times or use the default nudge.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
           <View style={styles.hourRow}>
             {hourOptions.map((hour) => {
               const active = reminderHour === hour;

               return (
                 <Pressable key={hour} onPress={() => setReminderHour(hour)} style={[styles.hourChip, active && styles.hourChipActive]}>
                   <Text style={[styles.hourText, active && styles.hourTextActive]}>{hour}:00</Text>
                 </Pressable>
               );
             })}
           </View>
         </View>

        <View style={styles.infoGrid}>
          <InfoCard icon="sparkles-outline" title="Voice" detail="Voice capture turns spoken text into a habit after one lightweight review." styles={styles} colors={colors} />
          <InfoCard icon="cloud-outline" title="Backup" detail="Supabase syncs habits, completions, streaks, and AI events when signed in." styles={styles} colors={colors} />
          <InfoCard icon="albums-outline" title="Widget" detail="Android widget refreshes from the same today snapshot after habit changes." styles={styles} colors={colors} />
          <InfoCard icon="git-branch-outline" title="Contract" detail={CONTRACT_VERSION} styles={styles} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingToggleProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeTokens["colors"];
};

function SettingToggle({ title, subtitle, value, onChange, styles, colors }: SettingToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.surfaceMuted, true: colors.accent }} thumbColor={value ? colors.accentText : colors.textMuted} />
    </View>
  );
}

function InfoCard({ icon, title, detail, styles, colors }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; styles: ReturnType<typeof createStyles>; colors: ThemeTokens["colors"] }) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={18} color={colors.tertiary} />
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDetail}>{detail}</Text>
    </View>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      padding: spacing.lg,
      paddingBottom: 108,
      gap: spacing.lg
    },
    accountPanel: {
      minHeight: 72,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    accountIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    accountCopy: {
      flex: 1,
      minWidth: 0
    },
    accountLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    accountEmail: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    signOutButton: {
      minHeight: 42,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    signOutText: {
      color: colors.warning,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    section: {
      gap: spacing.md,
      paddingTop: spacing.xs
    },
    sectionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    themeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    themeCard: {
      width: "48%",
      minHeight: 118,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.sm
    },
    themeCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft
    },
    swatches: {
      flexDirection: "row"
    },
    swatch: {
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      marginRight: -4,
      borderWidth: 1,
      borderColor: colors.line
    },
    themeTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    themeTitleActive: {
      color: colors.accent
    },
    themeDetail: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    toggleRow: {
      minHeight: 70,
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
    },
    toggleCopy: {
      flex: 1,
      gap: 3
    },
    toggleTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    toggleSubtitle: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    hourRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    notificationLink: {
      minHeight: 70,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center"
    },
    notificationCopy: {
      flex: 1,
      minWidth: 0
    },
    notificationTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    notificationSubtitle: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    hourChip: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    hourChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    hourText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    hourTextActive: {
      color: colors.accentText
    },
    infoGrid: {
      gap: spacing.sm
    },
    infoCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.xs
    },
    infoTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    infoDetail: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 19,
      fontWeight: "700"
    }
  });
}
