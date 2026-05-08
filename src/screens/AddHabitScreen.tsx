import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ScreenHeader } from "@/components/ScreenHeader";
import { toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { HabitCategory, HabitType } from "@/types/habit";
import type { DayOfWeek, Schedule, TimeOfDay } from "@/types/schedule";

const habitTypes: { value: HabitType; label: string; description: string }[] = [
  { value: "binary", label: "Binary", description: "Done or not done" },
  { value: "count", label: "Count", description: "Tap to increment" },
  { value: "timer", label: "Timer", description: "Track focus minutes" },
  { value: "negative", label: "Avoid", description: "Track days avoided" }
];

const categories: { value: HabitCategory; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" },
  { value: "fitness", label: "Fitness" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "productivity", label: "Productivity" },
  { value: "personal", label: "Personal" }
];

const timeOptions: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "anytime", label: "Anytime" }
];

const days: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
];

const presets: {
  title: string;
  type: HabitType;
  category: HabitCategory;
  timeOfDay: TimeOfDay;
  targetCount?: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { title: "Drink water", type: "count", category: "health", timeOfDay: "anytime", targetCount: "8", icon: "water-outline" },
  { title: "Read", type: "binary", category: "learning", timeOfDay: "evening", icon: "book-outline" },
  { title: "Deep work", type: "timer", category: "productivity", timeOfDay: "morning", targetCount: "25", icon: "timer-outline" },
  { title: "No sugar", type: "negative", category: "health", timeOfDay: "anytime", icon: "shield-checkmark-outline" },
  { title: "Gym", type: "binary", category: "fitness", timeOfDay: "morning", icon: "barbell-outline" },
  { title: "Journal", type: "binary", category: "mindfulness", timeOfDay: "evening", icon: "pencil-outline" }
];

export default function AddHabitScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const addHabit = useHabitStore((state) => state.addHabit);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<HabitType>("binary");
  const [category, setCategory] = useState<HabitCategory>("health");
  const [schedule, setSchedule] = useState<Schedule>({ kind: "daily" });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  const [targetCount, setTargetCount] = useState("");
  const scheduleOptions = useMemo(
    () => [
      { value: { kind: "daily" } as Schedule, label: "Daily" },
      { value: { kind: "weekdays" } as Schedule, label: "Weekdays" },
      { value: { kind: "weekends" } as Schedule, label: "Weekends" },
      { value: { kind: "customDays", days: [1, 3, 5] } as Schedule, label: "Mon Wed Fri" },
      { value: { kind: "everyXDays", interval: 2, anchorDate: toDateKey() } as Schedule, label: "Every 2 days" },
      { value: { kind: "monthly", dayOfMonth: new Date().getDate() } as Schedule, label: "Monthly" },
      { value: { kind: "oneTime", date: toDateKey() } as Schedule, label: "Once today" }
    ],
    []
  );

  const canSubmit = title.trim().length > 0;
  const helperText = useMemo(() => {
    if (type === "count") {
      return "Each tap increments instantly.";
    }

    if (type === "timer") {
      return "Each tap adds five calm focus minutes.";
    }

    if (type === "negative") {
      return "Starts complete by default; tap only when you want to log a slip.";
    }

    return "Binary habits are the fastest way to build momentum.";
  }, [type]);

  const toggleCustomDay = (day: DayOfWeek) => {
    const currentDays = schedule.kind === "customDays" ? schedule.days : [];
    const nextDays = currentDays.includes(day) ? currentDays.filter((item) => item !== day) : [...currentDays, day].sort();
    setSchedule({ kind: "customDays", days: nextDays.length ? nextDays : [day] });
  };

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    addHabit({
      title: title.trim(),
      type,
      category,
      schedule,
      timeOfDay,
      targetCount: type === "count" || type === "timer" ? Math.max(1, Number(targetCount) || (type === "timer" ? 25 : 1)) : undefined
    });

    router.replace("/" as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Quick add"
          title="New habit."
          subtitle="Pick a preset or type the one thing you want to repeat."
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Presets</Text>
          <View style={styles.presetGrid}>
            {presets.map((preset) => (
              <Pressable
                key={preset.title}
                onPress={() => {
                  setTitle(preset.title);
                  setType(preset.type);
                  setCategory(preset.category);
                  setTimeOfDay(preset.timeOfDay);
                  setSchedule({ kind: "daily" });
                  setTargetCount(preset.targetCount ?? "");
                }}
                style={styles.presetChip}
              >
                <Ionicons name={preset.icon} size={17} color={colors.tertiary} />
                <Text style={styles.presetText}>{preset.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Drink water"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Type</Text>
          <View style={styles.optionsGrid}>
            {habitTypes.map((option) => {
              const active = type === option.value;

              return (
                <Pressable key={option.value} onPress={() => setType(option.value)} style={[styles.optionCard, active && styles.optionCardActive]}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.tagRow}>
            {categories.map((option) => {
              const active = category === option.value;

              return (
                <Pressable key={option.value} onPress={() => setCategory(option.value)} style={[styles.tag, active && styles.tagActive]}>
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Schedule</Text>
          <View style={styles.tagRow}>
            {scheduleOptions.map((option) => {
              const active = schedule.kind === option.value.kind;

              return (
                <Pressable key={option.label} onPress={() => setSchedule(option.value)} style={[styles.tag, active && styles.tagActive]}>
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {schedule.kind === "customDays" ? (
            <View style={styles.tagRow}>
              {days.map((day) => {
                const active = schedule.days.includes(day.value);

                return (
                  <Pressable key={day.value} onPress={() => toggleCustomDay(day.value)} style={[styles.dayChip, active && styles.tagActive]}>
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{day.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time of day</Text>
          <View style={styles.tagRow}>
            {timeOptions.map((option) => {
              const active = timeOfDay === option.value;

              return (
                <Pressable key={option.value} onPress={() => setTimeOfDay(option.value)} style={[styles.tag, active && styles.tagActive]}>
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {type === "count" || type === "timer" ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{type === "timer" ? "Focus minutes" : "Target count"}</Text>
            <TextInput
              value={targetCount}
              onChangeText={setTargetCount}
              keyboardType="number-pad"
              placeholder={type === "timer" ? "Minutes" : "Target"}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewTitle}>{title.trim() || "Untitled habit"}</Text>
              <Ionicons name="sparkles" size={18} color={colors.textMuted} />
            </View>
            <Text style={styles.previewMeta}>{helperText}</Text>
            <View style={styles.previewFooter}>
              <Text style={styles.previewFooterLabel}>{category}</Text>
              <Text style={styles.previewFooterLabel}>{timeOfDay}</Text>
              <Text style={styles.previewFooterLabel}>{schedule.kind}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.back()} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={submit} disabled={!canSubmit} style={[styles.primaryAction, !canSubmit && styles.primaryActionDisabled]}>
            <Text style={styles.primaryActionText}>Add habit</Text>
          </Pressable>
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
    paddingBottom: spacing.xxl + 70,
    gap: spacing.lg
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: typography.meta,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  input: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.whiteGlass,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
    fontWeight: "700"
  },
  optionsGrid: {
    gap: spacing.sm
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  presetChip: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  presetText: {
    color: colors.text,
    fontSize: typography.meta,
    fontWeight: "800"
  },
  optionCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    gap: 4
  },
  optionCardActive: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.accentSoft
  },
  optionLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: typography.meta,
    lineHeight: 18
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.whiteGlass,
    borderWidth: 1,
    borderColor: colors.line
  },
  dayChip: {
    flex: 1,
    minWidth: 42,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.whiteGlass,
    borderWidth: 1,
    borderColor: colors.line
  },
  tagActive: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.accentSoft
  },
  tagText: {
    color: colors.textMuted,
    fontSize: typography.meta,
    fontWeight: "700"
  },
  tagTextActive: {
    color: colors.accent
  },
  previewCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  previewTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  previewMeta: {
    color: colors.textMuted,
    fontSize: typography.meta,
    lineHeight: 18
  },
  previewFooter: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  previewFooterLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  secondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: typography.meta,
    fontWeight: "800"
  },
  primaryAction: {
    flex: 1.2,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 5
  },
  primaryActionDisabled: {
    opacity: 0.45
  },
  primaryActionText: {
    color: colors.accentText,
    fontSize: typography.meta,
    fontWeight: "800"
  }
  });
}
