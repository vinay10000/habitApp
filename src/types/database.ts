import type { HabitCategory, HabitType } from "./habit";
import type { Schedule, TimeOfDay } from "./schedule";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: HabitType;
          category: HabitCategory;
          schedule: Schedule;
          time_of_day: TimeOfDay;
          target_count: number | null;
          streak: number;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          type: HabitType;
          category: HabitCategory;
          schedule: Schedule;
          time_of_day: TimeOfDay;
          target_count?: number | null;
          streak?: number;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Insert"]>;
        Relationships: [];
      };
      habit_completions: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          completed_on: string;
          count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id?: string;
          completed_on: string;
          count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["habit_completions"]["Insert"]>;
        Relationships: [];
      };
      streaks: {
        Row: {
          habit_id: string;
          user_id: string;
          current_count: number;
          best_count: number;
          updated_at: string;
        };
        Insert: {
          habit_id: string;
          user_id: string;
          current_count?: number;
          best_count?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["streaks"]["Insert"]>;
        Relationships: [];
      };
      mood_logs: {
        Row: {
          id: string;
          user_id: string;
          mood: "great" | "okay" | "low";
          logged_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          mood: "great" | "okay" | "low";
          logged_on?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mood_logs"]["Insert"]>;
        Relationships: [];
      };
      ai_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          input: Json;
          output: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          event_type: string;
          input: Json;
          output?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_events"]["Insert"]>;
        Relationships: [];
      };
    };
  };
};
