type HorizontalFrame = {
  x: number;
  width: number;
};

export type VoiceAction = "voice" | "manual";

export function getTabIndexFromLocation(frame: HorizontalFrame, tabCount: number, pageX: number) {
  if (tabCount <= 0 || frame.width <= 0) {
    return null;
  }

  const tabWidth = frame.width / tabCount;
  const localX = Math.max(0, Math.min(frame.width - 1, pageX - frame.x));

  return Math.floor(localX / tabWidth);
}

export function getVoiceActionFromVerticalSwipe(currentAction: VoiceAction, startY: number, endY: number, threshold = 36): VoiceAction {
  if (Math.abs(endY - startY) < threshold) {
    return currentAction;
  }

  return currentAction === "voice" ? "manual" : "voice";
}
