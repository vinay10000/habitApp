import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { router, type Href } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useHabitStore } from "@/store/habitStore";
import type { ThemeTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/theme/useThemeTokens";
import type { AICommandResult, AIHabitDraft } from "@/types/ai";
import type { Schedule } from "@/types/schedule";

type SetupDraft = {
  title: string;
  schedule: Schedule | null;
  reminderHour: number | null;
  draft: Omit<AIHabitDraft, "title" | "schedule" | "reminderTime">;
};

const repeatOptions: { label: string; value: Schedule }[] = [
  { label: "Daily", value: { kind: "daily" } },
  { label: "Weekdays", value: { kind: "weekdays" } },
  { label: "Weekends", value: { kind: "weekends" } }
];

const reminderHours = [6, 7, 8, 12, 18, 20, 22];

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display} ${suffix}`;
}

function reminderTime(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function parseHour(text: string) {
  const match = text.match(/\b(?:at\s*)?(\d{1,2})(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?\b/i);

  if (!match) return null;

  let hour = Number(match[1]);
  const meridiem = match[2]?.toLowerCase();

  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (meridiem?.startsWith("p") && hour < 12) hour += 12;
  if (meridiem?.startsWith("a") && hour === 12) hour = 0;
  return hour;
}

function parseSchedule(text: string): Schedule | null {
  const normalized = text.toLowerCase();
  if (/\b(weekdays|weekday)\b/.test(normalized)) return { kind: "weekdays" };
  if (/\b(weekends|weekend)\b/.test(normalized)) return { kind: "weekends" };
  if (/\b(daily|every day|each day)\b/.test(normalized)) return { kind: "daily" };
  return null;
}

function titleFromTranscript(text: string) {
  return text
    .replace(/^(create|add|start|build)\s+/i, "")
    .replace(/\s+(at\s*)?\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/i, "")
    .replace(/\s+(daily|every day|each day|weekdays|weekday|weekends|weekend).*$/i, "")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function makeSetupDraft(text: string): SetupDraft {
  const hour = parseHour(text);

  return {
    title: titleFromTranscript(text),
    schedule: parseSchedule(text),
    reminderHour: hour,
    draft: {
      type: "binary",
      category: "personal",
      timeOfDay: hour !== null && hour < 12 ? "morning" : hour !== null && hour < 17 ? "afternoon" : "evening",
      targetCount: undefined
    }
  };
}

export default function VoiceScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { colors } = tokens;
  const { bottom } = useSafeAreaInsets();
  const parseVoiceCommand = useHabitStore((state) => state.parseVoiceCommand);
  const applyAIResult = useHabitStore((state) => state.applyAIResult);
  
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const transcriptRef = useRef("");
  
  const [recognizing, setRecognizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingResult, setPendingResult] = useState<AICommandResult | null>(null);
  const [setupDraft, setSetupDraft] = useState<SetupDraft | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [samples, setSamples] = useState<number[]>(Array.from({ length: 24 }, () => 0.08));
  
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [backdropAnim] = useState(() => new Animated.Value(0));
  const [confirmAnim] = useState(() => new Animated.Value(0));
  const [transcriptAnim] = useState(() => new Animated.Value(1));

  const liveText = `${transcript}${interimTranscript ? ` ${interimTranscript}` : ""}`.trim();
  const statusCopy = pendingResult ? "Ready to save" : recognizing ? "Listening" : busy ? "Thinking" : "Voice";
  const promptCopy = recognizing ? "I am listening" : busy ? "Making sense of it" : "Ready when you are";

  useEffect(() => {
    if (recognizing) {
      const recordingAnimation = Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]);

      recordingAnimation.start();
      return () => recordingAnimation.stop();
    }

    pulseAnim.setValue(1);
    Animated.timing(backdropAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [backdropAnim, pulseAnim, recognizing]);

  useEffect(() => {
    transcriptAnim.setValue(0);
    Animated.timing(transcriptAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [busy, liveText, recognizing, transcriptAnim]);

  useEffect(() => {
    if (pendingResult) {
      Animated.timing(confirmAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    } else {
      confirmAnim.setValue(0);
    }
  }, [confirmAnim, pendingResult]);

  const speakConfirmation = (text: string) => {
    Speech.speak(text, {
      language: "en",
      pitch: 1.1,
      rate: 1.0
    });
  };

  const processTranscript = async (text: string) => {
    const clean = text.trim();

    if (!clean) {
      router.back();
      return;
    }

    setBusy(true);
    try {
      if (pendingResult?.kind === "needsPreview" && setupDraft) {
        const spokenSetup = makeSetupDraft(clean);
        const nextSetup: SetupDraft = {
          ...setupDraft,
          title: spokenSetup.title || setupDraft.title,
          schedule: spokenSetup.schedule ?? setupDraft.schedule,
          reminderHour: spokenSetup.reminderHour ?? setupDraft.reminderHour,
          draft: {
            ...setupDraft.draft,
            timeOfDay: spokenSetup.reminderHour !== null ? spokenSetup.draft.timeOfDay : setupDraft.draft.timeOfDay
          }
        };

        setSetupDraft(nextSetup);
        speakConfirmation(nextSetup.schedule && nextSetup.reminderHour !== null ? "Got it. Review and save this habit." : "Got it. I still need the missing reminder details.");
        setBusy(false);
        return;
      }

      const result = await parseVoiceCommand(clean);
      setPendingResult(result);
      setSetupDraft(result.kind === "needsPreview" ? makeSetupDraft(result.transcript) : null);
      
      // Formulate confirmation message
      let msg = "I've understood your intent. Is this correct?";
      if (result.kind === "createHabit") {
        msg = `I'll create a new ${result.draft.category} habit: ${result.draft.title}. Is this correct?`;
      } else if (result.kind === "completeHabit") {
        msg = `Marking your habit as complete. Is that right?`;
      } else if (result.kind === "editHabit") {
        msg = `I'll update your habit. Does that sound right?`;
      } else if (result.kind === "needsPreview") {
        msg = "I need a reminder time and repeat schedule. You can say something like at 7 AM daily, or choose it on screen.";
      }
      
      speakConfirmation(msg);
      setBusy(false);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "Could not analyze the spoken text.");
      setBusy(false);
    }
  };

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    setSpeechError(null);
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";
    if (pendingResult?.kind !== "needsPreview") {
      setPendingResult(null);
      setSetupDraft(null);
    }
    Speech.stop();
  });
  
  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false);
    const spoken = transcriptRef.current.trim();
    setInterimTranscript("");

    if (spoken && !pendingResult) {
      void processTranscript(spoken);
    }
  });
  
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript?.trim() ?? "";

    if (!text) {
      return;
    }

    if (event.isFinal) {
      setTranscript((current) => {
        const next = current ? `${current} ${text}` : text;
        transcriptRef.current = next;
        return next;
      });
      setInterimTranscript("");
    } else {
      setInterimTranscript(text);
      transcriptRef.current = transcript ? `${transcript} ${text}` : text;
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

    transcriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    if (pendingResult?.kind !== "needsPreview") {
      setPendingResult(null);
      setSetupDraft(null);
    }
    setSamples(Array.from({ length: 24 }, () => 0.08));
    Speech.stop();
    
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setSpeechError("Microphone permission is required.");
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 80
      }
    });
  };

  const handleConfirm = () => {
    if (pendingResult?.kind === "needsPreview" && setupDraft?.schedule && setupDraft.reminderHour !== null) {
      applyAIResult({
        kind: "createHabit",
        confidence: "high",
        draft: {
          title: setupDraft.title,
          schedule: setupDraft.schedule,
          reminderTime: reminderTime(setupDraft.reminderHour),
          ...setupDraft.draft
        }
      }, { force: true });
      router.replace("/" as Href);
      return;
    }

    if (pendingResult) {
      applyAIResult(pendingResult, { force: true });
      router.replace("/" as Href);
    }
  };

  const handleCancel = () => {
    setPendingResult(null);
    setSetupDraft(null);
    setTranscript("");
    transcriptRef.current = "";
    Speech.stop();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.backdropOne, { opacity: Animated.multiply(backdropAnim, 0.25) }]} />
      <Animated.View style={[styles.backdropTwo, { opacity: Animated.multiply(backdropAnim, 0.3) }]} />
      
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeTop} accessibilityRole="button" accessibilityLabel="Close voice screen">
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{statusCopy}</Text>
          {recognizing && <View style={styles.liveIndicator} />}
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.transcriptStage}>
          {!pendingResult && (
            <View style={styles.liveTranscriptContainer}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, recognizing && styles.statusDotLive]} />
                <Text style={styles.statusText}>{promptCopy}</Text>
              </View>

              {liveText ? (
                <Animated.View
                  style={[
                    styles.transcriptWrap,
                    {
                      opacity: transcriptAnim,
                      transform: [
                        {
                          translateY: transcriptAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0]
                          })
                        }
                      ]
                    }
                  ]}
                >
                  <Text style={styles.transcriptText} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.72}>
                    {transcript}
                    {interimTranscript ? (
                      <Text style={styles.interimText}>{" " + interimTranscript}</Text>
                    ) : null}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View style={[styles.transcriptWrap, { opacity: transcriptAnim }]}>
                  <Text style={styles.placeholderText}>{promptCopy}</Text>
                </Animated.View>
              )}
            </View>
          )}

          {pendingResult && (
            <Animated.View style={[styles.confirmCard, { transform: [{ scale: confirmAnim }], opacity: confirmAnim }]}>
              {pendingResult.kind === "needsPreview" && setupDraft ? (
                <>
                  <View style={styles.confirmHeader}>
                    <Ionicons name="options-outline" size={20} color={colors.accent} />
                    <Text style={styles.confirmTitle}>Finish setup</Text>
                  </View>

                  <View style={styles.resultDetails}>
                    <Text style={styles.resultAction}>{pendingResult.reason}</Text>
                    <Text style={styles.resultValue}>{setupDraft.title || "New habit"}</Text>
                  </View>

                  <View style={styles.setupSection}>
                    <Text style={styles.setupLabel}>Reminder time</Text>
                    <View style={styles.setupChipRow}>
                      {reminderHours.map((hour) => {
                        const active = setupDraft.reminderHour === hour;

                        return (
                          <Pressable key={hour} onPress={() => setSetupDraft({ ...setupDraft, reminderHour: hour })} style={[styles.setupChip, active && styles.setupChipActive]}>
                            <Text style={[styles.setupChipText, active && styles.setupChipTextActive]}>{formatHour(hour)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.setupSection}>
                    <Text style={styles.setupLabel}>Repeat</Text>
                    <View style={styles.setupChipRow}>
                      {repeatOptions.map((option) => {
                        const active = setupDraft.schedule?.kind === option.value.kind;

                        return (
                          <Pressable key={option.label} onPress={() => setSetupDraft({ ...setupDraft, schedule: option.value })} style={[styles.setupChip, active && styles.setupChipActive]}>
                            <Text style={[styles.setupChipText, active && styles.setupChipTextActive]}>{option.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Text style={styles.confirmQuestion}>{setupDraft.schedule && setupDraft.reminderHour !== null ? "Ready to save." : "Say or choose the missing details."}</Text>
                </>
              ) : (
                <>
                  <View style={styles.confirmHeader}>
                    <Ionicons name="sparkles" size={20} color={colors.accent} />
                    <Text style={styles.confirmTitle}>Review</Text>
                  </View>
                  
                  <View style={styles.resultDetails}>
                    <Text style={styles.resultAction}>
                      {pendingResult.kind === "createHabit" ? "Create new habit" : 
                       pendingResult.kind === "completeHabit" ? "Complete habit" : 
                       pendingResult.kind === "editHabit" ? "Update habit" : "Routine detected"}
                    </Text>
                    <Text style={styles.resultValue}>
                      {pendingResult.kind === "createHabit" ? pendingResult.draft.title : 
                       pendingResult.kind === "completeHabit" || pendingResult.kind === "editHabit" ? "Matched habit" : "Multiple habits"}
                    </Text>
                  </View>

                  <Text style={styles.confirmQuestion}>Save this?</Text>
                </>
              )}
              
              <View style={styles.confirmActions}>
                <Pressable onPress={handleCancel} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>No, retry</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  disabled={pendingResult.kind === "needsPreview" && (!setupDraft?.schedule || setupDraft.reminderHour === null)}
                  style={[
                    styles.confirmBtn,
                    pendingResult.kind === "needsPreview" && (!setupDraft?.schedule || setupDraft.reminderHour === null) && styles.confirmBtnDisabled
                  ]}
                >
                  <Text style={styles.confirmBtnText}>{pendingResult.kind === "needsPreview" ? "Save habit" : "Yes, looks good"}</Text>
                  <Ionicons name="checkmark" size={18} color={colors.accentText} />
                </Pressable>
              </View>
            </Animated.View>
          )}

          {!pendingResult && (
            <View style={styles.visualizer}>
              <View style={styles.waveform}>
                {samples.map((sample, index) => (
                  <View key={`bar-${index}`} style={[
                    styles.waveBar, 
                    { 
                      height: 4 + sample * 80, 
                      opacity: recognizing ? 0.3 + sample * 0.7 : 0.15,
                      backgroundColor: recognizing ? colors.accent : colors.textMuted
                    }
                  ]} />
                ))}
              </View>
            </View>
          )}
          
          {speechError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.errorText}>{speechError}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.bottomControls, { paddingBottom: Math.max(bottom, 12) }]}>
        <View style={styles.footerCopy}>
          <Text style={styles.footerTitle}>{pendingResult ? "One last check" : recognizing ? "Recording" : "Voice capture"}</Text>
          <Text style={styles.footerHint}>
            {pendingResult ? "Confirm or retry before it lands in Today." : recognizing ? "Listening now." : "Ready for a quick capture."}
          </Text>
        </View>
        <Pressable
          onPress={toggleRecording}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={recognizing ? "Stop recording" : "Start recording"}
          style={({ pressed }) => [styles.micFab, busy && styles.micFabDisabled, pressed && styles.micFabPressed]}
        >
          <Animated.View
            style={[
              styles.micFabPulse,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: recognizing ? colors.accent : colors.surface,
                borderColor: recognizing ? colors.accent : colors.lineStrong
              }
            ]}
          >
            <Ionicons name={recognizing ? "radio-button-on" : "mic"} size={30} color={recognizing ? colors.accentText : colors.accent} />
          </Animated.View>
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
      top: -100,
      left: -50,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: colors.accent,
    },
    backdropTwo: {
      position: "absolute",
      right: -80,
      bottom: 100,
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: colors.tertiary,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 10
    },
    headerCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6
    },
    headerTitle: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 1
    },
    liveIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent
    },
    closeTop: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.whiteGlass,
      alignItems: "center",
      justifyContent: "center"
    },
    headerSpacer: {
      width: 40,
      height: 40
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: 104,
      justifyContent: "center",
    },
    transcriptStage: {
      alignItems: "center",
    },
    liveTranscriptContainer: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 180,
      gap: spacing.lg
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.whiteGlass,
      borderWidth: 1,
      borderColor: colors.line
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.textMuted,
      opacity: 0.6
    },
    statusDotLive: {
      backgroundColor: colors.accent,
      opacity: 1
    },
    statusText: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0
    },
    transcriptWrap: {
      width: "100%",
    },
    transcriptText: {
      color: colors.text,
      fontSize: 32,
      lineHeight: 40,
      fontWeight: "900",
      textAlign: "center",
    },
    interimText: {
      color: colors.textMuted,
      opacity: 0.6
    },
    placeholderText: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "900",
      textAlign: "center",
      opacity: 0.72
    },
    confirmCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 10,
      alignItems: 'center',
    },
    confirmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: spacing.lg,
    },
    confirmTitle: {
      color: colors.accent,
      fontSize: typography.meta,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    resultDetails: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      gap: 4
    },
    resultAction: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: '700',
    },
    resultValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'center',
    },
    confirmQuestion: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: '800',
      marginBottom: spacing.xl,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%'
    },
    cancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.line
    },
    cancelBtnText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: '800'
    },
    confirmBtn: {
      flex: 1.5,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    },
    confirmBtnText: {
      color: colors.accentText,
      fontSize: typography.meta,
      fontWeight: '900'
    },
    confirmBtnDisabled: {
      opacity: 0.45
    },
    setupSection: {
      width: "100%",
      gap: spacing.xs,
      marginBottom: spacing.md
    },
    setupLabel: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0
    },
    setupChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    setupChip: {
      minHeight: 38,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center"
    },
    setupChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    setupChipText: {
      color: colors.textMuted,
      fontSize: typography.meta,
      fontWeight: "900"
    },
    setupChipTextActive: {
      color: colors.accentText
    },
    visualizer: {
      marginTop: 60,
      height: 100,
      width: "100%",
      justifyContent: "center",
      alignItems: "center"
    },
    waveform: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4
    },
    waveBar: {
      width: 4,
      borderRadius: radius.pill,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 40,
      backgroundColor: "rgba(255, 184, 107, 0.1)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.pill
    },
    errorText: {
      color: colors.warning,
      fontSize: typography.meta,
      fontWeight: "700",
    },
    bottomControls: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: 0,
      minHeight: 92,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    footerCopy: {
      flex: 1,
      minWidth: 0
    },
    footerTitle: {
      color: colors.text,
      fontSize: typography.meta,
      fontWeight: "900",
      marginBottom: 3
    },
    footerHint: {
      color: colors.textMuted,
      fontSize: typography.tiny,
      lineHeight: 16,
      opacity: 0.72,
      fontWeight: "600"
    },
    micFab: {
      width: 78,
      height: 78,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center"
    },
    micFabPulse: {
      width: 72,
      height: 72,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOpacity: 0.24,
      shadowOffset: { width: 0, height: 14 },
      shadowRadius: 22,
      elevation: 14
    },
    micFabPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }]
    },
    micFabDisabled: {
      opacity: 0.5
    }
  });
}
