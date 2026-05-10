import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { isHabitComplete } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { toDateKey } from "@/lib/dates";
import { syncReminderSchedule } from "@/lib/reminders";
import { useHabitStore } from "@/store/habitStore";
import { type HabitReminderPreference, useSettingsStore } from "@/store/settingsStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { Habit } from "@/types/habit";

const hourOptions = [6, 8, 10, 12, 15, 18, 20, 22];

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display} ${suffix}`;
}

function reminderFor(habitId: string, reminders: Record<string, HabitReminderPreference>, fallbackHour: number): HabitReminderPreference {
  return reminders[habitId] ?? { mode: "default", hour: fallbackHour };
}

export default function NotificationsScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const allHabits = useHabitStore((state) => state.habits);
  const completions = useHabitStore((state) => state.completions);
  const dailyReminder = useSettingsStore((state) => state.dailyReminder);
  const reminderHour = useSettingsStore((state) => state.reminderHour);
  const setReminderHour = useSettingsStore((state) => state.setReminderHour);
  const habitReminders = useSettingsStore((state) => state.habitReminders);
  const setHabitReminder = useSettingsStore((state) => state.setHabitReminder);
  const toggle = useSettingsStore((state) => state.toggle);
  const dateKey = toDateKey();
  const habits = useMemo(() => allHabits.filter((habit) => !habit.archivedAt), [allHabits]);
  const activeToday = useMemo(() => habits.filter((habit) => isHabitActiveOnDate(habit)), [habits]);
  const defaultQueue = activeToday.filter((habit) => {
    const preference = habitReminders[habit.id];
    return preference?.mode !== "custom" && preference?.mode !== "off" && !isHabitComplete(habit, completions, dateKey);
  });
  const customQueue = activeToday.filter((habit) => {
    const preference = habitReminders[habit.id];
    return preference?.mode === "custom" && !isHabitComplete(habit, completions, dateKey);
  });

  useEffect(() => {
    void syncReminderSchedule({ habits: allHabits, completions, dailyReminder, reminderHour, habitReminders }).catch(() => undefined);
  }, [allHabits, completions, dailyReminder, habitReminders, reminderHour]);

  const setMode = (habit: Habit, mode: HabitReminderPreference["mode"]) => {
    const current = reminderFor(habit.id, habitReminders, reminderHour);
    setHabitReminder(habit.id, { mode, hour: current.hour || reminderHour });
  };

  const setHour = (habit: Habit, hour: number) => {
    setHabitReminder(habit.id, { mode: "custom", hour });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Notifications" title="Reminder rhythm." subtitle="Use one default unfinished-habit nudge, or give specific habits their own time." />

        <View style={styles.heroPanel}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications" size={24} color={colors.accentText} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{dailyReminder ? `${defaultQueue.length} on default` : "Default off"}</Text>
            <Text style={styles.heroSubtitle}>{customQueue.length} custom reminder{customQueue.length === 1 ? "" : "s"} set for unfinished habits today.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.defaultRow}>
            <View style={styles.defaultCopy}>
              <Text style={styles.sectionTitle}>Default unfinished reminder</Text>
              <Text style={styles.sectionDetail}>Habits set to Default use this time if they are still open.</Text>
            </View>
            <Switch value={dailyReminder} onValueChange={() => toggle("dailyReminder")} trackColor={{ false: colors.surfaceMuted, true: colors.accent }} thumbColor={dailyReminder ? colors.accentText : colors.textMuted} />
          </View>

          <View style={styles.hourRow}>
            {hourOptions.map((hour) => {
              const active = reminderHour === hour;

              return (
                <Pressable key={hour} onPress={() => setReminderHour(hour)} style={[styles.hourChip, active && styles.hourChipActive]}>
                  <Text style={[styles.hourText, active && styles.hourTextActive]}>{formatHour(hour)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit reminder mode</Text>
          <Text style={styles.sectionDetail}>Default respects the global reminder. Custom schedules a habit-specific nudge. Off stays quiet.</Text>

          {habits.length ? (
            <View style={styles.habitList}>
              {habits.map((habit) => {
                const reminder = reminderFor(habit.id, habitReminders, reminderHour);
                const complete = isHabitComplete(habit, completions, dateKey);

                return (
                  <View key={habit.id} style={styles.habitCard}>
                    <View style={styles.habitHeader}>
                      <View style={styles.habitIcon}>
                        <Ionicons name={complete ? "checkmark" : "ellipse-outline"} size={18} color={complete ? colors.accent : colors.tertiary} />
                      </View>
                      <View style={styles.habitCopy}>
                        <Text style={styles.habitTitle} numberOfLines={1}>{habit.title}</Text>
                        <Text style={styles.habitMeta}>{complete ? "Done today" : `${habit.timeOfDay} · ${habit.category}`}</Text>
                      </View>
                      <Text style={styles.habitTime}>{reminder.mode === "custom" ? formatHour(reminder.hour) : reminder.mode}</Text>
                    </View>

                    <View style={styles.segmented}>
                      {(["default", "custom", "off"] as const).map((mode) => {
                        const active = reminder.mode === mode;

                        return (
                          <Pressable key={mode} onPress={() => setMode(habit, mode)} style={[styles.segment, active && styles.segmentActive]}>
                            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{mode}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {reminder.mode === "custom" ? (
                      <View style={styles.hourRow}>
                        {hourOptions.map((hour) => {
                          const active = reminder.hour === hour;

                          return (
                            <Pressable key={hour} onPress={() => setHour(habit, hour)} style={[styles.miniHourChip, active && styles.hourChipActive]}>
                              <Text style={[styles.hourText, active && styles.hourTextActive]}>{formatHour(hour)}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyPanel}>
              <Ionicons name="leaf-outline" size={22} color={colors.tertiary} />
              <Text style={styles.emptyText}>Add a habit first, then set its reminder style here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
      paddingBottom: 120,
      gap: spacing.lg
    },
    heroPanel: {
      minHeight: 88,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    heroCopy: {
      flex: 1,
      minWidth: 0
    },
    heroTitle: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: "900"
    },
    heroSubtitle: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 19,
      fontWeight: "700"
    },
    section: {
      gap: spacing.md
    },
    defaultRow: {
      minHeight: 78,
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    defaultCopy: {
      flex: 1,
      minWidth: 0
    },
    sectionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    sectionDetail: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    hourRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    hourChip: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    miniHourChip: {
      minHeight: 36,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.whiteGlass,
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
    habitList: {
      gap: spacing.sm
    },
    habitCard: {
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.md
    },
    habitHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    habitIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    habitCopy: {
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
      fontWeight: "700"
    },
    habitTime: {
      color: colors.accent,
      fontSize: typography.meta,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    segmented: {
      flexDirection: "row",
      padding: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    segment: {
      flex: 1,
      minHeight: 36,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center"
    },
    segmentActive: {
      backgroundColor: colors.accent
    },
    segmentText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900",
      textTransform: "capitalize"
    },
    segmentTextActive: {
      color: colors.accentText
    },
    emptyPanel: {
      minHeight: 90,
      borderRadius: radius.lg,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 19,
      fontWeight: "700",
      textAlign: "center"
    }
  });
}
