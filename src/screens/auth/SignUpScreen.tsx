import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const emailConfirmationSent = useAuthStore((state) => state.emailConfirmationSent);
  const confirmationEmail = useAuthStore((state) => state.confirmationEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = email.includes("@") && password.length >= 6 && !loading;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    await signUp(email.trim(), password);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handed">
        {emailConfirmationSent ? (
          <View style={styles.confirmationContainer}>
            <Ionicons name="mail-outline" size={48} color={colors.accent} />
            <Text style={styles.confirmationTitle}>Check your email</Text>
            <Text style={styles.confirmationSubtitle}>
              A confirmation email has been sent to <Text style={styles.confirmationEmail}>{confirmationEmail}</Text>. Please check your inbox and click the link to confirm your account, then return here to sign in.
            </Text>
            <Pressable onPress={() => router.replace("/auth/sign-in")} style={styles.backToSignInButton}>
              <Text style={styles.backToSignInText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Habit</Text>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                {hasSupabaseConfig ? "Supabase is configured. Your data will sync across devices." : "Supabase is not configured. Local habits stay on this device."}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={19} color={colors.textMuted} />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
                <TextInput
                  secureTextEntry
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>

            <Pressable disabled={!canSubmit} onPress={submit} style={[styles.primaryButton, !canSubmit && styles.disabledButton]}>
              <Text style={styles.primaryText}>{loading ? "Working..." : "Create account"}</Text>
            </Pressable>

            <View style={styles.note}>
              <Text style={styles.noteTitle}>Local mode</Text>
              <Text style={styles.noteText}>Habits and completions you create offline are saved locally; signed-in mode loads records from Supabase.</Text>
            </View>
          </>
        )}
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
      paddingBottom: 108,
      gap: spacing.lg
    },
    header: {
      gap: spacing.sm
    },
    eyebrow: {
      color: colors.accent,
      fontSize: typography.meta,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: {
      color: colors.text,
      fontSize: 34,
      lineHeight: 39,
      fontWeight: "900"
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: typography.body,
      lineHeight: 23,
      fontWeight: "700"
    },
    form: {
      gap: spacing.sm
    },
    inputWrap: {
      minHeight: 54,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "800"
    },
    error: {
      color: colors.warning,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "800"
    },
    primaryButton: {
      minHeight: 54,
      borderRadius: radius.lg,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    disabledButton: {
      opacity: 0.48
    },
    primaryText: {
      color: colors.accentText,
      fontSize: typography.body,
      fontWeight: "900"
    },
    note: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.xs
    },
    noteTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    noteText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 19,
      fontWeight: "700"
    },
    confirmationContainer: {
      alignItems: "center",
      textAlign: "center",
      padding: spacing.lg
    },
    confirmationTitle: {
      color: colors.text,
      fontSize: typography.title,
      fontWeight: "900",
      marginVertical: spacing.md
    },
    confirmationSubtitle: {
      color: colors.textMuted,
      fontSize: typography.body,
      lineHeight: 24,
      textAlign: "center"
    },
    confirmationEmail: {
      color: colors.accent,
      fontWeight: "900"
    },
    backToSignInButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      alignItems: "center"
    },
    backToSignInText: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    }
  });
}