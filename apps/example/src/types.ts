import type { NavigatorScreenParams } from "@react-navigation/native";

import type { Routes as APIRoutes } from "./Examples/API/Routes";

export type StackParamList = {
  Tests: {
    title?: string;
    path?: string[];
  };
  Home: undefined;
  Vertices: undefined;
  API: NavigatorScreenParams<APIRoutes> | undefined;
  LiquidGlass: undefined;
  Chess: undefined;
  Breathe: undefined;
  ImageLoading: undefined;
  Filters: undefined;
  Gooey: undefined;
  Hue: undefined;
  Matrix: undefined;
  Severance: undefined;
  Aurora: undefined;
  Glassmorphism: undefined;
  Neumorphism: undefined;
  Wallpaper: undefined;
  Wallet: undefined;
  Graphs: undefined;
  Animation: undefined;
  Reanimated: undefined;
  Performance: undefined;
  Transitions: undefined;
  Stickers: undefined;
  FrostedCard: undefined;
  SpeedTest: undefined;
  Video: undefined;
  Chat: undefined;
  Pictures: undefined;
  WebGPU: undefined;
  ThreeJS: undefined;
  HighBitDepth: undefined;
};
