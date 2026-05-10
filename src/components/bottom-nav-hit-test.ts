type HorizontalFrame = {
  x: number;
  width: number;
};

export function getTabIndexFromLocation(frame: HorizontalFrame, tabCount: number, pageX: number) {
  if (tabCount <= 0 || frame.width <= 0) {
    return null;
  }

  const tabWidth = frame.width / tabCount;
  const localX = Math.max(0, Math.min(frame.width - 1, pageX - frame.x));

  return Math.floor(localX / tabWidth);
}
