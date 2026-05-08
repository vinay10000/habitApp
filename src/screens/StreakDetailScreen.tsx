import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isHabitComplete } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { calculateBestStreak, calculateCurrentStreak } from "@/features/streaks/streaks";
import { toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import { getScheduleLabel } from "@/types/schedule";
import type { Habit, HabitCompletion } from "@/types/habit";

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function buildMonthDays(date = new Date()) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: mondayOffset }, () => null);

  for (let day = 1; day <= last.getDate(); day += 1) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), day, 12));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function countDoneDays(habit: Habit, completions: HabitCompletion[]) {
  const created = new Date(habit.createdAt);
  const cursor = new Date(created.getFullYear(), created.getMonth(), created.getDate(), 12);
  const today = new Date();
  let total = 0;

  for (let index = 0; index < 730 && cursor <= today; index += 1) {
    if (isHabitActiveOnDate(habit, cursor) && isHabitComplete(habit, completions, toDateKey(cursor))) {
      total += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

export default function StreakDetailScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const habits = useHabitStore((state) => state.habits);
  const completions = useHabitStore((state) => state.completions);
  const habit = habits.find((item) => item.id === habitId);
  const days = useMemo(() => buildMonthDays(), []);

  if (!habit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missing}>
          <Text style={styles.title}>Habit not found</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentStreak = calculateCurrentStreak(habit, completions);
  const bestStreak = calculateBestStreak(habit, completions);
  const totalDone = countDoneDays(habit, completions);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back to streaks">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.brand}>Glacier AI</Text>
          <View style={styles.iconButtonGhost}>
            <Ionicons name="mic-outline" size={16} color={colors.textMuted} />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name={habit.type === "timer" ? "timer-outline" : habit.type === "negative" ? "shield-checkmark-outline" : "walk-outline"} size={34} color={colors.tertiary} />
          </View>
          <Text style={styles.title} numberOfLines={2}>{habit.title}</Text>
          <View style={styles.badges}>
            <Text style={styles.badge}>{habit.category}</Text>
            <Text style={styles.badge}>{getScheduleLabel(habit.schedule)}</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <Metric label="Current streak" value={`${currentStreak}`} suffix="Days" styles={styles} />
          <Metric label="Total" value={`${totalDone}`} suffix="Sessions" styles={styles} />
        </View>

        <View style={styles.wideMetric}>
          <Metric label="Best" value={`${bestStreak}`} suffix="Days" styles={styles} />
        </View>

        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{monthLabel(new Date())}</Text>
            <View style={styles.calendarArrows}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </View>

          <View style={styles.weekRow}>
            {weekdayLabels.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map((date, index) => {
              const dateKey = date ? toDateKey(date) : `blank-${index}`;
              const future = date ? date > new Date() : false;
              const scheduled = date ? isHabitActiveOnDate(habit, date) : false;
              const done = date && !future ? isHabitComplete(habit, completions, toDateKey(date)) : false;

              return (
                <View key={dateKey} style={[styles.dayCell, !date && styles.blankCell, scheduled && styles.scheduledCell, done && styles.doneCell, future && styles.futureCell]}>
                  {date ? <Text style={[styles.dayText, done && styles.dayTextDone]}>{date.getDate()}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, suffix, styles }: { label: string; value: string; suffix: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}<Text style={styles.metricSuffix}> {suffix}</Text></Text>
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
      gap: spacing.md
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    iconButtonGhost: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center"
    },
    brand: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    hero: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.lg
    },
    heroIcon: {
      width: 68,
      height: 68,
      borderRadius: radius.pill,
      backgroundColor: colors.tertiarySoft,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    title: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
      textAlign: "center"
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.xs
    },
    badge: {
      overflow: "hidden",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      backgroundColor: colors.surface,
      color: colors.tertiary,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "capitalize"
    },
    metricGrid: {
      flexDirection: "row",
      gap: spacing.sm
    },
    metricCard: {
      flex: 1,
      minHeight: 84,
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      justifyContent: "center",
      gap: spacing.xs
    },
    wideMetric: {
      minHeight: 86
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    metricValue: {
      color: colors.tertiary,
      fontSize: 24,
      fontWeight: "900"
    },
    metricSuffix: {
      color: colors.text,
      fontSize: typography.meta
    },
    calendarPanel: {
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.md
    },
    calendarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    calendarTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    calendarArrows: {
      flexDirection: "row",
      gap: spacing.md
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between"
    },
    weekLabel: {
      width: 34,
      textAlign: "center",
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900"
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    dayCell: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.line
    },
    blankCell: {
      opacity: 0,
      borderWidth: 0
    },
    scheduledCell: {
      backgroundColor: colors.surfaceMuted
    },
    doneCell: {
      backgroundColor: colors.tertiary,
      borderColor: colors.tertiary
    },
    futureCell: {
      opacity: 0.45
    },
    dayText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    dayTextDone: {
      color: colors.accentText
    },
    missing: {
      flex: 1,
      padding: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md
    },
    primaryButton: {
      minHeight: 46,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: "900"
    }
  });
}
