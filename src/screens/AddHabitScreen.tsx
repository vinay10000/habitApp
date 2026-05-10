import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { addHabitDefaults, addHabitPresets, draftFromPreset, type AddHabitPreset } from "@/features/habits/addHabitDraft";
import { toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import { type HabitReminderPreference, useSettingsStore } from "@/store/settingsStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { HabitCategory, HabitType } from "@/types/habit";
import type { DayOfWeek, Schedule, TimeOfDay } from "@/types/schedule";

type FlowStep = "start" | "routine";

const habitTypes: { value: HabitType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "binary", label: "Simple check-off", description: "Tap once when it is done.", icon: "checkmark-circle-outline" },
  { value: "count", label: "Count", description: "Track reps, glasses, pages.", icon: "add-circle-outline" },
  { value: "timer", label: "Timer", description: "Track focused minutes.", icon: "timer-outline" },
  { value: "negative", label: "Avoid", description: "Protect your streak by not doing it.", icon: "shield-checkmark-outline" }
];

const categories: { value: HabitCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "health", label: "Health", icon: "leaf-outline" },
  { value: "learning", label: "Learning", icon: "book-outline" },
  { value: "fitness", label: "Fitness", icon: "barbell-outline" },
  { value: "mindfulness", label: "Mindful", icon: "sparkles-outline" },
  { value: "productivity", label: "Focus", icon: "briefcase-outline" },
  { value: "personal", label: "Personal", icon: "person-outline" }
];

const timeOptions: { value: TimeOfDay; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "morning", label: "Morning", icon: "partly-sunny-outline" },
  { value: "afternoon", label: "Afternoon", icon: "sunny-outline" },
  { value: "evening", label: "Evening", icon: "moon-outline" },
  { value: "anytime", label: "Anytime", icon: "infinite-outline" }
];

const primarySchedules: { value: Schedule; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: { kind: "daily" }, label: "Daily", icon: "repeat-outline" },
  { value: { kind: "weekdays" }, label: "Weekdays", icon: "briefcase-outline" },
  { value: { kind: "weekends" }, label: "Weekends", icon: "cafe-outline" },
  { value: { kind: "customDays", days: [1, 3, 5] }, label: "Custom", icon: "calendar-outline" }
];

const advancedSchedules: { value: Schedule; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: { kind: "everyXDays", interval: 2, anchorDate: toDateKey() }, label: "Every 2 days", detail: "A lighter repeating rhythm", icon: "reload-outline" },
  { value: { kind: "monthly", dayOfMonth: new Date().getDate() }, label: "Monthly", detail: "Repeat on this date each month", icon: "calendar-number-outline" },
  { value: { kind: "oneTime", date: toDateKey() }, label: "Today only", detail: "Create a single nudge for today", icon: "today-outline" }
];

const days: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" }
];

const reminderHours = [7, 8, 12, 18, 20, 22];

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display} ${suffix}`;
}

function scheduleLabel(schedule: Schedule) {
  if (schedule.kind === "customDays") {
    return schedule.days.map((day) => days.find((item) => item.value === day)?.label).join(" ");
  }

  if (schedule.kind === "everyXDays") {
    return `Every ${schedule.interval} days`;
  }

  if (schedule.kind === "monthly") {
    return "Monthly";
  }

  if (schedule.kind === "oneTime") {
    return "Today";
  }

  return schedule.kind === "daily" ? "Daily" : schedule.kind === "weekdays" ? "Weekdays" : "Weekends";
}

function categoryLabel(value: HabitCategory) {
  return categories.find((item) => item.value === value)?.label ?? "Personal";
}

function timeLabel(value: TimeOfDay) {
  return timeOptions.find((item) => item.value === value)?.label ?? "Anytime";
}

function triggerHaptic() {
  void Haptics.selectionAsync().catch(() => {});
}

export default function AddHabitScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const addHabit = useHabitStore((state) => state.addHabit);
  const reminderHour = useSettingsStore((state) => state.reminderHour);
  const setHabitReminder = useSettingsStore((state) => state.setHabitReminder);
  const [step, setStep] = useState<FlowStep>("start");
  const [title, setTitle] = useState(addHabitDefaults.title);
  const [type, setType] = useState<HabitType>(addHabitDefaults.type);
  const [category, setCategory] = useState<HabitCategory>(addHabitDefaults.category);
  const [schedule, setSchedule] = useState<Schedule>(addHabitDefaults.schedule);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(addHabitDefaults.timeOfDay);
  const [targetCount, setTargetCount] = useState(addHabitDefaults.targetCount);
  const [reminderMode, setReminderMode] = useState<HabitReminderPreference["mode"]>(addHabitDefaults.reminderMode);
  const [customReminderHour, setCustomReminderHour] = useState(reminderHour);
  const [selectedPreset, setSelectedPreset] = useState<AddHabitPreset | null>(null);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const canContinue = title.trim().length > 0;
  const needsTarget = type === "count" || type === "timer";
  const canSubmit = canContinue;
  const selectedType = habitTypes.find((item) => item.value === type) ?? habitTypes[0];
  const reminderLabel = reminderMode === "custom" ? formatHour(customReminderHour) : reminderMode === "default" ? `Default ${formatHour(reminderHour)}` : "Off";

  const applyDraft = (preset: AddHabitPreset) => {
    const next = draftFromPreset(preset);
    triggerHaptic();
    setSelectedPreset(preset);
    setTitle(next.title);
    setType(next.type);
    setCategory(next.category);
    setSchedule(next.schedule);
    setTimeOfDay(next.timeOfDay);
    setReminderMode(next.reminderMode);
    setTargetCount(next.targetCount);
  };

  const chooseType = (nextType: HabitType) => {
    triggerHaptic();
    setType(nextType);
    if (nextType !== "count" && nextType !== "timer") {
      setTargetCount("");
    } else if (!targetCount) {
      setTargetCount(nextType === "timer" ? "25" : "8");
    }
  };

  const chooseSchedule = (nextSchedule: Schedule) => {
    triggerHaptic();
    setSchedule(nextSchedule);
    if (nextSchedule.kind === "customDays") {
      setScheduleSheetOpen(true);
    }
  };

  const toggleCustomDay = (day: DayOfWeek) => {
    const currentDays = schedule.kind === "customDays" ? schedule.days : [];
    const nextDays = currentDays.includes(day) ? currentDays.filter((item) => item !== day) : [...currentDays, day].sort();
    setSchedule({ kind: "customDays", days: nextDays.length ? nextDays : [day] });
  };

  const changeTarget = (delta: number) => {
    const fallback = type === "timer" ? 25 : 1;
    const nextValue = Math.max(1, (Number(targetCount) || fallback) + delta);
    setTargetCount(String(nextValue));
  };

  const continueToRoutine = () => {
    if (!canContinue) {
      return;
    }

    triggerHaptic();
    setStep("routine");
  };

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    const habit = addHabit({
      title: title.trim(),
      type,
      category,
      schedule,
      timeOfDay,
      targetCount: needsTarget ? Math.max(1, Number(targetCount) || (type === "timer" ? 25 : 1)) : undefined
    });
    setHabitReminder(habit.id, { mode: reminderMode, hour: customReminderHour });
    triggerHaptic();
    router.replace("/" as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow={step === "start" ? "Add habit" : "Almost there"} title={step === "start" ? "What are you building?" : "Tune the routine."} subtitle={step === "start" ? "Start from a template or name your own." : "Smart defaults are already set. Adjust only what matters."} />

        <View style={styles.nameCard}>
          <View style={styles.nameIcon}>
            <Ionicons name={selectedType.icon} size={28} color={colors.accent} />
          </View>
          <TextInput
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setSelectedPreset(null);
            }}
            placeholder="Habit name"
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Habit name"
          />
        </View>

        <SectionHeader title="Quick presets" detail={selectedPreset ? `${selectedPreset.title} selected` : "Templates with defaults"} styles={styles} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRail}>
          {addHabitPresets.map((preset) => {
            const active = selectedPreset?.title === preset.title;

            return (
              <Pressable key={preset.title} onPress={() => applyDraft(preset)} style={[styles.presetCard, active && styles.presetCardActive]}>
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={[styles.presetTitle, active && styles.activeText]}>{preset.title}</Text>
                <Text style={styles.presetMeta}>
                  {categoryLabel(preset.category)} · {habitTypes.find((item) => item.value === preset.type)?.label.split(" ")[0]} · {scheduleLabel(preset.schedule)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedPreset ? (
          <View style={styles.templateSummary}>
            <Ionicons name="sparkles" size={17} color={colors.tertiary} />
            <Text style={styles.templateSummaryText}>
              {selectedPreset.title} selected · Goal: {selectedPreset.goal} · Reminder: {reminderLabel}
            </Text>
          </View>
        ) : null}

        <SectionHeader title="Habit type" detail="Pick how progress feels" styles={styles} />
        <View style={styles.typeGrid}>
          {habitTypes.map((option) => {
            const active = type === option.value;

            return (
              <Pressable key={option.value} onPress={() => chooseType(option.value)} style={[styles.typeCard, active && styles.typeCardActive]}>
                <View style={styles.typeCardTop}>
                  <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                    <Ionicons name={option.icon} size={20} color={active ? colors.accentText : colors.textMuted} />
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.accentText} /> : null}
                </View>
                <Text style={[styles.typeTitle, active && styles.typeTitleActive]}>{option.label}</Text>
                <Text style={[styles.typeDescription, active && styles.typeDescriptionActive]}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>

        {step === "routine" ? (
          <>
            {needsTarget ? (
              <View style={styles.goalCard}>
                <View style={styles.goalCopy}>
                  <Text style={styles.rowTitle}>{type === "timer" ? "Daily minutes" : "Daily goal"}</Text>
                  <Text style={styles.rowDetail}>{type === "timer" ? "How much time counts as done?" : "How many taps complete the day?"}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable onPress={() => changeTarget(-1)} style={styles.stepperButton} accessibilityLabel="Decrease target">
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </Pressable>
                  <TextInput value={targetCount} onChangeText={setTargetCount} keyboardType="number-pad" style={styles.stepperInput} />
                  <Pressable onPress={() => changeTarget(1)} style={styles.stepperButton} accessibilityLabel="Increase target">
                    <Ionicons name="add" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <SectionHeader title="Category" detail="Choose a home for it" styles={styles} />
            <View style={styles.chipWrap}>
              {categories.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  active={category === option.value}
                  onPress={() => {
                    triggerHaptic();
                    setCategory(option.value);
                  }}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>

            <SectionHeader title="How often?" detail={scheduleLabel(schedule)} styles={styles} />
            <View style={styles.chipWrap}>
              {primarySchedules.map((option) => (
                <ChoiceChip key={option.label} label={option.label} icon={option.icon} active={schedule.kind === option.value.kind} onPress={() => chooseSchedule(option.value)} styles={styles} colors={colors} />
              ))}
              <Pressable onPress={() => setScheduleSheetOpen(true)} style={styles.moreChip}>
                <Ionicons name="options-outline" size={15} color={colors.tertiary} />
                <Text style={styles.moreChipText}>More options</Text>
              </Pressable>
            </View>

            <SectionHeader title="Time of day" detail={timeLabel(timeOfDay)} styles={styles} />
            <View style={styles.segmented}>
              {timeOptions.map((option) => {
                const active = timeOfDay === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      triggerHaptic();
                      setTimeOfDay(option.value);
                    }}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Ionicons name={option.icon} size={15} color={active ? colors.accentText : colors.textMuted} />
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionHeader title="Reminder" detail={reminderLabel} styles={styles} />
            <View style={styles.reminderCard}>
              <View style={styles.reminderCopy}>
                <Text style={styles.rowTitle}>Nudge me</Text>
                <Text style={styles.rowDetail}>{reminderMode === "off" ? "No reminder for this habit." : reminderMode === "custom" ? `Custom reminder at ${formatHour(customReminderHour)}.` : `Use your default ${formatHour(reminderHour)} reminder.`}</Text>
              </View>
              <Pressable onPress={() => setReminderSheetOpen(true)} style={styles.changeButton}>
                <Text style={styles.changeButtonText}>Change</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.actionDock}>
        <View style={styles.previewCopy}>
          <Text style={styles.previewTitle} numberOfLines={1}>{title.trim() || "Untitled habit"}</Text>
          <Text style={styles.previewMeta} numberOfLines={1}>
            {selectedType.label} · {scheduleLabel(schedule)} · {timeLabel(timeOfDay)}
          </Text>
        </View>
        {step === "start" ? (
          <Pressable onPress={continueToRoutine} disabled={!canContinue} style={[styles.primaryAction, !canContinue && styles.primaryActionDisabled]}>
            <Text style={styles.primaryActionText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.accentText} />
          </Pressable>
        ) : (
          <Pressable onPress={submit} disabled={!canSubmit} style={[styles.primaryAction, !canSubmit && styles.primaryActionDisabled]}>
            <Ionicons name="checkmark" size={19} color={colors.accentText} />
            <Text style={styles.primaryActionText}>Create Habit</Text>
          </Pressable>
        )}
      </View>

      <ScheduleSheet
        open={scheduleSheetOpen}
        schedule={schedule}
        onClose={() => setScheduleSheetOpen(false)}
        onChoose={(nextSchedule) => {
          triggerHaptic();
          setSchedule(nextSchedule);
        }}
        onToggleDay={toggleCustomDay}
        styles={styles}
        colors={colors}
      />
      <ReminderSheet
        open={reminderSheetOpen}
        reminderMode={reminderMode}
        reminderHour={reminderHour}
        customReminderHour={customReminderHour}
        onClose={() => setReminderSheetOpen(false)}
        onMode={setReminderMode}
        onHour={setCustomReminderHour}
        styles={styles}
        colors={colors}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title, detail, styles }: { title: string; detail: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDetail}>{detail}</Text>
    </View>
  );
}

function ChoiceChip({
  label,
  icon,
  active,
  onPress,
  styles,
  colors
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeTokens["colors"];
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, active && styles.choiceChipActive]}>
      <Ionicons name={icon} size={15} color={active ? colors.accent : colors.textMuted} />
      <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SheetFrame({ open, title, onClose, children, styles, colors }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; styles: ReturnType<typeof createStyles>; colors: ThemeTokens["colors"] }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetScrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetGrabber} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} style={styles.sheetClose} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

function ScheduleSheet({
  open,
  schedule,
  onClose,
  onChoose,
  onToggleDay,
  styles,
  colors
}: {
  open: boolean;
  schedule: Schedule;
  onClose: () => void;
  onChoose: (schedule: Schedule) => void;
  onToggleDay: (day: DayOfWeek) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeTokens["colors"];
}) {
  return (
    <SheetFrame open={open} title="Repeat schedule" onClose={onClose} styles={styles} colors={colors}>
      <Text style={styles.sheetHint}>Most habits work best daily. Custom days and slower rhythms live here when you need them.</Text>
      {schedule.kind === "customDays" ? (
        <View style={styles.daysRow}>
          {days.map((day) => {
            const active = schedule.days.includes(day.value);

            return (
              <Pressable key={day.value} onPress={() => onToggleDay(day.value)} style={[styles.dayChip, active && styles.dayChipActive]}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {advancedSchedules.map((option) => (
        <Pressable key={option.label} onPress={() => onChoose(option.value)} style={styles.sheetRow}>
          <View style={styles.sheetRowIcon}>
            <Ionicons name={option.icon} size={18} color={colors.tertiary} />
          </View>
          <View style={styles.sheetRowCopy}>
            <Text style={styles.sheetRowTitle}>{option.label}</Text>
            <Text style={styles.sheetRowDetail}>{option.detail}</Text>
          </View>
          {schedule.kind === option.value.kind ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
        </Pressable>
      ))}
    </SheetFrame>
  );
}

function ReminderSheet({
  open,
  reminderMode,
  reminderHour,
  customReminderHour,
  onClose,
  onMode,
  onHour,
  styles,
  colors
}: {
  open: boolean;
  reminderMode: HabitReminderPreference["mode"];
  reminderHour: number;
  customReminderHour: number;
  onClose: () => void;
  onMode: (mode: HabitReminderPreference["mode"]) => void;
  onHour: (hour: number) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeTokens["colors"];
}) {
  const rows: { mode: HabitReminderPreference["mode"]; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { mode: "default", title: "Default", detail: `${formatHour(reminderHour)} from your settings`, icon: "alarm-outline" },
    { mode: "custom", title: "Custom", detail: `${formatHour(customReminderHour)} for this habit`, icon: "time-outline" },
    { mode: "off", title: "Off", detail: "No reminder for this habit", icon: "volume-mute-outline" }
  ];

  return (
    <SheetFrame open={open} title="Reminder" onClose={onClose} styles={styles} colors={colors}>
      {rows.map((row) => (
        <Pressable
          key={row.mode}
          onPress={() => {
            triggerHaptic();
            onMode(row.mode);
          }}
          style={styles.sheetRow}
        >
          <View style={styles.sheetRowIcon}>
            <Ionicons name={row.icon} size={18} color={colors.tertiary} />
          </View>
          <View style={styles.sheetRowCopy}>
            <Text style={styles.sheetRowTitle}>{row.title}</Text>
            <Text style={styles.sheetRowDetail}>{row.detail}</Text>
          </View>
          {reminderMode === row.mode ? <Ionicons name="radio-button-on" size={22} color={colors.accent} /> : <Ionicons name="radio-button-off" size={22} color={colors.textMuted} />}
        </Pressable>
      ))}
      {reminderMode === "custom" ? (
        <View style={styles.reminderHours}>
          {reminderHours.map((hour) => {
            const active = customReminderHour === hour;

            return (
              <Pressable key={hour} onPress={() => onHour(hour)} style={[styles.hourChip, active && styles.hourChipActive]}>
                <Text style={[styles.hourChipText, active && styles.hourChipTextActive]}>{formatHour(hour)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </SheetFrame>
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
      paddingBottom: 134,
      gap: spacing.md
    },
    nameCard: {
      minHeight: 138,
      borderRadius: radius.xl,
      padding: spacing.lg,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      gap: spacing.md,
      boxShadow: `0 18px 44px ${colors.glow}`
    },
    nameIcon: {
      width: 54,
      height: 54,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center"
    },
    nameInput: {
      minHeight: 54,
      color: colors.text,
      fontSize: 28,
      lineHeight: 33,
      fontWeight: "900",
      padding: 0
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: spacing.md,
      marginTop: spacing.xs
    },
    sectionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    sectionDetail: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800",
      textTransform: "uppercase",
      flexShrink: 1
    },
    presetRail: {
      gap: spacing.sm,
      paddingRight: spacing.lg
    },
    presetCard: {
      width: 154,
      minHeight: 118,
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      justifyContent: "space-between"
    },
    presetCardActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
      transform: [{ scale: 0.98 }]
    },
    presetEmoji: {
      fontSize: 26
    },
    presetTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    presetMeta: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      lineHeight: 15,
      fontWeight: "800"
    },
    activeText: {
      color: colors.accent
    },
    templateSummary: {
      minHeight: 44,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.tertiarySoft,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    templateSummaryText: {
      color: colors.text,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "800",
      flex: 1
    },
    typeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    typeCard: {
      flexBasis: "48%",
      flexGrow: 1,
      minHeight: 132,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      gap: spacing.xs
    },
    typeCardActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      boxShadow: `0 12px 30px ${colors.glow}`
    },
    typeCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    typeIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    typeIconActive: {
      backgroundColor: "rgba(0, 0, 0, 0.12)"
    },
    typeTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    typeTitleActive: {
      color: colors.accentText
    },
    typeDescription: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    typeDescriptionActive: {
      color: "rgba(15, 22, 11, 0.76)"
    },
    goalCard: {
      minHeight: 82,
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    goalCopy: {
      flex: 1,
      gap: 3
    },
    rowTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    rowDetail: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    stepper: {
      minHeight: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden"
    },
    stepperButton: {
      width: 42,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center"
    },
    stepperInput: {
      width: 48,
      minHeight: 48,
      color: colors.text,
      textAlign: "center",
      fontSize: 19,
      fontWeight: "900",
      padding: 0
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    choiceChip: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    choiceChipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.lineStrong
    },
    choiceChipText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "800"
    },
    choiceChipTextActive: {
      color: colors.accent
    },
    moreChip: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.tertiarySoft,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    moreChipText: {
      color: colors.tertiary,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    segmented: {
      minHeight: 48,
      padding: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      gap: 4
    },
    segment: {
      flex: 1,
      minHeight: 40,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 4
    },
    segmentActive: {
      backgroundColor: colors.accent
    },
    segmentText: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900"
    },
    segmentTextActive: {
      color: colors.accentText
    },
    reminderCard: {
      minHeight: 78,
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    reminderCopy: {
      flex: 1,
      gap: 3
    },
    changeButton: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center"
    },
    changeButtonText: {
      color: colors.accent,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    bottomSpacer: {
      height: 18
    },
    actionDock: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.md,
      minHeight: 74,
      borderRadius: radius.xl,
      backgroundColor: colors.overlay,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      padding: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    previewCopy: {
      flex: 1,
      paddingLeft: spacing.sm,
      gap: 3
    },
    previewTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    previewMeta: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    primaryAction: {
      minWidth: 118,
      minHeight: 54,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.xs,
      paddingHorizontal: spacing.md
    },
    primaryActionDisabled: {
      opacity: 0.45
    },
    primaryActionText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    sheetScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.48)"
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      gap: spacing.md
    },
    sheetGrabber: {
      width: 42,
      height: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.lineStrong,
      alignSelf: "center"
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900"
    },
    sheetClose: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    sheetHint: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 19,
      fontWeight: "700"
    },
    sheetRow: {
      minHeight: 68,
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    sheetRowIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.tertiarySoft,
      alignItems: "center",
      justifyContent: "center"
    },
    sheetRowCopy: {
      flex: 1,
      gap: 2
    },
    sheetRowTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    sheetRowDetail: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    daysRow: {
      flexDirection: "row",
      gap: spacing.xs
    },
    dayChip: {
      flex: 1,
      minHeight: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    dayChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    dayText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    dayTextActive: {
      color: colors.accentText
    },
    reminderHours: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    hourChip: {
      minHeight: 38,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      justifyContent: "center"
    },
    hourChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    hourChipText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    hourChipTextActive: {
      color: colors.accentText
    }
  });
}
