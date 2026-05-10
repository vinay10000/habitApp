import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { isHabitComplete } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { calculateCurrentStreak } from "@/features/streaks/streaks";
import { TIME_OF_DAY_ORDER } from "@/lib/constants";
import { toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { Habit } from "@/types/habit";

const days = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return date;
});

function completionRateForDate(habits: Habit[], completions: ReturnType<typeof useHabitStore.getState>["completions"], date: Date) {
  const scheduled = habits.filter((habit) => isHabitActiveOnDate(habit, date));
  const dateKey = toDateKey(date);
  const done = scheduled.filter((habit) => isHabitComplete(habit, completions, dateKey)).length;
  return scheduled.length ? Math.round((done / scheduled.length) * 100) : 0;
}

export default function AnalyticsScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const allHabits = useHabitStore((state) => state.habits);
  const completions = useHabitStore((state) => state.completions);
  const habits = useMemo(
    () => allHabits.filter((habit) => !habit.archivedAt).map((habit) => ({ ...habit, streak: calculateCurrentStreak(habit, completions) })),
    [allHabits, completions]
  );
  const todayHabits = useMemo(() => habits.filter((habit) => isHabitActiveOnDate(habit)), [habits]);
  const completedCount = todayHabits.filter((habit) => isHabitComplete(habit, completions)).length;
  const completionRate = todayHabits.length ? Math.round((completedCount / todayHabits.length) * 100) : 0;
  const strongest = [...habits].sort((left, right) => right.streak - left.streak)[0];
  const remaining = Math.max(todayHabits.length - completedCount, 0);
  const weeklyRates = days.map((day) => completionRateForDate(habits, completions, day));
  const weeklyScore = weeklyRates.length ? Math.round(weeklyRates.reduce((sum, rate) => sum + rate, 0) / weeklyRates.length) : 0;
  const bestCategory =
    Object.entries(
      habits.reduce<Record<string, number>>((acc, habit) => {
        acc[habit.category] = (acc[habit.category] ?? 0) + habit.streak;
        return acc;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "personal";
  const weakestTime = TIME_OF_DAY_ORDER.map((timeOfDay) => {
    const scoped = todayHabits.filter((habit) => habit.timeOfDay === timeOfDay);
    const done = scoped.filter((habit) => isHabitComplete(habit, completions)).length;
    return { timeOfDay, rate: scoped.length ? done / scoped.length : 1, total: scoped.length };
  })
    .filter((item) => item.total > 0)
    .sort((left, right) => left.rate - right.rate)[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader showBack={false} eyebrow="Analytics" title="Signals, not clutter." />

        <View style={styles.metricHero}>
          <Text style={styles.metric}>{completionRate}%</Text>
          <Text style={styles.label}>Today complete</Text>
        </View>

        <View style={styles.grid}>
          <MetricCard label="Left" value={remaining} styles={styles} />
          <MetricCard label="Best streak" value={strongest?.streak ?? 0} styles={styles} />
          <MetricCard label="Weekly" value={`${weeklyScore}%`} styles={styles} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.noteTitle}>7 day rhythm</Text>
            <Text style={styles.metricTiny}>{weeklyScore}%</Text>
          </View>
          <View style={styles.bars}>
            {weeklyRates.map((rate, index) => (
              <View key={`${index}-${rate}`} style={styles.barColumn}>
                <View style={[styles.bar, { height: Math.max(12, rate) }]} />
                <Text style={styles.barLabel}>{rate}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.noteTitle}>Useful signals</Text>
          <Text style={styles.noteText}>Strongest area: {bestCategory}</Text>
          <Text style={styles.noteText}>Weakest time: {weakestTime ? `${weakestTime.timeOfDay} needs the gentlest nudge.` : "No weak spot today."}</Text>
          <Text style={styles.noteText}>Next move: {remaining ? "Protect one tiny completion." : "Enjoy the cleared list."}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, styles }: { label: string; value: number | string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.card}>
      <Text style={styles.metricSmall}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
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
    metricHero: {
      minHeight: 156,
      borderRadius: radius.xl,
      padding: spacing.lg,
      justifyContent: "flex-end",
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.line
    },
    grid: {
      flexDirection: "row",
      gap: spacing.sm
    },
    card: {
      flex: 1,
      minHeight: 104,
      borderRadius: radius.lg,
      padding: spacing.md,
      justifyContent: "flex-end",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    metric: {
      color: colors.accent,
      fontSize: 70,
      lineHeight: 76,
      fontWeight: "900",
      fontVariant: ["tabular-nums"]
    },
    metricSmall: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "900",
      fontVariant: ["tabular-nums"]
    },
    metricTiny: {
      color: colors.accent,
      fontSize: 22,
      fontWeight: "900"
    },
    label: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "800"
    },
    panel: {
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    noteTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    noteText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 20,
      fontWeight: "700"
    },
    bars: {
      minHeight: 114,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm
    },
    barColumn: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs
    },
    bar: {
      width: "100%",
      maxHeight: 100,
      borderRadius: radius.pill,
      backgroundColor: colors.accent
    },
    barLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800"
    }
  });
}
