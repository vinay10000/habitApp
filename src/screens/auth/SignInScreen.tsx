import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { hasSupabaseConfig } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";

export default function SignInScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const signIn = useAuthStore((state) => state.signIn);
  const continueAsDemo = useAuthStore((state) => state.continueAsDemo);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = email.includes("@") && password.length >= 6 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    await signIn(email.trim(), password);
    if (!useAuthStore.getState().error) {
      router.replace("/" as Href);
    }
  };

  const skipAuth = () => {
    continueAsDemo();
    router.replace("/" as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          <View style={styles.topSection}>
            <View style={styles.brandMark}>
              <Ionicons name="checkmark-circle" size={36} color={colors.accent} />
            </View>

            <View style={styles.headingGroup}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your streak
              </Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={[styles.inputGroup, email ? styles.inputGroupActive : undefined]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={email ? colors.accent : colors.textMuted}
              />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={[styles.inputGroup, password ? styles.inputGroupActive : undefined]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={password ? colors.accent : colors.textMuted}
              />
              <TextInput
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={colors.warning} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.spacer} />

          <View style={styles.bottomSection}>
            <Pressable
              disabled={!canSubmit}
              onPress={submit}
              style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            >
              {loading ? (
                <Text style={styles.primaryText}>Signing in...</Text>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.primaryText}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.accentText} />
                </View>
              )}
            </Pressable>

            <Pressable onPress={skipAuth} disabled={loading} style={styles.skipButton}>
              <Ionicons name="phone-portrait-outline" size={17} color={colors.textMuted} />
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Pressable onPress={() => router.push("/auth/sign-up" as Href)}>
                <Text style={styles.linkText}>Sign up</Text>
              </Pressable>
            </View>

            {!hasSupabaseConfig ? (
              <View style={styles.localBadge}>
                <View style={styles.localBadgeDot} />
                <Text style={styles.localBadgeText}>Local mode — data stays on this device</Text>
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    keyboardView: {
      flex: 1
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl
    },
    topSection: {
      alignItems: "center",
      paddingTop: 48,
      gap: spacing.md
    },
    brandMark: {
      width: 64,
      height: 64,
      borderRadius: radius.xl,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      elevation: 4
    },
    headingGroup: {
      alignItems: "center",
      gap: spacing.xs
    },
    title: {
      color: colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900",
      textAlign: "center"
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: typography.body,
      lineHeight: 22,
      fontWeight: "500",
      textAlign: "center"
    },
    formSection: {
      marginTop: 32,
      gap: spacing.sm
    },
    inputGroup: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      minHeight: 56,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.sm
    },
    inputGroupActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "600",
      paddingVertical: spacing.md
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.xs
    },
    errorText: {
      color: colors.warning,
      fontSize: typography.meta,
      fontWeight: "700",
      flex: 1
    },
    spacer: {
      flex: 1,
      minHeight: spacing.md
    },
    bottomSection: {
      gap: spacing.lg
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: radius.xl,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 20,
      elevation: 6
    },
    buttonDisabled: {
      opacity: 0.48
    },
    buttonContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    primaryText: {
      color: colors.accentText,
      fontSize: typography.body,
      fontWeight: "900"
    },
    skipButton: {
      minHeight: 48,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm
    },
    skipText: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "800"
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs
    },
    footerText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "500"
    },
    linkText: {
      color: colors.accent,
      fontSize: typography.meta,
      fontWeight: "800"
    },
    localBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md
    },
    localBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.tertiary
    },
    localBadgeText: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "600"
    }
  });
}
