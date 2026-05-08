import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { router, type Href } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { addDays, toDateKey } from "@/lib/dates";
import { useHabitStore } from "@/store/habitStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { AICommandResult, AIHabitDraft } from "@/types/ai";
import type { HabitCategory, HabitType } from "@/types/habit";
import type { Schedule, TimeOfDay } from "@/types/schedule";

const timeOptions: { value: TimeOfDay; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "morning", label: "Morning", icon: "sunny-outline" },
  { value: "afternoon", label: "Afternoon", icon: "partly-sunny-outline" },
  { value: "evening", label: "Evening", icon: "moon-outline" },
  { value: "anytime", label: "Anytime", icon: "ellipse-outline" }
];

const categoryOptions: { value: HabitCategory; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" },
  { value: "fitness", label: "Fitness" },
  { value: "mindfulness", label: "Mind" },
  { value: "productivity", label: "Work" },
  { value: "personal", label: "Life" }
];

const typeOptions: { value: HabitType; label: string }[] = [
  { value: "binary", label: "Done" },
  { value: "count", label: "Count" },
  { value: "timer", label: "Timer" },
  { value: "negative", label: "Avoid" }
];

const recurringSchedules: { value: Schedule; label: string }[] = [
  { value: { kind: "daily" }, label: "Daily" },
  { value: { kind: "weekdays" }, label: "Weekdays" },
  { value: { kind: "weekends" }, label: "Weekends" }
];

function emptyDraft(): AIHabitDraft {
  return {
    title: "",
    type: "binary",
    category: "personal",
    timeOfDay: "anytime",
    schedule: { kind: "daily" }
  };
}

function scheduleMode(schedule: Schedule) {
  return schedule.kind === "oneTime" ? "once" : "recurring";
}

export default function VoiceScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const parseVoiceCommand = useHabitStore((state) => state.parseVoiceCommand);
  const addHabit = useHabitStore((state) => state.addHabit);
  const applyAIResult = useHabitStore((state) => state.applyAIResult);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const [result, setResult] = useState<AICommandResult | null>(null);
  const [draft, setDraft] = useState<AIHabitDraft>(() => emptyDraft());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [samples, setSamples] = useState<number[]>(Array.from({ length: 18 }, () => 0.08));

  const transcriptCopy = transcript.trim() || (recognizing ? "Listening..." : "Say or type one thing");
  const mode = scheduleMode(draft.schedule);

  const parseTranscript = async (text: string) => {
    const clean = text.trim();

    if (!clean) {
      setDraft(emptyDraft());
      setReviewOpen(true);
      return;
    }

    setBusy(true);
    try {
      const nextResult = await parseVoiceCommand(clean);
      setResult(nextResult);

      if (nextResult.kind === "createHabit") {
        setDraft({ ...emptyDraft(), ...nextResult.draft });
      } else {
        setDraft((current) => ({ ...current, title: clean }));
      }

      setReviewOpen(true);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "Could not analyze the spoken text.");
    } finally {
      setBusy(false);
    }
  };

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    setSpeechError(null);
  });
  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false);
    const spoken = transcriptRef.current.trim();

    if (spoken) {
      void parseTranscript(spoken);
    }
  });
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";

    if (text) {
      transcriptRef.current = text;
      setTranscript(text);
    }
  });
  useSpeechRecognitionEvent("volumechange", (event) => {
    const level = Math.max(0.06, Math.min(1, (event.value + 2) / 12));
    setSamples((current) => [...current.slice(1), level]);
  });
  useSpeechRecognitionEvent("error", (event) => {
    setRecognizing(false);
    setSpeechError(event.message || "Speech recognition stopped.");
  });

  const toggleRecording = async () => {
    if (recognizing) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setResult(null);
    setReviewOpen(false);
    transcriptRef.current = "";
    setTranscript("");
    setSamples(Array.from({ length: 18 }, () => 0.08));
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setSpeechError("Microphone permission is required for voice capture.");
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 120
      }
    });
  };

  const confirm = async () => {
    if (!reviewOpen) {
      await parseTranscript(transcript);
      return;
    }

    const title = draft.title.trim() || transcript.trim();

    if (!title) {
      setReviewOpen(true);
      return;
    }

    if (result && result.kind !== "createHabit" && draft.title.trim() === transcript.trim()) {
      applyAIResult(result, { force: true });
      router.replace("/" as Href);
      return;
    }

    addHabit({
      title,
      type: draft.type,
      category: draft.category,
      schedule: draft.schedule,
      timeOfDay: draft.timeOfDay,
      targetCount: draft.type === "timer" ? draft.targetCount ?? 25 : draft.type === "count" ? draft.targetCount ?? 1 : undefined
    });
    router.replace("/" as Href);
  };

  const setMode = (nextMode: "once" | "recurring") => {
    setDraft((current) => ({
      ...current,
      schedule: nextMode === "once" ? { kind: "oneTime", date: toDateKey() } : { kind: "daily" }
    }));
  };

  const setOnceDate = (date: string) => {
    setDraft((current) => ({ ...current, schedule: { kind: "oneTime", date } }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backdropOne} />
      <View style={styles.backdropTwo} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeTop} accessibilityRole="button" accessibilityLabel="Close voice capture">
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={toggleRecording} disabled={busy} style={[styles.micTop, recognizing && styles.micTopActive]} accessibilityRole="button" accessibilityLabel={recognizing ? "Stop recording" : "Start recording"}>
          <Ionicons name={recognizing ? "radio-button-on" : "mic-outline"} size={18} color={recognizing ? colors.accentText : colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.transcriptStage}>
          <Text style={styles.timer}>{recognizing ? "Listening" : busy ? "Analyzing" : "Voice"}</Text>
          <TextInput
            value={transcript}
            onChangeText={(text) => {
              transcriptRef.current = text;
              setTranscript(text);
            }}
            multiline
            placeholder={transcriptCopy}
            placeholderTextColor={colors.text}
            style={styles.transcriptInput}
            textAlign="center"
            autoFocus={false}
          />
          <View style={styles.waveform}>
            {samples.map((sample, index) => (
              <View key={`${index}-${sample}`} style={[styles.waveBar, { height: 8 + sample * 48, opacity: recognizing ? 0.45 + sample * 0.55 : 0.2 }]} />
            ))}
          </View>
          {speechError ? <Text style={styles.errorText}>{speechError}</Text> : null}
        </View>

        {reviewOpen ? (
          <View style={styles.reviewPanel}>
            <Text style={styles.panelEyebrow}>AI review</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
              placeholder="Task name"
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
            />

            <View style={styles.choiceRow}>
              <Pressable onPress={() => setMode("recurring")} style={[styles.modeChip, mode === "recurring" && styles.modeChipActive]}>
                <Text style={[styles.modeText, mode === "recurring" && styles.modeTextActive]}>Recurring</Text>
              </Pressable>
              <Pressable onPress={() => setMode("once")} style={[styles.modeChip, mode === "once" && styles.modeChipActive]}>
                <Text style={[styles.modeText, mode === "once" && styles.modeTextActive]}>Once</Text>
              </Pressable>
            </View>

            {mode === "once" ? (
              <View style={styles.choiceRow}>
                <Pressable onPress={() => setOnceDate(toDateKey())} style={[styles.tag, draft.schedule.kind === "oneTime" && draft.schedule.date === toDateKey() && styles.tagActive]}>
                  <Text style={styles.tagText}>Today</Text>
                </Pressable>
                <Pressable onPress={() => setOnceDate(toDateKey(addDays(new Date(), 1)))} style={[styles.tag, draft.schedule.kind === "oneTime" && draft.schedule.date === toDateKey(addDays(new Date(), 1)) && styles.tagActive]}>
                  <Text style={styles.tagText}>Tomorrow</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.choiceRow}>
                {recurringSchedules.map((option) => (
                  <Pressable key={option.label} onPress={() => setDraft((current) => ({ ...current, schedule: option.value }))} style={[styles.tag, draft.schedule.kind === option.value.kind && styles.tagActive]}>
                    <Text style={styles.tagText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.choiceRow}>
              {timeOptions.map((option) => {
                const active = draft.timeOfDay === option.value;

                return (
                  <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, timeOfDay: option.value }))} style={[styles.iconTag, active && styles.tagActive]}>
                    <Ionicons name={option.icon} size={15} color={active ? colors.accentText : colors.textMuted} />
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.choiceRow}>
              {typeOptions.map((option) => (
                <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, type: option.value }))} style={[styles.tag, draft.type === option.value && styles.tagActive]}>
                  <Text style={[styles.tagText, draft.type === option.value && styles.tagTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.choiceRow}>
              {categoryOptions.map((option) => (
                <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, category: option.value }))} style={[styles.tag, draft.category === option.value && styles.tagActive]}>
                  <Text style={[styles.tagText, draft.category === option.value && styles.tagTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomActions}>
        <Pressable onPress={() => router.back()} style={styles.cancelButton} accessibilityRole="button" accessibilityLabel="Cancel">
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={confirm} disabled={busy} style={[styles.confirmButton, busy && styles.confirmDisabled]} accessibilityRole="button" accessibilityLabel="Confirm voice task">
          <Ionicons name="checkmark" size={28} color={colors.accentText} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles({ colors, spacing, radius, typography }: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    backdropOne: {
      position: "absolute",
      top: -120,
      left: -70,
      width: 260,
      height: 360,
      borderRadius: 160,
      backgroundColor: colors.tertiary,
      opacity: 0.18
    },
    backdropTwo: {
      position: "absolute",
      right: -120,
      bottom: 40,
      width: 320,
      height: 420,
      borderRadius: 180,
      backgroundColor: colors.warning,
      opacity: 0.25
    },
    header: {
      padding: spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    closeTop: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.whiteGlass,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    micTop: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    micTopActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 132,
      gap: spacing.lg,
      minHeight: "100%"
    },
    transcriptStage: {
      minHeight: 340,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md
    },
    timer: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    transcriptInput: {
      width: "100%",
      minHeight: 120,
      color: colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900",
      paddingHorizontal: spacing.md
    },
    waveform: {
      height: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5
    },
    waveBar: {
      width: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.accent
    },
    errorText: {
      color: colors.warning,
      fontSize: typography.meta,
      lineHeight: 18,
      fontWeight: "800",
      textAlign: "center"
    },
    reviewPanel: {
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.overlay,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.md
    },
    panelEyebrow: {
      color: colors.accent,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    titleInput: {
      minHeight: 52,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.text,
      paddingHorizontal: spacing.md,
      fontSize: typography.body,
      fontWeight: "900"
    },
    choiceRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    modeChip: {
      flex: 1,
      minHeight: 46,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center"
    },
    modeChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    modeText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    modeTextActive: {
      color: colors.accentText
    },
    tag: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    iconTag: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs
    },
    tagActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    tagText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    tagTextActive: {
      color: colors.accentText
    },
    bottomActions: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    cancelButton: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.whiteGlass,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    confirmButton: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    confirmDisabled: {
      opacity: 0.55
    }
  });
}
