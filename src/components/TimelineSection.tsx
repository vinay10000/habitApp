import { StyleSheet, Text, View } from "react-native";

import { HabitRow } from "@/components/HabitRow";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { Habit, HabitCompletion } from "@/types/habit";
import type { TimeOfDay } from "@/types/schedule";

const labels: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime"
};

const descriptions: Record<TimeOfDay, string> = {
  morning: "Start with low friction.",
  afternoon: "Keep the middle light.",
  evening: "Close with hobbies and recovery.",
  anytime: "Open loop, easy tap."
};

type TimelineSectionProps = {
  timeOfDay: TimeOfDay;
  habits: Habit[];
  completions: HabitCompletion[];
  onComplete: (habitId: string) => void;
  onArchive?: (habitId: string) => void;
};

export function TimelineSection({ timeOfDay, habits, completions, onComplete, onArchive }: TimelineSectionProps) {
  const tokens = useThemeTokens();
  const styles = createStyles(tokens);

  if (habits.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.label}>{labels[timeOfDay]}</Text>
          <Text style={styles.description}>{descriptions[timeOfDay]}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{habits.length}</Text>
        </View>
      </View>

      <View style={styles.rows}>
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} completions={completions} onComplete={() => onComplete(habit.id)} onArchive={onArchive ? () => onArchive(habit.id) : undefined} />
        ))}
      </View>
    </View>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: 2
    },
    headerCopy: {
      flex: 1
    },
    label: {
      color: colors.text,
      fontSize: typography.section,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    description: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    countPill: {
      minWidth: 32,
      height: 32,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    countText: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    rows: {
      gap: spacing.sm
    }
  });
}
