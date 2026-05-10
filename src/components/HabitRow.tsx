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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
          const clamped = Math.max(-22, Math.min(22, gesture.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 54 && onArchive) {
            setConfirmingDelete(true);
          }

          Animated.spring(translateX, {
            toValue: 0,
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
    [onArchive, translateX]
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
    setConfirmingDelete(false);
    onArchive?.();
  };

  const handlePress = () => {
    if (confirmingDelete) {
      setConfirmingDelete(false);
      return;
    }

    onComplete();
  };

  const showDeleteConfirmation = () => {
    if (!onArchive) {
      return;
    }

    closeSwipe();
    setConfirmingDelete(true);
  };

  return (
    <View style={[styles.swipeWrap, confirmingDelete && styles.swipeWrapConfirming]}>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={completed ? `Mark ${habit.title} incomplete` : habit.type === "negative" ? `Log a slip for ${habit.title}` : `Complete ${habit.title}`}
          accessibilityHint={onArchive ? "Tap to update today. Long press to show delete options." : "Updates today's progress"}
          onPress={handlePress}
          onLongPress={showDeleteConfirmation}
          delayLongPress={520}
          android_ripple={{ color: colors.whiteGlass }}
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

      {confirmingDelete ? (
        <View style={styles.confirmPanel}>
          <View style={styles.confirmCopy}>
            <Text style={styles.confirmTitle}>Delete habit?</Text>
            <Text style={styles.confirmText} numberOfLines={1}>{habit.title}</Text>
          </View>
          <Pressable onPress={() => setConfirmingDelete(false)} style={styles.keepButton} accessibilityRole="button" accessibilityLabel={`Keep ${habit.title}`}>
            <Text style={styles.keepText}>Keep</Text>
          </Pressable>
          <Pressable onPress={archive} style={styles.confirmDeleteButton} accessibilityRole="button" accessibilityLabel={`Confirm delete ${habit.title}`}>
            <Ionicons name="trash-outline" size={16} color={colors.accentText} />
            <Text style={styles.confirmDeleteText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    swipeWrap: {
      borderRadius: radius.xl,
      overflow: "hidden"
    },
    swipeWrapConfirming: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger
    },
    confirmPanel: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    confirmCopy: {
      flex: 1,
      minWidth: 0
    },
    confirmTitle: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    confirmText: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      lineHeight: 16,
      fontWeight: "700"
    },
    keepButton: {
      minHeight: 38,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    keepText: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    confirmDeleteButton: {
      minHeight: 38,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs
    },
    confirmDeleteText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    row: {
      minHeight: 84,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    rowDone: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.1,
    },
    rowPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      alignItems: "center",
      justifyContent: "center"
    },
    iconBoxDone: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    copy: {
      flex: 1,
      gap: 4,
      minWidth: 0
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6
    },
    category: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.8
    },
    dot: {
      color: colors.lineStrong,
      fontSize: 10,
      fontWeight: "800"
    },
    streak: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 0
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      marginTop: 6,
      overflow: "hidden"
    },
    progressFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    countLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textAlign: "right",
      minWidth: 60,
      textTransform: "uppercase",
      fontVariant: ["tabular-nums"]
    }
  });
}
