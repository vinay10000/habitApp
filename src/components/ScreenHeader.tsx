import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref?: Href;
  actionLabel?: string;
  actionHref?: Href;
  showBack?: boolean;
};

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  backHref = "/" as Href,
  actionLabel,
  actionHref,
  showBack = true
}: ScreenHeaderProps) {
  const tokens = useThemeTokens();
  const styles = createStyles(tokens);
  const { colors } = tokens;
  const hasAction = Boolean(actionLabel && actionHref);
  const hasTopRow = showBack || hasAction;

  return (
    <View style={styles.container}>
      {hasTopRow ? (
        <View style={styles.topRow}>
          {showBack ? (
            <Link href={backHref} asChild>
              <Pressable style={styles.backButton} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            </Link>
          ) : (
            <View style={styles.actionPlaceholder} />
          )}

          {hasAction ? (
            <Link href={actionHref as Href} asChild>
              <Pressable style={styles.actionButton}>
                <Text style={styles.actionText}>{actionLabel}</Text>
              </Pressable>
            </Link>
          ) : showBack ? (
            <View style={styles.actionPlaceholder} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      marginBottom: spacing.sm
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    actionButton: {
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    actionText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    actionPlaceholder: {
      width: 44,
      height: 44
    },
    copy: {
      gap: spacing.xs
    },
    eyebrow: {
      color: colors.accent,
      fontSize: typography.meta,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0
    },
    title: {
      color: colors.text,
      fontSize: typography.title,
      lineHeight: 39,
      fontWeight: "900",
      maxWidth: 330
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: typography.body,
      lineHeight: 23,
      maxWidth: 340,
      fontWeight: "700"
    }
  });
}
