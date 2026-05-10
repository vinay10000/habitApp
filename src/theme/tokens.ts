import type { ThemeName } from "@/store/settingsStore";

const glacierColors = {
  background: "#0C0F0D",
  surface: "#171A18",
  surfaceMuted: "#202521",
  surfaceElevated: "#242A26",
  text: "#F4F7F1",
  textMuted: "#9EA99F",
  line: "#2B322D",
  lineStrong: "#3E4941",
  accent: "#B7F269",
  accentSoft: "#26381F",
  accentText: "#0F160B",
  tertiary: "#6FD5C1",
  tertiarySoft: "#1B3632",
  warning: "#FFB86B",
  danger: "#FF8A7A",
  success: "#8ED8A7",
  glow: "rgba(215, 246, 109, 0.22)",
  whiteGlass: "rgba(255, 255, 255, 0.08)",
  nav: "#171A18",
  overlay: "rgba(16, 18, 15, 0.82)",
  statusBar: "light" as const
} as const;

const themeColors = {
  amoled: glacierColors,
  monochrome: {
    ...glacierColors,
    background: "#090909",
    surface: "#121212",
    surfaceMuted: "#1D1D1D",
    surfaceElevated: "#262626",
    text: "#F5F5F0",
    textMuted: "#A8A8A0",
    line: "#2E2E2A",
    lineStrong: "#4A4A43",
    accent: "#F0F0DE",
    accentSoft: "#333329",
    accentText: "#101010",
    tertiary: "#B9C7BA",
    tertiarySoft: "#243028",
    glow: "rgba(240, 240, 222, 0.18)",
    nav: "#0F0F0F",
    overlay: "rgba(9, 9, 9, 0.82)"
  },
  paper: {
    ...glacierColors,
    background: "#F7F4EC",
    surface: "#FFFDF8",
    surfaceMuted: "#ECE6D8",
    surfaceElevated: "#FFFFFF",
    text: "#25231D",
    textMuted: "#706D60",
    line: "#D8D0BD",
    lineStrong: "#B9AF99",
    accent: "#245C47",
    accentSoft: "#DDEADB",
    accentText: "#F9FFF5",
    tertiary: "#9C4F32",
    tertiarySoft: "#F2D9C8",
    warning: "#A75D16",
    danger: "#B24432",
    success: "#2F6E49",
    glow: "rgba(36, 92, 71, 0.15)",
    whiteGlass: "rgba(37, 35, 29, 0.05)",
    nav: "#FFFDF6",
    overlay: "rgba(245, 241, 230, 0.86)",
    statusBar: "dark" as const
  },
  pastel: {
    ...glacierColors,
    background: "#11131B",
    surface: "#1B1F2A",
    surfaceMuted: "#252B38",
    surfaceElevated: "#2C3242",
    accent: "#F0C36A",
    accentSoft: "#433721",
    accentText: "#201406",
    tertiary: "#84C8E8",
    tertiarySoft: "#203848",
    line: "#3B4052",
    lineStrong: "#5B6279",
    glow: "rgba(242, 195, 107, 0.18)",
    nav: "#191B25",
    overlay: "rgba(20, 21, 29, 0.84)"
  }
} as const;

let activeThemeName: ThemeName = "amoled";

export function getThemeTokens(themeName: ThemeName) {
  return {
    colors: themeColors[themeName],
    spacing,
    radius,
    typography
  } as const;
}

export function setActiveTheme(themeName: ThemeName) {
  activeThemeName = themeName;
  Object.assign(colors, themeColors[themeName]);
}

export const colors = { ...themeColors[activeThemeName] };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40
} as const;

export const radius = {
  sm: 7,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999
} as const;

export const typography = {
  title: 34,
  section: 14,
  body: 16,
  meta: 13,
  tiny: 11
} as const;

export const glass = {
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    elevation: 4
  }
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type TypographyToken = keyof typeof typography;

export const theme = {
  colors,
  spacing,
  radius,
  typography
} as const;

export type ThemeTokens = ReturnType<typeof getThemeTokens>;
