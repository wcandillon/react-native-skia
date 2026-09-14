import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { Canvas, Circle, Fill, select } from "@shopify/react-native-skia";

import { AnimationDemo } from "./Components";

// Demonstrates driving many animated props from a SINGLE shared value
// instead of one derived value per prop. Both modes render the exact same
// animation; only the wiring differs:
//
//   • Grouped  — one value holds every coordinate; each prop reads its own
//                key from it. Reanimated subscribes once (1 mapper).
//   • Per-prop — every prop gets its own derived value, so Reanimated
//                subscribes once per prop (COUNT * 3 mappers).
//
// Grouping wins on:
//   - performance     fewer UI-thread mappers recomputing each frame
//   - maintainability one source of truth per component, no hook-per-prop
//   - locality        a component's animated state lives in one value
const COUNT = 24;
const BASE_RADIUS = 6;
const CANVAS_HEIGHT = 280;
const COLORS = ["#8556E5", "#3EB489", "#FF7A1A", "#E5563F"];

// Motion of dot `i` at time `t`, shared by both approaches so the animation
// is visually identical — only the wiring underneath differs.
const dotX = (t: number, i: number, cx: number, orbit: number) => {
  "worklet";
  const a = t + (i / COUNT) * Math.PI * 2;
  const ring = 0.4 + 0.6 * ((i % 6) / 6);
  return cx + Math.cos(a) * orbit * ring;
};
const dotY = (t: number, i: number, cy: number, orbit: number) => {
  "worklet";
  const a = t + (i / COUNT) * Math.PI * 2;
  const ring = 0.4 + 0.6 * ((i % 6) / 6);
  return cy + Math.sin(a) * orbit * ring;
};
const dotR = (t: number, i: number) => {
  "worklet";
  return BASE_RADIUS + (Math.sin(t * 2 + i) + 1) * 3;
};

interface SceneProps {
  clock: SharedValue<number>;
  cx: number;
  cy: number;
  orbit: number;
}

// "Separate prop" approach: every prop of every dot gets its own derived
// value, i.e. its own Reanimated mapper. COUNT * 3 mappers total.
const DerivedDot = ({
  clock,
  i,
  cx,
  cy,
  orbit,
}: SceneProps & { i: number }) => {
  const x = useDerivedValue(() => dotX(clock.value, i, cx, orbit));
  const y = useDerivedValue(() => dotY(clock.value, i, cy, orbit));
  const r = useDerivedValue(() => dotR(clock.value, i));
  return <Circle cx={x} cy={y} r={r} color={COLORS[i % COLORS.length]} />;
};

const DerivedScene = (props: SceneProps) => (
  <>
    {new Array(COUNT).fill(0).map((_, i) => (
      <DerivedDot key={i} i={i} {...props} />
    ))}
  </>
);

// "Single value" approach: ONE derived value computes every coordinate into
// an object, and each prop reads its own key from it. 1 mapper total.
const SingleValueScene = ({ clock, cx, cy, orbit }: SceneProps) => {
  const data = useDerivedValue(() => {
    const t = clock.value;
    const obj: Record<string, number> = {};
    for (let i = 0; i < COUNT; i++) {
      obj[`x${i}`] = dotX(t, i, cx, orbit);
      obj[`y${i}`] = dotY(t, i, cy, orbit);
      obj[`r${i}`] = dotR(t, i);
    }
    return obj;
  });
  return (
    <>
      {new Array(COUNT).fill(0).map((_, i) => (
        <Circle
          key={i}
          cx={select(data, `x${i}`)}
          cy={select(data, `y${i}`)}
          r={select(data, `r${i}`)}
          color={COLORS[i % COLORS.length]}
        />
      ))}
    </>
  );
};

export const SharedValueComparison = () => {
  const { width } = useWindowDimensions();
  const [single, setSingle] = useState(true);

  const clock = useSharedValue(0);
  useFrameCallback(({ timeSinceFirstFrame }) => {
    "worklet";
    clock.value = timeSinceFirstFrame / 1000;
  }, true);

  const cx = width / 2;
  const cy = CANVAS_HEIGHT / 2;
  const orbit = Math.min(width, 360) / 2 - 24;
  const mapperCount = single ? 1 : COUNT * 3;

  return (
    <AnimationDemo title={"Grouped vs. per-prop animation values"}>
      <Text style={styles.subheading}>
        {`Same ${COUNT * 3}-prop animation, wired two ways. "Grouped" drives ` +
          `every prop from one shared value; "Per-prop" gives each prop its ` +
          `own derived value. Watch the Reanimated mapper count change.`}
      </Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.btn, single && styles.btnActive]}
          onPress={() => setSingle(true)}
        >
          <Text style={[styles.btnText, single && styles.btnTextActive]}>
            Grouped
          </Text>
        </Pressable>
        <Pressable
          style={[styles.btn, !single && styles.btnActive]}
          onPress={() => setSingle(false)}
        >
          <Text style={[styles.btnText, !single && styles.btnTextActive]}>
            Per-prop
          </Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>
        {`Reanimated mappers (animation subscriptions): ${mapperCount}`}
      </Text>
      <Canvas style={styles.canvas}>
        <Fill color="white" />
        {single ? (
          <SingleValueScene clock={clock} cx={cx} cy={cy} orbit={orbit} />
        ) : (
          <DerivedScene clock={clock} cx={cx} cy={cy} orbit={orbit} />
        )}
      </Canvas>
    </AnimationDemo>
  );
};

const styles = StyleSheet.create({
  subheading: {
    color: "#444",
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8556E5",
    marginHorizontal: 4,
    alignItems: "center",
  },
  btnActive: {
    backgroundColor: "#8556E5",
  },
  btnText: {
    color: "#8556E5",
    fontWeight: "600",
  },
  btnTextActive: {
    color: "white",
  },
  caption: {
    color: "black",
    marginBottom: 8,
    fontVariant: ["tabular-nums"],
  },
  canvas: {
    height: CANVAS_HEIGHT,
    width: "100%" as const,
    backgroundColor: "#FEFEFE" as const,
  },
});
