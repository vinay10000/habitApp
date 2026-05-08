import { useMemo } from "react";

import { useSettingsStore } from "@/store/settingsStore";
import { getThemeTokens } from "@/theme/tokens";

export function useThemeTokens() {
  const themeName = useSettingsStore((state) => state.theme);

  return useMemo(() => getThemeTokens(themeName), [themeName]);
}
