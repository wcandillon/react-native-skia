import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  Circle,
  Image,
  ImageShader,
  dist,
  makeImageFromView,
  mix,
  vec,
} from "@shopify/react-native-skia";
import type { ReactNode, RefObject } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { Theme } from "./theme";
import { darkTheme, lightTheme } from "./theme";

const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type ColorSchemeName = "light" | "dark";

interface ColorScheme {
  active: boolean;
  colorScheme: ColorSchemeName;
  overlay1: SkImage | null;
  overlay2: SkImage | null;
}

interface ColorSchemeContextValue extends ColorScheme {
  ref: RefObject<View | null>;
  transition: SharedValue<number>;
  circle: SharedValue<{ x: number; y: number; r: number }>;
  dispatch: (scheme: ColorScheme) => void;
}

const defaultValue: ColorScheme = {
  active: false,
  colorScheme: "dark",
  overlay1: null,
  overlay2: null,
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

const colorSchemeReducer = (_: ColorScheme, next: ColorScheme) => next;

export const useTheme = (): Theme => {
  const ctx = useContext(ColorSchemeContext);
  if (ctx === null) {
    throw new Error("No ColorScheme context found");
  }
  return ctx.colorScheme === "light" ? lightTheme : darkTheme;
};

export const useColorScheme = () => {
  const ctx = useContext(ColorSchemeContext);
  if (ctx === null) {
    throw new Error("No ColorScheme context found");
  }
  const { colorScheme, dispatch, ref, transition, circle, active } = ctx;
  const toggle = useCallback(
    async (x: number, y: number) => {
      const newColorScheme = colorScheme === "light" ? "dark" : "light";

      dispatch({
        active: true,
        colorScheme,
        overlay1: null,
        overlay2: null,
      });
      // 0. Define the circle and its maximum radius (farthest screen corner)
      const r = Math.max(...corners.map((corner) => dist(corner, { x, y })));
      circle.value = { x, y, r };

      // 1. Snapshot the current (old) theme
      const overlay1 = await makeImageFromView(ref as RefObject<View>);
      dispatch({
        active: true,
        colorScheme,
        overlay1,
        overlay2: null,
      });

      // 2. Switch theme and let it render
      await wait(16);
      dispatch({
        active: true,
        colorScheme: newColorScheme,
        overlay1,
        overlay2: null,
      });
      await wait(16);

      // 3. Snapshot the new theme
      const overlay2 = await makeImageFromView(ref as RefObject<View>);
      dispatch({
        active: true,
        colorScheme: newColorScheme,
        overlay1,
        overlay2,
      });

      // 4. Animate the circular reveal
      transition.value = 0;
      transition.value = withTiming(1, { duration: 650 });
      await wait(650);

      dispatch({
        active: false,
        colorScheme: newColorScheme,
        overlay1: null,
        overlay2: null,
      });
    },
    [circle, colorScheme, dispatch, ref, transition]
  );
  return { colorScheme, toggle, active };
};

interface ColorSchemeProviderProps {
  children: ReactNode;
}

const { width, height } = Dimensions.get("screen");
const corners = [vec(0, 0), vec(width, 0), vec(width, height), vec(0, height)];

export const ColorSchemeProvider = ({ children }: ColorSchemeProviderProps) => {
  const circle = useSharedValue({ x: 0, y: 0, r: 0 });
  const transition = useSharedValue(0);
  const ref = useRef<View>(null);
  const [{ colorScheme, overlay1, overlay2, active }, dispatch] = useReducer(
    colorSchemeReducer,
    defaultValue
  );
  const r = useDerivedValue(() => mix(transition.value, 0, circle.value.r));
  const contextValue = useMemo(
    () => ({
      active,
      colorScheme,
      overlay1,
      overlay2,
      dispatch,
      ref,
      transition,
      circle,
    }),
    [active, colorScheme, overlay1, overlay2, transition, circle]
  );
  return (
    <View style={styles.root}>
      <View ref={ref} style={styles.root} collapsable={false}>
        <ColorSchemeContext.Provider value={contextValue}>
          {children}
        </ColorSchemeContext.Provider>
      </View>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image image={overlay1} x={0} y={0} width={width} height={height} />
        {overlay2 && (
          <Circle c={circle} r={r}>
            <ImageShader
              image={overlay2}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            />
          </Circle>
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
