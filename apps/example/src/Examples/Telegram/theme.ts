export const lightTheme = {
  mainBackground: "#F0F2F3",
  mainForeground: "#0B0B0B",
  secondaryBackground: "rgba(0, 0, 0, 0.04)",
  muted: "#8E8E93",
  divider: "rgba(0, 0, 0, 0.08)",
};

export const darkTheme = {
  mainBackground: "#0B0B0B",
  mainForeground: "#F0F2F3",
  secondaryBackground: "#3B3B3B",
  muted: "#8E8E93",
  divider: "rgba(255, 255, 255, 0.08)",
};

export type Theme = typeof lightTheme;

export const spacing = {
  s: 8,
  m: 16,
  l: 24,
  xl: 40,
};
