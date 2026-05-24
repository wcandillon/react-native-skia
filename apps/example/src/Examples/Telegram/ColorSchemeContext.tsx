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

// requestAnimationFrame fires after the next paint, so awaiting `nextFrame()`
// is far more reliable than `setTimeout(16)` for "wait until React committed
// and Android actually drew the new theme."
const nextFrame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => {
      resolve();
    })
  );

const settle = async (frames: number) => {
  for (let i = 0; i < frames; i++) {
    await nextFrame();
  }
};

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
      // Guard re-entry. Without it, fast double-taps drive two animations
      // through the same reducer and the second one stomps the first
      // mid-transition, which is the main source of the "shaky" feel.
      if (active) {
        return;
      }
      const newColorScheme = colorScheme === "light" ? "dark" : "light";

      // 0. Reset the reveal to fully clipped before we activate. If we
      // don't, the previous run's terminal value can flash for one frame.
      transition.value = 0;
      const r = Math.max(...corners.map((corner) => dist(corner, { x, y })));
      circle.value = { x, y, r };

      // 1. Snapshot the current (old) theme. Two settle frames first so any
      // pending paint (search input focus, WebView tile load, etc.) lands
      // before we capture.
      await settle(2);
      const overlay1 = await makeImageFromView(ref as RefObject<View>);
      if (!overlay1) {
        return;
      }

      // 2. Show the snapshot. Wait several frames so the Canvas actually
      // commits the image to the overlay before we let the live view
      // re-render in the new theme underneath. This is what stops the
      // brief "wrong theme" flash that used to peek through.
      dispatch({ active: true, colorScheme, overlay1, overlay2: null });
      await settle(3);

      // 3. Switch the live view to the new theme. The overlay still
      // covers it, so the user sees no change yet.
      dispatch({
        active: true,
        colorScheme: newColorScheme,
        overlay1,
        overlay2: null,
      });
      // Give the WebView, contacts strip, and chat rows enough frames to
      // finish recoloring before we capture the second snapshot.
      await settle(4);

      // 4. Snapshot the new theme.
      const overlay2 = await makeImageFromView(ref as RefObject<View>);
      if (!overlay2) {
        // Bail cleanly: end the transition with the new theme applied but
        // no animation. The user sees a hard cut, not a stuck overlay.
        dispatch({
          active: false,
          colorScheme: newColorScheme,
          overlay1: null,
          overlay2: null,
        });
        return;
      }
      dispatch({
        active: true,
        colorScheme: newColorScheme,
        overlay1,
        overlay2,
      });
      // One more frame so the second image is in the Canvas before the
      // expanding circle starts sampling it.
      await settle(1);

      // 5. Animate the circular reveal.
      transition.value = withTiming(1, { duration: 650 });
      await wait(700);

      dispatch({
        active: false,
        colorScheme: newColorScheme,
        overlay1: null,
        overlay2: null,
      });
    },
    [active, circle, colorScheme, dispatch, ref, transition]
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
