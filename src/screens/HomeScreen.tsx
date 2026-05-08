import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TimelineSection } from "@/components/TimelineSection";
import { getCompletionForHabit, isHabitComplete } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { calculateCurrentStreak } from "@/features/streaks/streaks";
import { TIME_OF_DAY_ORDER } from "@/lib/constants";
import { toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import { useAuthStore } from "@/store/authStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import { useOnboardingStore } from "@/store/onboardingStore";

function profileLabel(email: string, signedIn: boolean, displayName: string) {
  if (displayName.trim()) {
    return displayName.trim();
  }

  if (!signedIn) {
    return "Local Mode";
  }

  const [name] = email.split("@");
  const readable = name
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return readable || "Habit Keeper";
}

function profileInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function HomeScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const userId = useAuthStore((state) => state.userId);
  const email = useAuthStore((state) => state.email);
  const displayName = useOnboardingStore((state) => state.displayName);
  const allHabits = useHabitStore((state) => state.habits);
  const completions = useHabitStore((state) => state.completions);
  const habits = useMemo(
    () => allHabits.filter((habit) => isHabitActiveOnDate(habit)).map((habit) => ({ ...habit, streak: calculateCurrentStreak(habit, completions) })),
    [allHabits, completions]
  );
  const archiveHabit = useHabitStore((state) => state.archiveHabit);
  const toggleHabitCompletion = useHabitStore((state) => state.toggleHabitCompletion);
  const startTimerSession = useHabitStore((state) => state.startTimerSession);
  const pauseTimerSession = useHabitStore((state) => state.pauseTimerSession);
  const resumeTimerSession = useHabitStore((state) => state.resumeTimerSession);
  const cancelTimerSession = useHabitStore((state) => state.cancelTimerSession);
  const finishTimerSession = useHabitStore((state) => state.finishTimerSession);
  const timerSession = useHabitStore((state) => state.timerSession);
  const loading = useHabitStore((state) => state.loading);
  const error = useHabitStore((state) => state.error);
  const dateKey = toDateKey();

  const summary = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((habit) => isHabitComplete(habit, completions, dateKey)).length;
    const remaining = Math.max(total - done, 0);
    const countTapCount = habits.reduce((acc, habit) => {
      if (habit.type !== "count" && habit.type !== "timer") {
        return acc;
      }

      return acc + (getCompletionForHabit(habit.id, completions, dateKey)?.count ?? 0);
    }, 0);

    return { total, done, remaining, countTapCount, progress: total ? done / total : 0 };
  }, [completions, dateKey, habits]);

  const signedIn = userId !== "local-user";
  const profileName = profileLabel(email, signedIn, displayName);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topChrome}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profileInitials(profileName)}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{profileName}</Text>
            </View>
            <Link href="/settings" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open reminder settings">
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.progressPanel}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressValue}>{summary.done}/{summary.total}</Text>
              <Text style={styles.progressLabel}>{summary.remaining ? `${summary.remaining} left` : "clear for today"}</Text>
            </View>
            <Text style={styles.progressPercent}>{Math.round(summary.progress * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(summary.progress * 100, summary.done ? 12 : 0)}%` }]} />
          </View>
          <View style={styles.statRow}>
            <StatPill label="tracked" value={summary.countTapCount} styles={styles} />
            <StatPill label="habits" value={summary.total} styles={styles} />
            <StatPill label="done" value={summary.done} styles={styles} />
          </View>
        </View>

        {loading ? <Text style={styles.statusText}>Working...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {habits.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Ionicons name="leaf-outline" size={24} color={colors.tertiary} />
            <Text style={styles.emptyTitle}>No habits for today</Text>
            <Text style={styles.emptyText}>{signedIn ? "Your synced account has no habits scheduled today." : "Create one quick local habit and it will stay on this device."}</Text>
            <View style={styles.emptyActions}>
              {!signedIn ? (
                <Link href="/auth" asChild>
                  <Pressable style={styles.applyButton}>
                    <Text style={styles.applyText}>Sign in</Text>
                  </Pressable>
                </Link>
              ) : null}
              <Link href="/add" asChild>
                <Pressable style={styles.smallChip}>
                  <Text style={styles.smallChipText}>Add habit</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        ) : null}

        <View style={styles.timeline}>
          {TIME_OF_DAY_ORDER.map((timeOfDay) => (
            <TimelineSection
              key={timeOfDay}
              timeOfDay={timeOfDay}
              habits={habits.filter((habit) => habit.timeOfDay === timeOfDay)}
              completions={completions}
              onComplete={(habitId) => {
                const habit = habits.find((item) => item.id === habitId);
                const complete = habit ? isHabitComplete(habit, completions, dateKey) : false;

                if (habit?.type === "timer" && !complete) {
                  startTimerSession(habitId);
                  return;
                }

                toggleHabitCompletion(habitId);
              }}
              onArchive={archiveHabit}
            />
          ))}
        </View>

        {timerSession ? (
          <View style={styles.timerPanel}>
            <View>
              <Text style={styles.sectionTitle}>Focus timer running</Text>
              <Text style={styles.sectionMeta}>Finish saves minutes to the selected hobby or work habit.</Text>
            </View>
            <View style={styles.timerActions}>
              <Pressable onPress={timerSession.running ? pauseTimerSession : resumeTimerSession} style={styles.smallChip}>
                <Ionicons name={timerSession.running ? "pause" : "play"} size={16} color={colors.text} />
                <Text style={styles.smallChipText}>{timerSession.running ? "Pause" : "Resume"}</Text>
              </Pressable>
              <Pressable onPress={finishTimerSession} style={styles.applyButton}>
                <Text style={styles.applyText}>Finish</Text>
              </Pressable>
              <Pressable onPress={cancelTimerSession} style={styles.smallChip}>
                <Text style={styles.smallChipText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value, styles }: { label: string; value: number; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    topChrome: {
      borderRadius: 26,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      shadowColor: colors.accent,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 28,
      elevation: 5
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent
    },
    avatarText: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: "900"
    },
    profileCopy: {
      flex: 1,
      minWidth: 0
    },
    date: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    profileName: {
      color: colors.text,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "900"
    },
    iconButton: {
      width: 46,
      height: 46,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent"
    },
    progressPanel: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.md
    },
    progressTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between"
    },
    progressValue: {
      color: colors.text,
      fontSize: 38,
      lineHeight: 42,
      fontWeight: "900"
    },
    progressLabel: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "800",
      marginTop: 2
    },
    progressPercent: {
      color: colors.accent,
      fontSize: 26,
      fontWeight: "900"
    },
    progressTrack: {
      height: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden"
    },
    progressFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accent
    },
    statRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    statPill: {
      flex: 1,
      minHeight: 54,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900"
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    sectionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    sectionMeta: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      marginTop: 2
    },
    smallChip: {
      minHeight: 42,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs
    },
    smallChipText: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "800"
    },
    applyButton: {
      minHeight: 42,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    applyText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    timerPanel: {
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.tertiarySoft,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.md
    },
    timerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    statusText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "800",
      textAlign: "center"
    },
    errorText: {
      color: colors.warning,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "800",
      textAlign: "center"
    },
    timeline: {
      gap: spacing.md
    },
    emptyPanel: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.sm
    },
    emptyTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 19,
      fontWeight: "700"
    },
    emptyActions: {
      flexDirection: "row",
      gap: spacing.sm,
      flexWrap: "wrap",
      marginTop: spacing.xs
    }
  });
}
