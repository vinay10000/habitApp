import { useMemo } from "react";
import { Link, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { isHabitComplete } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { calculateCurrentStreak } from "@/features/streaks/streaks";
import { toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";

const days = Array.from({ length: 21 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (20 - index));
  return date;
});

export default function StreaksScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const allHabits = useHabitStore((state) => state.habits);
  const completions = useHabitStore((state) => state.completions);
  const habits = useMemo(
    () => allHabits.filter((habit) => !habit.archivedAt).map((habit) => ({ ...habit, streak: calculateCurrentStreak(habit, completions) })),
    [allHabits, completions]
  );
  const strongest = [...habits].sort((left, right) => right.streak - left.streak)[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader showBack={false} eyebrow="Streaks" title="Momentum without pressure." />

        <View style={styles.heroCard}>
          <Text style={styles.heroNumber}>{strongest?.streak ?? 0}</Text>
          <View style={styles.heroCopy}>
            <Text style={styles.heroText}>{strongest ? `${strongest.title}` : "Start one habit today"}</Text>
            <Text style={styles.recoveryText}>Current strongest streak</Text>
          </View>
        </View>

        <View style={styles.legend}>
          <LegendItem label="Done" tone="done" styles={styles} />
          <LegendItem label="Open today" tone="recovery" styles={styles} />
          <LegendItem label="Rest" tone="skipped" styles={styles} />
        </View>

        <View style={styles.list}>
          {habits.map((habit) => (
            <Link key={habit.id} href={`/streaks/${habit.id}` as Href} asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.habitTitle} numberOfLines={1}>{habit.title}</Text>
                  <Text style={styles.habitMeta}>{habit.type === "negative" ? "avoidance" : habit.category}</Text>
                </View>
                <Text style={styles.streak}>{habit.streak}d</Text>
              </View>
              <View style={styles.dots}>
                {days.map((date) => {
                  const dateKey = toDateKey(date);
                  const scheduled = isHabitActiveOnDate(habit, date);
                  const done = scheduled && isHabitComplete(habit, completions, dateKey);
                  const recovery = scheduled && !done && dateKey === toDateKey();

                  return <View key={dateKey} style={[styles.dot, !scheduled && styles.dotSkipped, recovery && styles.dotRecovery, done && styles.dotDone]} />;
                })}
              </View>
            </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ label, tone, styles }: { label: string; tone: "done" | "recovery" | "skipped"; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, tone === "done" && styles.dotDone, tone === "recovery" && styles.dotRecovery, tone === "skipped" && styles.dotSkipped]} />
      <Text style={styles.legendText}>{label}</Text>
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
    heroCard: {
      minHeight: 136,
      borderRadius: radius.xl,
      padding: spacing.lg,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.md
    },
    heroNumber: {
      color: colors.accent,
      fontSize: 66,
      lineHeight: 72,
      fontWeight: "900",
      fontVariant: ["tabular-nums"]
    },
    heroCopy: {
      flex: 1,
      paddingBottom: spacing.sm
    },
    heroText: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    recoveryText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "800"
    },
    list: {
      gap: spacing.sm
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    legendItem: {
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted
    },
    legendText: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    card: {
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
    },
    cardCopy: {
      flex: 1,
      minWidth: 0
    },
    habitTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    habitMeta: {
      color: colors.textMuted,
      fontSize: typography.meta,
      marginTop: 2,
      fontWeight: "800",
      textTransform: "capitalize"
    },
    streak: {
      color: colors.accent,
      fontSize: typography.body,
      fontWeight: "900"
    },
    dots: {
      flexDirection: "row",
      gap: 4
    },
    dot: {
      flex: 1,
      height: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted
    },
    dotSkipped: {
      opacity: 0.35
    },
    dotRecovery: {
      backgroundColor: colors.warning,
      opacity: 0.75
    },
    dotDone: {
      backgroundColor: colors.accent,
      opacity: 1
    }
  });
}
