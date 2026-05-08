import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { useHabitStore } from "@/store/habitStore";

type AuthState = {
  userId: string;
  email: string;
  loading: boolean;
  error: string | null;
  emailConfirmationSent: boolean;
  confirmationEmail: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsDemo: () => void;
  bootstrap: () => Promise<void>;
};

const localUserId = "local-user";

export const useAuthStore = create<AuthState>((set) => ({
  userId: localUserId,
  email: "local@habit.app",
  loading: false,
  error: null,
  emailConfirmationSent: false,
  confirmationEmail: "",
  signIn: async (email, password) => {
    if (!supabase) {
      set({ userId: localUserId, email, error: null });
      useHabitStore.getState().resetLocalDemo();
      return;
    }

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      const userId = data.user?.id ?? localUserId;

      set({
        userId,
        email: data.user?.email ?? email,
        loading: false,
        error: error?.message ?? null
      });

      if (!error) {
        await useHabitStore.getState().loadForUser(userId);
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Could not sign in. You can continue offline."
      });
    }
  },
    signUp: async (email, password) => {
     if (!supabase) {
       set({ userId: localUserId, email, error: null, emailConfirmationSent: false, confirmationEmail: "" });
       useHabitStore.getState().resetLocalDemo();
       return;
     }

     set({ loading: true, error: null });
     try {
       const { data, error } = await supabase.auth.signUp({ email, password });

       if (error) {
         set({
           userId: localUserId,
           email,
           loading: false,
           error: error.message,
           emailConfirmationSent: false,
           confirmationEmail: ""
         });
         return;
       }

       // If no session, then we need email confirmation
       if (!data.session?.user) {
         set({
           userId: localUserId,
           email,
           loading: false,
           error: null,
           emailConfirmationSent: true,
           confirmationEmail: email
         });
         return;
       }

       const userId = data.session.user.id;

       set({
         userId,
         email: data.session.user.email ?? email,
         loading: false,
         error: null,
         emailConfirmationSent: false,
         confirmationEmail: ""
       });

       await useHabitStore.getState().loadForUser(userId);
     } catch (error) {
       set({
         loading: false,
         error: error instanceof Error ? error.message : "Could not create the account. You can continue offline.",
         emailConfirmationSent: false,
         confirmationEmail: ""
       });
     }
   },
  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    set({ userId: localUserId, email: "local@habit.app", error: null });
    useHabitStore.getState().resetLocalDemo();
  },
  continueAsDemo: () => {
    set({ userId: localUserId, email: "local@habit.app", loading: false, error: null });
    useHabitStore.getState().resetLocalDemo();
  },
  bootstrap: async () => {
    if (!supabase) {
      useHabitStore.getState().resetLocalDemo();
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? localUserId;

      set({
        userId,
        email: data.session?.user.email ?? "local@habit.app"
      });

      await useHabitStore.getState().loadForUser(userId);
    } catch {
      set({ userId: localUserId, email: "local@habit.app", loading: false });
      useHabitStore.getState().resetLocalDemo();
    }
  }
}));
