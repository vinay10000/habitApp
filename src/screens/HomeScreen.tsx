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
  if (displayName.trim()) return displayName.trim();
  if (!signedIn) return "Local User";
  const [name] = email.split("@");
  return name.charAt(0).toUpperCase() + name.slice(1);
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
  const timerSession = useHabitStore((state) => state.timerSession);
  const loading = useHabitStore((state) => state.loading);
  const dateKey = toDateKey();

  const summary = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((habit) => isHabitComplete(habit, completions, dateKey)).length;
    const countTapCount = habits.reduce((acc, habit) => {
      if (habit.type !== "count" && habit.type !== "timer") return acc;
      return acc + (getCompletionForHabit(habit.id, completions, dateKey)?.count ?? 0);
    }, 0);

    return { total, done, remaining: Math.max(total - done, 0), countTapCount, progress: total ? done / total : 0 };
  }, [completions, dateKey, habits]);

  const profileName = profileLabel(email, userId !== "local-user", displayName);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <View style={styles.userProfile}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{profileName.charAt(0)}</Text>
            </View>
            <Text style={styles.userNameMini}>{profileName}</Text>
          </View>
          <Link href="/notifications" asChild>
            <Pressable style={styles.roundBtn}>
              <Ionicons name="notifications" size={20} color={colors.text} />
              {summary.remaining > 0 && <View style={styles.badge} />}
            </Pressable>
          </Link>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nativeHeader}>
          <View>
            <Text style={styles.bigTitle}>Today</Text>
            <Text style={styles.dateLabel}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeValue}>{Math.round(summary.progress * 100)}%</Text>
            <Text style={styles.progressBadgeLabel}>done</Text>
          </View>
        </View>

        <View style={styles.integratedProgress}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{summary.done}/{summary.total}</Text>
              <Text style={styles.summaryLabel}>completed</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{summary.remaining}</Text>
              <Text style={styles.summaryLabel}>remaining</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{summary.countTapCount}</Text>
              <Text style={styles.summaryLabel}>tracked</Text>
            </View>
          </View>
          <View style={styles.trackContainer}>
            <View style={[styles.trackFill, { width: `${Math.max(summary.progress * 100, summary.done ? 10 : 0)}%` }]} />
          </View>
        </View>

        {loading && <Text style={styles.loadingText}>Updating...</Text>}

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyHeader}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="sparkles" size={24} color={colors.accent} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No habits scheduled</Text>
                <Text style={styles.emptyDesc}>Start with one small thing for today.</Text>
              </View>
            </View>
            <View style={styles.actionGroup}>
              <Link href="/voice" asChild>
                <Pressable style={styles.actionRow}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="mic" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>Speak a habit</Text>
                    <Text style={styles.actionSubtitle}>Tell Alex what you want to track.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              </Link>
              <View style={styles.actionDivider} />
              <Link href="/add" asChild>
                <Pressable style={styles.actionRow}>
                  <View style={styles.actionIconMuted}>
                    <Ionicons name="add" size={20} color={colors.text} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>Add manually</Text>
                    <Text style={styles.actionSubtitle}>Create a habit with your own settings.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              </Link>
            </View>
          </View>
        ) : (
          <View style={styles.nativeList}>
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
        )}
      </ScrollView>

      {timerSession && (
        <View style={styles.nativeMiniPlayer}>
          <Ionicons name="timer" size={22} color={colors.accent} />
          <Text style={styles.playerTitle}>Focus Session Active</Text>
          <Link href="/(tabs)" asChild>
            <Pressable style={styles.playerBtn}>
              <Text style={styles.playerBtnText}>View</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    topBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      backgroundColor: colors.background,
    },
    topBarContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      height: 44,
    },
    userProfile: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    avatarMini: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarMiniText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "900",
    },
    userNameMini: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    roundBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    scrollContent: {
      paddingTop: spacing.sm,
      paddingBottom: 160,
    },
    nativeHeader: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    bigTitle: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: 0,
    },
    dateLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 4,
    },
    progressBadge: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    progressBadgeValue: {
      fontSize: 15,
      fontWeight: "900",
      color: colors.accent,
      lineHeight: 18,
    },
    progressBadgeLabel: {
      fontSize: 9,
      fontWeight: "900",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    integratedProgress: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xl,
      padding: spacing.sm,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    trackContainer: {
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden",
      marginTop: spacing.sm,
    },
    trackFill: {
      height: "100%",
      backgroundColor: colors.accent,
    },
    summaryRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    summaryMetric: {
      flex: 1,
      minHeight: 58,
      borderRadius: radius.lg,
      backgroundColor: colors.whiteGlass,
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
    },
    summaryValue: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "900",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    summaryLabel: {
      marginTop: 2,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "900",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    nativeList: {
      gap: spacing.xxl,
    },
    emptyState: {
      marginHorizontal: spacing.lg,
      gap: spacing.lg,
    },
    emptyHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    emptyIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.line,
    },
    emptyCopy: {
      flex: 1,
      minWidth: 0,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
    },
    emptyDesc: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
    },
    actionGroup: {
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    actionRow: {
      minHeight: 78,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    actionIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
    },
    actionIconMuted: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
    },
    actionCopy: {
      flex: 1,
      minWidth: 0,
    },
    actionTitle: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "900",
    },
    actionSubtitle: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    actionDivider: {
      height: 1,
      marginLeft: spacing.md + 42 + spacing.md,
      backgroundColor: colors.line,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: "center",
      marginVertical: spacing.md,
    },
    nativeMiniPlayer: {
      position: "absolute",
      bottom: 100,
      left: spacing.lg,
      right: spacing.lg,
      height: 60,
      backgroundColor: colors.nav,
      borderRadius: 30,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    playerTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      flex: 1,
    },
    playerBtn: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 15,
    },
    playerBtnText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
    }
  });
}
