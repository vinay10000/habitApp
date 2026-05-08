# Minimal AI Habit Tracker — Product and Build Spec

## 1. Product concept

A minimal, ultra-fast AI-powered habit tracker built around one principle:

> Every interaction should take under 2 seconds.

This is not a productivity suite, life dashboard, or bloated habit management tool. It should feel closer to checking a box on paper than managing software.

The app should feel:

- Calm
- Instant
- Lightweight
- Frictionless
- Premium, but not flashy
- Addictive in a healthy way

The goal is not to make users “productive.” The goal is to help users show up consistently with minimal effort.

## 2. Product philosophy

Most habit apps fail because they introduce:

- Too much setup
- Too many features
- Too much friction
- Overwhelming analytics
- Guilt-driven UX

This app focuses on:

- Speed
- Clarity
- Consistency
- Momentum
- Positive reinforcement

Product rule:

> If a feature makes the app feel heavier, slower, or more judgmental, it should be removed or deferred.

## 3. Core experience

Two interactions define the product.

### 3.1 Instant completion

Flow:

```text
Open app → tap once → habit completed
```

Requirements:

- One tap completes a habit.
- No confirmation popup.
- No unnecessary animation delay.
- No complicated flow.
- Completion should feel immediate through optimistic UI.
- Target interaction time: under 2 seconds.

Examples:

- Drink Water → tap → done
- Workout → tap → done
- Read → tap → done

### 3.2 Voice creation

Flow:

```text
Tap mic → speak naturally → AI creates habit → undo available
```

Examples:

- “Workout every weekday at 6.”
- “Read before sleeping.”
- “Practice DSA nightly.”

AI extracts:

- Title
- Habit type
- Schedule
- Reminder timing
- Category
- Duration or target, when relevant

Requirements:

- No long form required.
- AI should create immediately when confidence is high.
- Undo should be available after creation.
- API keys must never be exposed to the mobile app.

## 4. MVP scope

The first sprint should prove the core loop:

```text
Open app → see today’s timeline → tap habit → completed instantly
```

### MVP includes

- Expo app with TypeScript
- Timeline home screen
- Basic authentication
- Supabase-backed habits
- Add habit flow
- Binary habit completion
- Count habit increments
- Basic schedule filtering
- Basic streak display
- Optimistic completion
- Supabase persistence

### MVP defers

- AI habit creation
- Voice commands
- Widgets
- Mood correlation
- Weekly AI reports
- Advanced analytics
- Timer habits beyond basic data model support
- Full missed-day recovery UX

Reason:

> The app’s core must feel instant before AI, voice, and widgets are layered on top.

## 5. Main product features

### 5.1 Timeline-based home screen

Instead of cluttered cards, the home screen uses a calm timeline grouped by time of day.

Example:

```text
Morning
  Meditate
  Workout

Afternoon
  Drink Water

Evening
  Read
  Journal

Anytime
  Walk
  Stretch
```

Requirements:

- Today’s habits are visible immediately.
- Completion state is obvious but not noisy.
- The screen should prioritize one-tap completion.
- No dense dashboards on the home screen.

### 5.2 Habit types

#### Binary habits

Complete or not complete.

Examples:

- Workout
- Read
- Meditate

#### Count habits

Increment-based tracking.

Examples:

- Drink 8 glasses of water
- Walk 10,000 steps

Requirement:

- Each tap increments instantly.

#### Timer habits

Minimal focus timer.

Examples:

- Study
- Deep work
- Meditation

Requirement:

- Timer UI should be distraction-free.

#### Negative habits

Track avoidance.

Examples:

- No smoking
- No sugar
- No doomscrolling

Displays:

- Days avoided
- Recovery streaks
- Improvement trends

### 5.3 Streak visualization

Consistency should feel rewarding without aggressive gamification.

Useful patterns:

- Dot chains
- Heatmaps
- Streak flows
- Minimal calendars
- Momentum indicators

Avoid:

- Complicated charts
- Shame-based messaging
- Excessive gamification

Objective:

> Users should want to maintain streaks, not feel punished by them.

### 5.4 Quick add

Habit creation should take seconds.

Basic flow:

```text
Name → Icon → Frequency → Done
```

Suggested presets:

- Water
- Reading
- Coding
- Meditation
- Gym
- Journaling
- Sleep

### 5.5 Flexible scheduling

Supported schedules:

- Daily
- Weekdays
- Weekends
- Every X days
- Custom days
- Monthly habits

Requirement:

- Scheduling must stay simple in the UI.

### 5.6 Smart reminders

Reminders should feel supportive, not annoying.

Tone:

- Subtle
- Calm
- Lightweight

Examples:

- “2 habits left today.”
- “One tap and done.”
- “Keep the streak alive.”

Avoid:

- Guilt
- Pressure
- Toxic productivity language

### 5.7 Missed-day recovery

Missed-day recovery is a critical psychological feature.

Instead of:

> “You failed.”

Use:

- Streak freezes
- Recovery days
- Partial completion
- Soft restarts

Goal:

> Preserve motivation after missed days instead of causing abandonment.

### 5.8 Widgets

Widgets are a major retention driver and should be treated as a later native-complexity workstream.

Widget ideas:

- Lock screen single-tap completion widget
- Minimal streak widget
- Daily progress ring widget
- GitHub-style heatmap widget
- Active focus timer widget

Widget qualities:

- Glanceable
- Clean
- Instant

### 5.9 Mood and habit correlation

Optional lightweight mood tracking.

Mood options:

- Great
- Okay
- Low

Potential insights:

- Mood vs consistency
- Habits that improve mood
- Burnout patterns

Constraint:

> This should not become a mental health app.

### 5.10 Minimal analytics

Analytics should only show meaningful insights.

Examples:

- Completion rate
- Strongest habit
- Weakest time of day
- Weekly consistency score
- Streak trends

Avoid:

- Overwhelming dashboards
- Excessive graphs
- Data overload

## 6. AI features

AI features are premium candidates and should be implemented after the core loop is stable.

### 6.1 Voice-to-habit creation

The signature AI feature.

User says:

- “Workout every weekday at 6.”
- “Read before sleeping.”
- “Practice DSA nightly.”

AI returns a validated habit creation payload.

### 6.2 Conversational habit editing

Examples:

- “Move workout to mornings.”
- “Pause meditation this week.”
- “Increase water goal to 10 glasses.”

Requirement:

- AI updates habits through validated commands, not free-form mutations.

### 6.3 AI routine builder

Examples:

- “Create a healthy morning routine.”
- “Build me a student study routine.”

AI generates:

- Habits
- Timings
- Durations
- Frequencies

### 6.4 Voice check-in

Hands-free completion.

Examples:

- “Finished workout.”
- “Done reading.”
- “Skipped meditation.”

Useful contexts:

- Gym
- Driving
- Walking
- Bedtime

### 6.5 Weekly AI reports

Weekly overview:

- Streak growth
- Completion heatmaps
- Best days
- Weakest periods
- Consistency score

Constraint:

- Presentation should stay minimal.

### 6.6 Smart category detection

AI auto-categorizes habits into groups such as:

- Health
- Learning
- Fitness
- Mindfulness
- Productivity

### 6.7 AI naming assistance

Example:

User says:

> “Improve sleep.”

AI suggests:

- Sleep Early
- Wind Down
- Night Routine

## 7. Voice UX

Primary entry point:

- Floating mic button on the home screen

Flow:

```text
Tap mic → speak naturally → live transcript → AI parse → habit created or action preview
```

Voice UX requirements:

- Minimal waveform
- Live parsing state
- Clear undo behavior
- No long confirmation flow for high-confidence results
- Safe preview for destructive or ambiguous edits

## 8. Main screens

### 8.1 Home

Purpose:

- Timeline of today’s habits
- One-tap completion
- Floating mic button
- Quick add access

### 8.2 Streaks

Purpose:

- Heatmaps
- Dot chains
- Consistency visuals
- Momentum indicators

### 8.3 Analytics

Purpose:

- Minimal useful insights only

### 8.4 Voice capture

Purpose:

- Waveform
- Transcript
- AI parsing state
- Result preview or instant action

### 8.5 Add habit

Purpose:

- Ultra-fast manual creation

### 8.6 Settings

Purpose:

- Reminders
- Widgets
- Themes
- AI settings
- Backup

## 9. Design direction

Style references:

- Apple Health
- Notion Calendar
- Arc Browser
- GitHub heatmaps

Themes:

- AMOLED dark
- Monochrome
- Paper
- Soft minimal pastel

Design principles:

1. Zero clutter
2. Instant performance
3. Calm visual language
4. Minimal but premium execution

Prioritize:

- Whitespace
- Typography
- Rhythm
- Softness
- Readability

Avoid:

- Excessive menus
- Nested settings
- Feature overload
- Childish visuals
- Heavy animations

## 10. Monetization

### Free

- Core habits
- Streaks
- Widgets
- Reminders

### Premium

- AI habit creation
- Conversational editing
- Routine builder
- Voice check-ins
- Weekly AI reports
- Advanced AI insights

## 11. Technical direction

### Recommended stack

- Expo
- TypeScript
- Expo Router
- Supabase
- Supabase Edge Functions
- Google AI Studio / Gemma for AI features
- One global state approach, preferably Zustand or Redux Toolkit

### State management rule

Use exactly one global state strategy.

Avoid mixing:

- Context for app state
- Zustand
- Redux
- Feature-specific stores
- Duplicate caches

The app will eventually include optimistic updates, offline queueing, voice actions, AI parsing, streak updates, Supabase sync, widgets, and notifications. Without strict state boundaries, state management will become the main technical risk.

## 12. Shared contracts

Create shared contracts early so agents can work independently.

Recommended files:

- `src/types/habit.ts`
- `src/types/schedule.ts`
- `src/types/ai.ts`
- `src/types/database.ts`
- `src/lib/constants.ts`
- `src/lib/contract-version.ts`

Example:

```ts
export const CONTRACT_VERSION = "v1";
```

Agents must declare compatibility with the current contract version before implementation.

Example:

```text
Compatible with:
- contract version v1
```

This prevents:

- Outdated assumptions
- Mismatched schemas
- Stale AI prompts
- Invalid UI expectations

## 13. Architecture freeze milestones

Add explicit freeze checkpoints to prevent repeated foundation rewrites.

### Architecture Freeze 1

Locked decisions:

- Navigation structure
- Theme system
- Database schema
- State management approach
- Shared contract version

After a freeze:

- Only additive changes are allowed.
- No rewrites without orchestrator approval.
- Agents should propose shared changes instead of editing shared contracts directly.

## 14. Multi-agent orchestration model

Use a hub-and-spoke model.

```text
Lead Orchestrator
  ├── Product Architect
  ├── Mobile App Architect
  ├── Supabase Backend Agent
  ├── Core Habit Engine Agent
  ├── UI Design Agent
  ├── AI Integration Agent
  ├── Voice UX Agent
  ├── Notifications + Widgets Agent
  ├── Integration Agent
  └── QA + Review Agent
```

### Lead Orchestrator responsibilities

- Assign bounded tasks
- Resolve product and architecture decisions
- Enforce the app philosophy
- Prevent overbuilding
- Decide milestone completion
- Approve shared contract changes

### Integration Agent responsibilities

- Resolve merge conflicts
- Maintain shared contracts
- Run typecheck and build
- Keep agents compatible
- Maintain dependency consistency
- Own shared infrastructure files

This prevents the Lead Orchestrator from becoming overloaded as Expo Router, Supabase, AI functions, shared types, optimistic updates, and widgets evolve together.

## 15. Agent roles

### 15.1 Product Architect

Owns product shape and feature boundaries.

Responsibilities:

- Define MVP scope
- Prioritize milestones
- Prevent feature creep
- Translate philosophy into acceptance criteria
- Maintain user flows for completion, voice creation, streaks, widgets, and reminders

Outputs:

- Milestone breakdown
- User stories
- Acceptance criteria
- UX constraints

### 15.2 Mobile App Architect

Owns Expo app structure.

Responsibilities:

- Set up Expo + TypeScript + Expo Router
- Define folder structure
- Configure navigation
- Define shared UI architecture
- Create theme system
- Choose state management
- Ensure performance-first startup

Outputs:

- App skeleton
- Routing structure
- Shared component conventions
- Theme tokens
- Mobile architecture decisions

### 15.3 Supabase Backend Agent

Owns backend schema and security.

Responsibilities:

- Design tables
- Write migrations
- Enable Row Level Security
- Create policies
- Define indexes
- Create Supabase client config
- Create Edge Function structure

Main tables:

- `profiles`
- `habits`
- `habit_completions`
- `streaks`
- `mood_logs`
- `ai_events`

Outputs:

- Migrations
- RLS policies
- Backend type definitions
- Seed data
- Supabase setup instructions

### 15.4 Core Habit Engine Agent

Owns habit logic.

Responsibilities:

- Habit types
- Scheduling logic
- Completion logic
- Streak calculation
- Missed-day recovery rules
- Optimistic update behavior
- Offline queue design

Core modules:

- `src/features/habits/`
- `src/features/streaks/`
- `src/lib/dates.ts`

Outputs:

- TypeScript domain types
- Schedule utilities
- Streak utilities
- Completion service
- Tests

### 15.5 UI Design Agent

Owns visual system and screens.

Responsibilities:

- Implement calm, premium visual language
- Design timeline home screen
- Create habit row components
- Create streak heatmap
- Create analytics cards
- Create voice capture UI
- Create add habit flow

Outputs:

- Design tokens
- Reusable components
- Polished screens
- Responsive mobile layouts

### 15.6 AI Integration Agent

Owns Google AI Studio and Gemma integration.

Responsibilities:

- Design prompts
- Define strict JSON response schemas
- Implement Supabase Edge Functions
- Integrate Google AI Studio
- Validate model output
- Log AI events
- Handle premium gating later

Outputs:

- `parse-habit` Edge Function
- `edit-habit` Edge Function
- `routine-builder` Edge Function
- `voice-check-in` Edge Function
- Validation schemas
- Prompt templates

### 15.7 Voice UX Agent

Owns speech and voice flows.

Responsibilities:

- Microphone permissions
- Audio capture
- Speech-to-text integration path
- Voice capture screen
- Live parsing state
- Voice command routing
- Undo behavior

Outputs:

- Voice screen
- Transcript handling
- Voice action dispatcher
- AI result preview
- Voice check-in flow

### 15.8 Notifications + Widgets Agent

Owns retention surfaces.

Responsibilities:

- Local reminders
- Notification copy
- Notification scheduling
- Widget feasibility research
- Lock screen widget plan
- Home screen widget implementation strategy

Outputs:

- Reminder service
- Notification preferences
- Widget architecture
- First widget prototype

### 15.9 QA + Review Agent

Owns correctness and quality.

Responsibilities:

- Test strategy
- Unit tests
- Integration tests
- RLS verification
- Performance checks
- UX acceptance testing
- Code review

Outputs:

- Test cases
- Failing edge cases
- Review comments
- Regression checklist

## 16. Workstream boundaries

### Foundation workstream

Agents:

- Mobile App Architect
- Supabase Backend Agent

Owns:

- Expo setup
- Routing
- Supabase setup
- Auth
- Database schema
- RLS

This should happen first.

### Core product workstream

Agents:

- Product Architect
- Core Habit Engine Agent
- UI Design Agent

Owns:

- Timeline home
- Habit creation
- Instant completion
- Habit types
- Streaks
- Scheduling

This begins after the foundation skeleton exists.

### AI workstream

Agents:

- AI Integration Agent
- Voice UX Agent

Owns:

- Gemma API integration
- Voice capture
- Habit parsing
- Voice editing
- Voice check-ins
- Routine builder

This begins once habit schema and shared AI contracts exist.

### Retention workstream

Agents:

- Notifications + Widgets Agent
- UI Design Agent

Owns:

- Reminders
- Widgets
- Daily reset animation
- Missed-day recovery UX

This begins after completion and streak logic exist.

### Quality workstream

Agent:

- QA + Review Agent

Owns:

- Tests
- Performance
- Security
- Review
- Regression checks

This runs continuously after each milestone.

## 17. Task ownership rules

Every task should define:

- Owner
- Files allowed
- Files not allowed
- Inputs
- Outputs
- Acceptance criteria
- Contract version compatibility

Example:

```text
Owner: Core Habit Engine Agent

Files allowed:
- src/features/habits/**
- src/features/streaks/**
- src/lib/dates.ts
- src/types/habit.ts
- src/types/schedule.ts

Inputs:
- Supabase habit schema
- Product requirements
- Contract version v1

Outputs:
- Schedule utilities
- Completion utilities
- Streak utilities
- Tests

Acceptance criteria:
- Binary habits complete with one call.
- Count habits increment instantly.
- Weekday schedules resolve correctly.
- Missed days affect streaks correctly.

Do not touch:
- App routing
- Visual styling
- Supabase migrations
```

## 18. Branching strategy

Use one branch per workstream.

```text
main
  ├── feature/foundation
  ├── feature/core-habit-engine
  ├── feature/ui-home
  ├── feature/ai-functions
  ├── feature/voice-ux
  ├── feature/reminders-widgets
  └── feature/qa-polish
```

Recommended merge order:

1. `feature/foundation`
2. `feature/core-habit-engine`
3. `feature/ui-home`
4. `feature/ai-functions`
5. `feature/voice-ux`
6. `feature/reminders-widgets`
7. `feature/qa-polish`

Alternative for local Claude Code work:

- Use git worktrees per workstream.
- Keep each agent isolated.
- Merge through the orchestrator only.

## 19. Shared ownership files

These files should be modified only by the Lead Orchestrator or Integration Agent:

- `package.json`
- `app/_layout.tsx`
- `src/types/**`
- `src/lib/supabase.ts`
- `src/theme/**`
- `src/lib/contract-version.ts`

If an agent needs a shared change, it should propose it instead of editing directly.

Agents must avoid:

- Editing global contracts without coordination
- Changing dependencies independently
- Changing navigation from feature branches
- Duplicating Supabase clients
- Creating alternate theme systems
- Adding extra state libraries
- Creating separate AI wrappers
- Modifying unrelated screens

## 20. Multi-agent execution phases

### Phase 0: Planning alignment

Lead Orchestrator prepares:

- MVP scope
- File boundaries
- Task list
- Acceptance criteria
- Coding conventions
- Shared data model

No implementation yet.

### Phase 1: Foundation parallelization

Run in parallel:

- Mobile App Architect
- Supabase Backend Agent

Mobile builds:

- Expo app
- Routing
- Theme
- Navigation shell
- Base layout

Backend builds:

- Migrations
- RLS
- Supabase client
- Database types

Dependency:

- Both agree on shared Habit, Completion, and Profile types.

### Phase 2: Core habit implementation

Run in parallel after foundation:

- Core Habit Engine Agent
- UI Design Agent

Core builds:

- Scheduling
- Completion
- Streak logic
- Tests

UI builds:

- Static home screen
- Habit rows
- Add habit screen
- Visual tokens

Dependency:

- UI can use mocked habit data until backend integration is ready.

### Phase 3: Integration

Integration Agent combines:

- Real Supabase data
- Core habit logic
- UI screens
- Optimistic completion
- Streak updates

Key integration tests:

- Create habit
- List today’s habits
- Tap once to complete
- Streak updates
- Reload app and state persists

### Phase 4: AI and voice parallelization

Run in parallel:

- AI Integration Agent
- Voice UX Agent

AI builds:

- Supabase Edge Functions
- Gemma API wrapper
- JSON validation
- AI schemas

Voice builds:

- Mic capture screen
- Transcript UI
- Voice result handling
- Undo behavior

Dependency:

- Both use shared `AICommandResult` schema.

### Phase 5: Retention systems

Run in parallel:

- Notifications + Widgets Agent
- UI Design Agent

Builds:

- Local reminders
- Notification preferences
- Widget feasibility prototype
- Streak screen
- Analytics screen
- Daily reset visual
- Recovery UX

### Phase 6: QA and polish

QA validates:

- RLS policies
- Schedule edge cases
- Streak edge cases
- Offline optimistic updates
- AI malformed output handling
- App startup speed
- Home tap latency
- UI consistency

Lead Orchestrator and Integration Agent fix integration issues.

## 21. Recommended first build agent split

For the first build, keep the team lean.

Use five agents:

1. Lead Orchestrator
2. Mobile Foundation Agent
3. Supabase Backend Agent
4. Core Habit Engine Agent
5. UI Home Agent

Defer until MVP works:

- AI Integration Agent
- Voice UX Agent
- Widgets Agent
- Full QA Agent

Reason:

> The core loop must feel instant before adding AI, voice, and widgets.

## 22. First sprint plan

### Sprint goal

Build the core loop:

```text
Open app → see today’s timeline → tap habit → completed instantly
```

### Parallel tasks

#### Agent 1: Mobile Foundation

Builds:

- Expo initialization
- Expo Router setup
- Base routes
- Theme system
- Layout shell

#### Agent 2: Supabase Backend

Builds:

- Schema
- RLS
- Supabase client
- Seed habits

#### Agent 3: Habit Engine

Builds:

- Habit types
- Schedule utilities
- Completion utilities
- Streak utilities

#### Agent 4: UI Home

Builds:

- Timeline UI
- Habit row
- Quick add button
- Completion states using mock data

### Integration task

Lead Orchestrator and Integration Agent combine:

- Supabase habits
- Schedule filtering
- Optimistic completion
- Streak updates
- UI state

### Sprint acceptance criteria

- App runs in Expo.
- User can sign in.
- User can add a habit.
- Home screen groups habits by time of day.
- One tap completes a habit.
- Completion is optimistic.
- Completion persists in Supabase.
- Basic streak is visible.
- No completion interaction requires more than one tap.

## 23. Agent prompt template

```text
You are the [ROLE] for a minimal AI-powered habit tracker.

Product principle:
Every interaction should take under 2 seconds. The app should feel calm, instant, lightweight, and frictionless.

Your task:
[Specific task]

Compatible with:
- contract version [VERSION]

Files you may edit:
[List files/directories]

Files you must not edit:
[List files/directories]

Inputs:
[Contracts, schema, existing files, product requirements]

Output required:
[Implementation, tests, notes, decisions]

Acceptance criteria:
[List measurable outcomes]

Constraints:
- Do not add unnecessary features.
- Do not introduce complex flows.
- Prefer optimistic UI.
- Avoid guilt-driven UX.
- Keep interactions minimal.
- Do not change shared contracts without approval.
```

## 24. Review workflow

Each agent returns:

- Changed files
- Key decisions
- How to test
- Known limitations
- Contract version used

The Lead Orchestrator or Integration Agent then:

- Inspects the diff
- Runs tests
- Runs typecheck
- Tests the app manually
- Checks file ownership boundaries
- Merges or requests changes

## 25. Final execution recommendation

Best execution order:

1. Define contracts and file ownership.
2. Freeze initial architecture decisions.
3. Run foundation and backend agents in parallel.
4. Run habit engine and UI home agents in parallel.
5. Integrate the core loop.
6. Stabilize performance and state management.
7. Start AI and voice after the core loop works.
8. Start widgets last because they add native complexity.

The priority is not feature count. The priority is making the core loop feel instant, calm, and satisfying.
