import { Redirect } from "expo-router";

import { useAuthStore } from "@/store/authStore";

const LOCAL_USER_ID = "local-user";

// Entry point for the /auth route. Sends users to the appropriate screen
// instead of rendering a blank page.
export default function AuthIndex() {
  const userId = useAuthStore((state) => state.userId);
  const loading = useAuthStore((state) => state.loading);
  const emailConfirmationSent = useAuthStore((state) => state.emailConfirmationSent);

  if (loading) {
    return null;
  }

  if (userId !== LOCAL_USER_ID && !emailConfirmationSent) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth/sign-in" />;
}
