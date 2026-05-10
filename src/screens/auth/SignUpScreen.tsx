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

export default function SignUpScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const signUp = useAuthStore((state) => state.signUp);
  const continueAsDemo = useAuthStore((state) => state.continueAsDemo);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const emailConfirmationSent = useAuthStore((state) => state.emailConfirmationSent);
  const confirmationEmail = useAuthStore((state) => state.confirmationEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = email.includes("@") && password.length >= 6 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    await signUp(email.trim(), password);
  };

  const skipAuth = () => {
    continueAsDemo();
    router.replace("/" as Href);
  };

  if (emailConfirmationSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.confirmationWrapper}>
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationIconWrap}>
              <Ionicons name="mail" size={40} color={colors.accent} />
            </View>
            <Text style={styles.confirmationTitle}>Check your inbox</Text>
            <Text style={styles.confirmationSubtitle}>
              We sent a confirmation link to{" "}
              <Text style={styles.confirmationEmail}>{confirmationEmail}</Text>
            </Text>
            <Text style={styles.confirmationHint}>
              Click the link in the email to activate your account, then sign in.
            </Text>
          </View>

          <Pressable
            onPress={() => router.replace("/auth/sign-in" as Href)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
            <Text style={styles.backButtonText}>Back to sign in</Text>
          </Pressable>
          <Pressable onPress={skipAuth} style={styles.confirmationSkipButton}>
            <Text style={styles.linkText}>Skip and use local storage</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const strengthLevel =
    password.length < 4 ? 0 : password.length < 8 ? 1 : 2;

  const strengthLabel = ["Too short", "Good", "Strong"][strengthLevel];

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
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>
                Build better habits. Sync across devices.
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
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                placeholder="Create password (6+ chars)"
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

            {password.length > 0 ? (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${((strengthLevel + 1) / 3) * 100}%`,
                        backgroundColor:
                          strengthLevel === 0
                            ? colors.line
                            : strengthLevel === 1
                              ? colors.warning
                              : colors.success
                      }
                    ]}
                  />
                </View>
                <Text style={styles.strengthLabel}>{strengthLabel}</Text>
              </View>
            ) : null}

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
                <Text style={styles.primaryText}>Creating account...</Text>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.primaryText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.accentText} />
                </View>
              )}
            </Pressable>

            <Pressable onPress={skipAuth} disabled={loading} style={styles.skipButton}>
              <Ionicons name="phone-portrait-outline" size={17} color={colors.textMuted} />
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => router.push("/auth/sign-in" as Href)}>
                <Text style={styles.linkText}>Sign in</Text>
              </Pressable>
            </View>

            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </Text>

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
    strengthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.line,
      overflow: "hidden"
    },
    strengthFill: {
      height: "100%",
      borderRadius: 2
    },
    strengthLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "600",
      width: 60,
      textAlign: "right"
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
    termsText: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      lineHeight: 16,
      fontWeight: "500",
      textAlign: "center",
      paddingHorizontal: spacing.md
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
    },
    confirmationWrapper: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg
    },
    confirmationCard: {
      alignItems: "center",
      padding: spacing.xl,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.md
    },
    confirmationIconWrap: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      elevation: 4
    },
    confirmationTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center"
    },
    confirmationSubtitle: {
      color: colors.textMuted,
      fontSize: typography.body,
      lineHeight: 22,
      fontWeight: "500",
      textAlign: "center"
    },
    confirmationEmail: {
      color: colors.accent,
      fontWeight: "800"
    },
    confirmationHint: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 20,
      fontWeight: "500",
      textAlign: "center"
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      marginTop: spacing.lg
    },
    backButtonText: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "700"
    },
    confirmationSkipButton: {
      alignItems: "center",
      paddingVertical: spacing.sm
    }
  });
}
