import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { AndroidSurfaceType } from "react-native-skia";
import {
  Canvas,
  Circle,
  Fill,
  LinearGradient,
  useClock,
  vec,
} from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

// Exercises the Android backing views. The canvas is drawn with rounded
// corners inside a clipping parent and over a striped background, with an RN
// view stacked on top of it. This makes the difference between the two views
// visible at a glance: a TextureView keeps the clip, the alpha and the
// stacking order, while a SurfaceView punches through all of them. The
// zOrderOnTop switch then moves the SurfaceView above the whole window.

type SurfaceType = "auto" | AndroidSurfaceType;

const surfaceTypes: SurfaceType[] = ["auto", "SurfaceView", "TextureView"];

const Stripes = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {Array.from({ length: 12 }).map((_, i) => (
      <View
        key={i}
        style={[styles.stripe, { backgroundColor: i % 2 ? "#ddd" : "#bbb" }]}
      />
    ))}
  </View>
);

export const AndroidViews = () => {
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("auto");
  const [opaque, setOpaque] = useState(false);
  const [zOrderOnTop, setZOrderOnTop] = useState(false);
  const clock = useClock();
  const cx = useDerivedValue(
    () => 100 + 60 * Math.sin(clock.value / 500),
    [clock]
  );
  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Stripes />
        <View style={styles.clip}>
          <Canvas
            style={styles.canvas}
            opaque={opaque}
            android={{
              surfaceType: surfaceType === "auto" ? undefined : surfaceType,
              zOrderOnTop,
            }}
          >
            <Fill>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, 200)}
                colors={["rgba(0, 122, 255, 0.6)", "rgba(88, 86, 214, 0.6)"]}
              />
            </Fill>
            <Circle cx={cx} cy={100} r={40} color="white" />
          </Canvas>
        </View>
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>RN view above the canvas</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Text style={styles.label}>android.surfaceType</Text>
        <View style={styles.row}>
          {surfaceTypes.map((type) => (
            <Pressable
              key={type}
              onPress={() => setSurfaceType(type)}
              style={[styles.chip, type === surfaceType && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  type === surfaceType && styles.chipTextActive,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>opaque</Text>
          <Switch value={opaque} onValueChange={setOpaque} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>
            android.zOrderOnTop (SurfaceView only)
          </Text>
          <Switch value={zOrderOnTop} onValueChange={setZOrderOnTop} />
        </View>
        <Text style={styles.hint}>
          auto picks SurfaceView when opaque and TextureView otherwise. A
          SurfaceView ignores the rounded clip and the overlay; with zOrderOnTop
          it also covers the controls when they overlap.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stripe: {
    flex: 1,
  },
  clip: {
    width: 260,
    height: 200,
    borderRadius: 32,
    overflow: "hidden",
    transform: [{ rotate: "-6deg" }],
  },
  canvas: {
    width: 260,
    height: 200,
  },
  overlay: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 59, 48, 0.85)",
  },
  overlayText: {
    color: "white",
    fontWeight: "bold",
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontWeight: "bold",
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
  },
  chipText: {
    color: "#333",
  },
  chipTextActive: {
    color: "white",
  },
  hint: {
    color: "#666",
  },
});
