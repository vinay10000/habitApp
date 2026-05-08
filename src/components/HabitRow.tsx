import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { getCompletionForHabit, getHabitCompletionTarget, isHabitComplete } from "@/features/habits/completion";
import { toDateKey } from "@/lib/dates";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { Habit, HabitCompletion } from "@/types/habit";

const categoryLabels: Record<Habit["category"], string> = {
  health: "Health",
  learning: "Learning",
  fitness: "Fitness",
  mindfulness: "Mind",
  productivity: "Work",
  personal: "Hobby"
};

const typeCopy: Record<Habit["type"], { action: string; done: string; icon: keyof typeof Ionicons.glyphMap }> = {
  binary: { action: "Tap to finish", done: "Done", icon: "ellipse-outline" },
  count: { action: "Tap to add", done: "Target met", icon: "add" },
  timer: { action: "Start timer", done: "Minutes met", icon: "timer-outline" },
  negative: { action: "Log slip", done: "Avoided", icon: "shield-checkmark-outline" }
};

type HabitRowProps = {
  habit: Habit;
  completions: HabitCompletion[];
  onComplete: () => void;
  onArchive?: () => void;
};

export function HabitRow({ habit, completions, onComplete, onArchive }: HabitRowProps) {
  const tokens = useThemeTokens();
  const styles = createStyles(tokens);
  const { colors } = tokens;
  const [translateX] = useState(() => new Animated.Value(0));
  const dateKey = toDateKey();
  const completion = getCompletionForHabit(habit.id, completions, dateKey);
  const completed = isHabitComplete(habit, completions, dateKey);
  const target = getHabitCompletionTarget(habit);
  const count = completion?.count ?? 0;
  const countLabel =
    habit.type === "count"
      ? `${count}/${target}`
      : habit.type === "timer"
        ? `${count}/${target} min`
        : habit.type === "negative" && count > 0
          ? "Slip logged"
        : completed
          ? typeCopy[habit.type].done
          : typeCopy[habit.type].action;
  const showsProgress = habit.type === "count" || habit.type === "timer";
  const progress = showsProgress ? Math.min(count / target, 1) : 0;
  const icon = completed ? "checkmark" : typeCopy[habit.type].icon;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const clamped = Math.max(-94, Math.min(94, gesture.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = Math.abs(gesture.dx) > 54 ? (gesture.dx > 0 ? 88 : -88) : 0;
          Animated.spring(translateX, {
            toValue: next,
            useNativeDriver: true,
            speed: 18,
            bounciness: 5
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 18,
            bounciness: 5
          }).start();
        }
      }),
    [translateX]
  );

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5
    }).start();
  };

  const archive = () => {
    closeSwipe();
    onArchive?.();
  };

  return (
    <View style={styles.swipeWrap}>
      {onArchive ? (
        <View style={styles.deleteUnderlay}>
          <Pressable onPress={archive} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Delete ${habit.title}`}>
            <Ionicons name="trash-outline" size={18} color={colors.accentText} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable onPress={archive} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Delete ${habit.title}`}>
            <Text style={styles.deleteText}>Delete</Text>
            <Ionicons name="trash-outline" size={18} color={colors.accentText} />
          </Pressable>
        </View>
      ) : null}

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={completed ? `Mark ${habit.title} incomplete` : habit.type === "negative" ? `Log a slip for ${habit.title}` : `Complete ${habit.title}`}
          accessibilityHint={onArchive ? "Tap to update today. Swipe left or right to delete." : "Updates today's progress"}
          onPress={onComplete}
          onLongPress={onArchive}
          delayLongPress={520}
          style={({ pressed }) => [styles.row, completed && styles.rowDone, pressed && styles.rowPressed]}
        >
          <View style={[styles.iconBox, completed && styles.iconBoxDone]}>
            <Ionicons name={icon} size={20} color={completed ? colors.accentText : colors.text} />
          </View>

          <View style={styles.copy}>
            <View style={styles.metaRow}>
              <Text style={styles.category}>{categoryLabels[habit.category]}</Text>
              <Text style={styles.dot}>/</Text>
              <Text style={styles.streak}>{habit.streak}d</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{habit.title}</Text>
            {showsProgress ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(progress * 100, count > 0 ? 10 : 0)}%` }]} />
              </View>
            ) : null}
          </View>

          <Text style={styles.countLabel}>{countLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    swipeWrap: {
      borderRadius: radius.lg,
      overflow: "hidden"
    },
    deleteUnderlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.lg,
      backgroundColor: colors.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md
    },
    deleteButton: {
      minWidth: 86,
      minHeight: 58,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.xs
    },
    deleteText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    row: {
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
    rowDone: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.lineStrong
    },
    rowPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.94
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    iconBoxDone: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    copy: {
      flex: 1,
      gap: 5,
      minWidth: 0
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5
    },
    category: {
      color: colors.tertiary,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    dot: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800"
    },
    streak: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    title: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    progressTrack: {
      height: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden"
    },
    progressFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accent
    },
    countLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      lineHeight: 14,
      fontWeight: "900",
      maxWidth: 72,
      textAlign: "right"
    }
  });
}
