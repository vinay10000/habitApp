## Build status — Minimal AI Habit Tracker

### Overall
- **Core loop**: Implemented locally and typechecked (`open app → see today’s timeline → tap habit → optimistic completion`).
- **Android-focused app layer**: Implemented timer habits, negative habits, Android voice recording, Gemini-backed AI command flows, mood logging, richer analytics, recovery streak behavior, persistent settings, Android reminders, offline queue capture, Supabase streak persistence, and Android widget support.
- **Backend AI**: Supabase Edge Functions are scaffolded for Gemini 3.1 Flash Lite transcription and habit intelligence. Deploy them with `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` set in Supabase secrets.

### Implemented
- **Expo + TypeScript + Expo Router**
  - `app/_layout.tsx` uses `Tabs` for `Home`, `Streaks`, `Analytics`, `Settings`.
  - Screens remain thinly wired through `app/*.tsx` to `src/screens/*`.

- **Timeline home screen**
  - `HomeScreen.tsx` shows today’s habits grouped by `timeOfDay`.
  - One-tap optimistic updates use `HabitRow` → `useHabitStore.completeHabit`.
  - Home includes quick links, mood check-in, Gemini voice actions, routine builder, and weekly report action.

- **Habit types**
  - **Binary**: one tap completes.
  - **Count**: one tap increments toward target.
  - **Timer**: one tap adds five focus minutes toward a configured minute target.
  - **Negative**: starts as avoided for the day; tapping logs a slip and affects avoidance streaks.

- **Scheduling**
  - Domain supports daily, weekdays, weekends, every X days, custom days, and monthly.
  - Add Habit UI exposes all supported schedule shapes, including custom day chips and monthly.

- **Streaks and recovery**
  - Streaks screen shows 21-day dot chains, scheduled-day opacity, and avoidance/completion labels.
  - Streak logic softens one missed scheduled day for positive habits after momentum has started.
  - Negative habits use avoidance completion semantics.
  - `upsertRemoteStreak` syncs current streak state to Supabase after completion changes.

- **Analytics**
  - Analytics includes today completion rate, remaining habits, best streak, weekly consistency bars, strongest category, mood link, and a simple weekly report signal.
  - Kept intentionally lightweight to match the product philosophy.

- **Add habit flow**
  - Supports binary, count, timer, and negative habits.
  - Supports all scheduling options.
  - Timer target is tracked as minutes; count target remains taps/count.

- **Authentication and Supabase sync**
  - `authStore.ts` supports local demo mode and Supabase sessions.
  - `habitStore.loadForUser` loads remote habits, completions, and mood logs.
  - Habit creation, completion upserts, mood log upserts, habit edits, and streak updates sync to Supabase when configured.
  - Failed create/complete/mood/edit writes enqueue into `src/lib/offlineQueue.ts` for durable retry handling.

- **Gemini AI / Android voice layer**
  - `expo-av` records microphone audio on Android.
  - `expo-file-system` converts recordings to base64 for Supabase Edge Function upload.
  - `transcribe-audio` Edge Function sends audio inline data to Gemini 3.1 Flash Lite and returns transcript text.
  - `parse-habit` Edge Function parses create, complete, edit, routine, weekly report, and preview commands into strict JSON.
  - `routine-builder` Edge Function generates 2-5 calm habit drafts.
  - `weekly-report` Edge Function generates minimal non-guilt weekly summaries.
  - Home can Record → Stop + transcribe → apply Gemini command, or run typed commands.
  - Local demo mode still has deterministic fallbacks for create/edit/routine/check-in/report.

- **Mood tracking and correlation**
  - Home supports Great / Okay / Low mood logging.
  - Mood logs sync through Supabase.
  - Analytics summarizes latest mood beside today’s completion rate.

- **Android home-screen widget**
  - `src/lib/widgetSnapshot.ts` creates a compact today snapshot: done/total, remaining, progress, best streak, next habit, and top habits.
  - `habitStore.ts` persists the widget snapshot after local demo reset, remote load, habit creation, and completion changes.
  - `src/lib/habitWidgetNative.ts` bridges the snapshot to Android native code when running on Android.
  - `widget/android/java/com/habit/widget/*` implements a native AppWidget provider, React Native bridge module, and package.
  - `widget/android/res/layout/habit_widget.xml`, `res/xml/habit_widget_info.xml`, and `res/drawable/habit_widget_background.xml` define the widget UI and metadata.
  - `plugins/with-android-habit-widget.js` copies widget native files, registers the widget receiver, adds strings, and injects the native package during Expo prebuild.
  - `app.json` includes the widget config plugin.

- **Android reminders and settings**
  - `expo-notifications` schedules a daily Android reminder based on unfinished habit count.
  - `settingsStore.ts` persists theme, reminder, smart copy, reduce motion, and weekly report preferences in AsyncStorage.
  - Settings supports theme selection for AMOLED, monochrome, paper, and pastel preferences.

- **Shared contracts and theme**
  - `contract-version.ts`, `constants.ts`, `types/*`, `theme/tokens.ts` remain the shared source of truth.
  - `AICommandResult` now covers create, complete, edit, routine, weekly report, and preview outputs.

### Android deployment notes
- Custom widgets, native recording, and notifications require a development or production Android build. Expo Go is not enough.
- Run:
  ```bash
  npx expo prebuild --platform android
  npx expo run:android
  ```
- Deploy Supabase functions and set Gemini secret:
  ```bash
  supabase secrets set GEMINI_API_KEY=your_key
  supabase functions deploy transcribe-audio
  supabase functions deploy parse-habit
  supabase functions deploy routine-builder
  supabase functions deploy weekly-report
  ```

### Intentionally out of scope
- iOS widgets, iOS speech capture, and web speech-to-text are not implemented because current focus is Android only.

### Verification
- `npm run typecheck` passes.
- `npm run test:domain` passes.

### Remaining work
- Verify on a real Android development build.
- Implement actual offline queue replay when connectivity/session returns; queue capture exists now.
- Apply selected theme tokens throughout all screens; preferences persist but visual token switching is not globally applied yet.
