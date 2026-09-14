import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Canvas,
  Fill,
  LinearGradient,
  vec,
  useClock,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

// A dark-blue vertical gradient (the classic "night sky" worst case for
// banding) that slowly drifts up and down. The endpoints are integer 8-bit
// values with the same delta (+8/255) on every channel, so all three channels
// quantize at the same height: each band edge is a simultaneous r+g+b step,
// the strongest possible contour. On the default 8-bit canvas ~8 fat bands
// crawl across the screen; with highBitDepth the gradient stays smooth. Both
// canvases must show the same colors.
const colorA = "rgb(51, 56, 77)";
const colorB = "rgb(59, 64, 85)";

interface GradientCanvasProps {
  highBitDepth: boolean;
  label: string;
  clock: SharedValue<number>;
}

const GradientCanvas = ({
  highBitDepth,
  label,
  clock,
}: GradientCanvasProps) => {
  const size = useSharedValue({ width: 0, height: 0 });
  const start = useDerivedValue(() => {
    const phase = 0.15 * Math.sin(clock.value / 2000);
    return vec(0, -phase * size.value.height);
  });
  const end = useDerivedValue(() => {
    const phase = 0.15 * Math.sin(clock.value / 2000);
    return vec(0, (1 - phase) * size.value.height);
  });
  return (
    <View style={styles.column}>
      <Canvas
        style={styles.canvas}
        opaque
        highBitDepth={highBitDepth}
        onSize={size}
      >
        <Fill>
          <LinearGradient start={start} end={end} colors={[colorA, colorB]} />
        </Fill>
      </Canvas>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

export const HighBitDepth = () => {
  const clock = useClock();
  return (
    <View style={styles.container}>
      <GradientCanvas highBitDepth={false} label="8-bit" clock={clock} />
      <GradientCanvas
        highBitDepth={true}
        label="high bit depth"
        clock={clock}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  column: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  label: {
    textAlign: "center",
    padding: 8,
    fontWeight: "bold",
  },
});
