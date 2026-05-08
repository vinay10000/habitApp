import { NativeModules, Platform } from "react-native";

import type { WidgetSnapshot } from "@/lib/widgetSnapshot";

type HabitWidgetModule = {
  setSnapshot?: (snapshot: string) => void;
};

const nativeHabitWidget = NativeModules.HabitWidget as HabitWidgetModule | undefined;

export function updateNativeWidget(snapshot: WidgetSnapshot) {
  if (Platform.OS !== "android") {
    return;
  }

  nativeHabitWidget?.setSnapshot?.(JSON.stringify(snapshot));
}
