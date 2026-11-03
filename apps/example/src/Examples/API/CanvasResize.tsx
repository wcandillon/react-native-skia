import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Canvas, Circle, Fill, Shader, Skia } from "react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// A checkerboard of 24 point cells: a frame stretched to another size than
// the one it was recorded for shows as cells that are no longer square.
const checkerboard = Skia.RuntimeEffect.Make(`
half4 main(float2 p) {
  float2 cell = floor(p / 24.0);
  float odd = mod(cell.x + cell.y, 2.0);
  return mix(half4(0.26, 0.6, 1.0, 1.0), half4(1.0, 1.0, 1.0, 1.0), odd);
}`)!;

const MIN_WIDTH = 120;
const MIN_HEIGHT = 120;
const MAX_WIDTH = 340;
const MAX_HEIGHT = 440;

// The canvas changes size on every frame (its box is animated on the UI
// thread) while a circle animates in it: the presents of the view race its
// resizes. Switch the backing view to try both Android paths.
export const CanvasResize = () => {
  const [surfaceView, setSurfaceView] = useState(false);
  const progress = useSharedValue(0);
  const clock = useSharedValue(0);
  useFrameCallback((info) => {
    clock.value = info.timeSinceFirstFrame;
  });
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [progress]);
  const box = useAnimatedStyle(() => ({
    width: MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * progress.value,
    height: MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * progress.value,
  }));
  const cx = useDerivedValue(() => 60 + 40 * Math.sin(clock.value / 250));
  const cy = useDerivedValue(() => 60 + 40 * Math.cos(clock.value / 250));
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text>Android SurfaceView</Text>
        <Switch value={surfaceView} onValueChange={setSurfaceView} />
      </View>
      <Animated.View style={[styles.box, box]}>
        <Canvas
          key={surfaceView ? "SurfaceView" : "TextureView"}
          style={StyleSheet.absoluteFill}
          android={{ backingView: surfaceView ? "SurfaceView" : "TextureView" }}
        >
          <Fill>
            <Shader source={checkerboard} />
          </Fill>
          <Circle cx={cx} cy={cy} r={16} color="red" />
        </Canvas>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  box: {
    backgroundColor: "cyan",
  },
});
