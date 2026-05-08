import { Link, type Href, usePathname } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, glass, radius, spacing, typography } from "@/theme/tokens";

const items = [
  { href: "/", label: "Today" },
  { href: "/streaks", label: "Streaks" },
  { href: "/analytics", label: "Insights" },
  { href: "/settings", label: "Settings" }
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link key={item.href} href={item.href as Href} style={[styles.item, active && styles.itemActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.pill,
    ...glass.elevated,
    ...glass.glow
  },
  item: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    overflow: "hidden",
    textAlign: "center"
  },
  itemActive: {
    backgroundColor: colors.accentSoft
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.meta,
    fontWeight: "700",
    textAlign: "center"
  },
  labelActive: {
    color: colors.accent
  }
});
