import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type PermissionState, useOnboardingStore } from "@/store/onboardingStore";
import { getThemeTokens, type ThemeTokens } from "@/theme/tokens";

const screens = [
  {
    eyebrow: "Habit",
    title: "A quieter place to keep promises.",
    body: "Track the few habits that matter today, then get out of the way.",
    icon: "leaf-outline" as const
  },
  {
    eyebrow: "Access",
    title: "Stay in flow.",
    body: "We use notifications for gentle reminders and voice for seamless habit logging.",
    icon: "notifications-outline" as const
  },
  {
    eyebrow: "Profile",
    title: "What should we call you?",
    body: "Your name personalizes the top bar and keeps the app feeling like yours.",
    icon: "person-outline" as const
  }
];

function permissionCopy(permission: PermissionState) {
  if (permission === "granted") {
    return "Allowed";
  }

  if (permission === "denied") {
    return "Not allowed";
  }

  if (permission === "unavailable") {
    return "Unavailable";
  }

  return "Ask";
}

function permissionIcon(permission: PermissionState) {
  if (permission === "granted") {
    return "checkmark" as const;
  }

  if (permission === "denied") {
    return "close" as const;
  }

  return "arrow-forward" as const;
}

function initialsForName(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "A";
}

export default function OnboardingScreen() {
  const tokens = useMemo(() => getThemeTokens("amoled"), []);
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const load = useOnboardingStore((state) => state.load);
  const loaded = useOnboardingStore((state) => state.loaded);
  const name = useOnboardingStore((state) => state.displayName);
  const notificationPermission = useOnboardingStore((state) => state.notificationPermission);
  const voicePermission = useOnboardingStore((state) => state.voicePermission);
  const setName = useOnboardingStore((state) => state.setDisplayName);
  const setNotificationPermission = useOnboardingStore((state) => state.setNotificationPermission);
  const setVoicePermission = useOnboardingStore((state) => state.setVoicePermission);
  const complete = useOnboardingStore((state) => state.complete);
  const [step, setStep] = useState(0);
  const [busyPermission, setBusyPermission] = useState<"notification" | "voice" | null>(null);

  useEffect(() => {
    if (!loaded) {
      void load();
    }
  }, [load, loaded]);

  const screen = screens[step];
  const onFinalStep = step === screens.length - 1;
  const trimmedName = name.trim();
  const canContinue = !onFinalStep || trimmedName.length > 0;

  const requestNotifications = async () => {
    setBusyPermission("notification");
    try {
      const permission = await Notifications.requestPermissionsAsync();
      setNotificationPermission(permission.granted ? "granted" : "denied");
    } catch {
      setNotificationPermission("unavailable");
    } finally {
      setBusyPermission(null);
    }
  };

  const requestVoice = async () => {
    setBusyPermission("voice");
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setVoicePermission(permission.granted ? "granted" : "denied");
    } catch {
      setVoicePermission("unavailable");
    } finally {
      setBusyPermission(null);
    }
  };

  const next = async () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
      return;
    }

    if (!name.trim()) {
      return;
    }

    await complete(name);
    router.replace("/" as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <View style={styles.topRow}>
          <View style={styles.dots} accessibilityRole="progressbar">
            {screens.map((item, index) => (
              <View key={item.eyebrow} style={[styles.dot, index === step && styles.dotActive]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.visualStage}>
            <View style={styles.orbit}>
              <View style={styles.orbitChipTop}>
                <Ionicons name={step === 0 ? "checkmark" : step === 1 ? "mic-outline" : "heart-outline"} size={18} color={colors.accentText} />
              </View>
              <View style={styles.orbitChipBottom}>
                <Text style={styles.orbitChipText}>{step + 1}/3</Text>
              </View>
              <View style={styles.iconHalo}>
                <Ionicons name={screen.icon} size={42} color={colors.accent} />
              </View>
            </View>
          </View>

          <View style={styles.bottomContent}>
            <View style={styles.copyBlock}>
              <Text style={styles.eyebrow}>{screen.eyebrow}</Text>
              <Text style={styles.title}>{screen.title}</Text>
              <Text style={styles.body}>{screen.body}</Text>
            </View>

            {step === 1 ? (
              <View style={styles.permissionStack}>
                <PermissionRow
                  title="Notifications"
                  subtitle="Quiet nudges for unfinished habits."
                  icon="notifications-outline"
                  permission={notificationPermission}
                  busy={busyPermission === "notification"}
                  onPress={requestNotifications}
                  styles={styles}
                  colors={colors}
                />
                <PermissionRow
                  title="Voice"
                  subtitle="Add habits by speaking."
                  icon="mic-outline"
                  permission={voicePermission}
                  busy={busyPermission === "voice"}
                  onPress={requestVoice}
                  styles={styles}
                  colors={colors}
                />
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.namePanel}>
                <View style={styles.namePreviewRow}>
                  <View style={styles.nameAvatar}>
                    <Text style={styles.nameAvatarText}>{initialsForName(name)}</Text>
                  </View>
                  <View style={styles.namePreviewCopy}>
                    <Text style={styles.inputLabel}>Profile name</Text>
                    <Text style={styles.namePreview} numberOfLines={1}>{trimmedName || "Your name"}</Text>
                  </View>
                </View>
                <View style={styles.inputShell}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Alex"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={32}
                    style={styles.nameInput}
                    returnKeyType="done"
                    accessibilityLabel="Your name"
                    onSubmitEditing={() => {
                      void next();
                    }}
                  />
                  <Ionicons name={trimmedName ? "checkmark-circle" : "create-outline"} size={22} color={trimmedName ? colors.accent : colors.textMuted} />
                </View>
                <Text style={styles.inputHint}>This appears in your home header. You can change it later.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={[styles.backButton, step === 0 && styles.backButtonHidden]}
            accessibilityRole="button"
            accessibilityLabel="Previous onboarding screen"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              void next();
            }}
            disabled={!canContinue}
            style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel={onFinalStep ? "Finish onboarding" : "Next onboarding screen"}
          >
            <Text style={styles.nextText}>{onFinalStep ? "Start" : "Next"}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.accentText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PermissionRow({
  title,
  subtitle,
  icon,
  permission,
  busy,
  onPress,
  styles,
  colors
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  permission: PermissionState;
  busy: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeTokens["colors"];
}) {
  const allowed = permission === "granted";

  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.permissionRow, allowed && styles.permissionRowAllowed]} accessibilityRole="button" accessibilityLabel={`Request ${title.toLowerCase()} permission`}>
      <View style={[styles.permissionIcon, allowed && styles.permissionIconAllowed]}>
        <Ionicons name={icon} size={21} color={allowed ? colors.accentText : colors.tertiary} />
      </View>
      <View style={styles.permissionCopy}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.permissionState, allowed && styles.permissionStateAllowed]}>
        <Text style={[styles.permissionStateText, allowed && styles.permissionStateTextAllowed]}>{busy ? "..." : permissionCopy(permission)}</Text>
        <Ionicons name={permissionIcon(permission)} size={14} color={allowed ? colors.accentText : colors.textMuted} />
      </View>
    </Pressable>
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
    content: {
      flexGrow: 1,
      padding: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 104,
      gap: spacing.lg,
      justifyContent: "space-between"
    },
    topRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center"
    },
    dots: {
      flexDirection: "row",
      gap: spacing.xs
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.lineStrong
    },
    dotActive: {
      width: 28,
      backgroundColor: colors.accent
    },
    visualStage: {
      minHeight: 250,
      alignItems: "center",
      justifyContent: "center"
    },
    orbit: {
      width: 232,
      height: 232,
      borderRadius: 116,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      shadowColor: colors.accent,
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 18 },
      shadowRadius: 34,
      elevation: 8
    },
    orbitChipTop: {
      position: "absolute",
      top: 30,
      right: 27,
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    orbitChipBottom: {
      position: "absolute",
      bottom: 31,
      left: 24,
      minWidth: 54,
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    orbitChipText: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    iconHalo: {
      width: 116,
      height: 116,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      alignItems: "center",
      justifyContent: "center"
    },
    bottomContent: {
      gap: spacing.lg
    },
    copyBlock: {
      gap: spacing.sm,
      paddingRight: spacing.md
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
    body: {
      color: colors.textMuted,
      fontSize: typography.body,
      lineHeight: 24,
      fontWeight: "700"
    },
    permissionStack: {
      gap: spacing.sm
    },
    permissionRow: {
      minHeight: 82,
      borderRadius: 22,
      padding: spacing.md,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    permissionRowAllowed: {
      backgroundColor: colors.accentSoft
    },
    permissionIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface
    },
    permissionIconAllowed: {
      backgroundColor: colors.accent
    },
    permissionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3
    },
    permissionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900"
    },
    permissionSubtitle: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700"
    },
    permissionState: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    },
    permissionStateAllowed: {
      backgroundColor: colors.accent
    },
    permissionStateText: {
      display: "none",
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    permissionStateTextAllowed: {
      color: colors.accentText
    },
    namePanel: {
      gap: spacing.md
    },
    namePreviewRow: {
      minHeight: 76,
      borderRadius: 26,
      padding: spacing.md,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md
    },
    nameAvatar: {
      width: 50,
      height: 50,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    nameAvatarText: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: "900"
    },
    namePreviewCopy: {
      flex: 1,
      minWidth: 0
    },
    inputLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    namePreview: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "900"
    },
    inputShell: {
      minHeight: 66,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      paddingLeft: spacing.lg,
      paddingRight: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    nameInput: {
      flex: 1,
      minHeight: 64,
      color: colors.text,
      fontSize: 22,
      fontWeight: "900"
    },
    inputHint: {
      color: colors.textMuted,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "700",
      paddingHorizontal: spacing.sm
    },
    bottomBar: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    backButton: {
      width: 50,
      height: 50,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    backButtonHidden: {
      opacity: 0
    },
    nextButton: {
      minHeight: 54,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm
    },
    nextButtonDisabled: {
      opacity: 0.45
    },
    nextText: {
      color: colors.accentText,
      fontSize: typography.body,
      fontWeight: "900"
    }
  });
}
