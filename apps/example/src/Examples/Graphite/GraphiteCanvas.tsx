import React, { useEffect, useState } from "react";
import { Image as RNImage, StyleSheet, Text, View } from "react-native";
import type { SkImage, SkSize } from "react-native-skia";
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Image,
  LinearGradient,
  Rect,
  RoundedRect,
  useCanvasRef,
  vec,
} from "react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

import { palette, useGpuImage } from "./Graphite";

// How <Canvas> produces its frames: the scene is recorded once on the JS
// thread; the Reanimated UI runtime only reads the shared values into it; the
// native render thread pool replays it into a Graphite frame, at most once per
// vsync; the view presents it. The GPU image is made on the JS thread and
// drawn by a pool thread: textures are shared across the recorders of the
// Graphite context.

const COUNT = 12;

interface DotProps {
  index: number;
  t: SharedValue<number>;
  size: SharedValue<SkSize>;
}

const Dot = ({ index, t, size }: DotProps) => {
  const angle = (index * Math.PI * 2) / COUNT;
  const cx = useDerivedValue(() => {
    const { width, height } = size.value;
    return (
      width / 2 + Math.cos(t.value + angle) * Math.min(width, height) * 0.36
    );
  });
  const cy = useDerivedValue(() => {
    const { width, height } = size.value;
    return (
      height / 2 + Math.sin(t.value + angle) * Math.min(width, height) * 0.36
    );
  });
  const r = useDerivedValue(() => 10 + 6 * Math.sin(t.value * 3 + index));
  return (
    <Circle cx={cx} cy={cy} r={r} color={palette[index % palette.length]} />
  );
};

interface AnimatedCanvasProps {
  image: SkImage | null;
  onSnapshot: (uri: string) => void;
}

const AnimatedCanvas = ({ image, onSnapshot }: AnimatedCanvasProps) => {
  const ref = useCanvasRef();
  // The ref API is the same as Canvas: the snapshot replays the scene with
  // the latest values on the calling thread, it does not wait for a frame.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const snapshot = ref.current?.makeImageSnapshot();
      if (snapshot) {
        onSnapshot(`data:image/png;base64,${snapshot.encodeToBase64()}`);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [ref, onSnapshot]);
  const t = useSharedValue(0);
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  useFrameCallback((frame) => {
    t.value = frame.timestamp / 1000;
  });
  const origin = useDerivedValue(() =>
    vec(size.value.width / 2, size.value.height / 2)
  );
  const transform = useDerivedValue(() => [{ rotate: t.value * 0.35 }]);
  const imageSize = useDerivedValue(
    () => Math.min(size.value.width, size.value.height) * 0.4
  );
  const imageX = useDerivedValue(
    () => size.value.width / 2 - imageSize.value / 2
  );
  const imageY = useDerivedValue(
    () => size.value.height / 2 - imageSize.value / 2
  );
  return (
    <Canvas ref={ref} style={styles.canvas} opaque onSize={size}>
      <Fill color="#0b1020" />
      {image && (
        <Group transform={transform} origin={origin}>
          <Image
            image={image}
            x={imageX}
            y={imageY}
            width={imageSize}
            height={imageSize}
            fit="contain"
          />
        </Group>
      )}
      {Array.from({ length: COUNT }, (_, index) => (
        <Dot key={index} index={index} t={t} size={size} />
      ))}
    </Canvas>
  );
};

// No shared value: the recorder is replayed once and the view keeps the frame.
const StaticCanvas = () => (
  <Canvas style={styles.canvas}>
    <Fill color="#0b1020" />
    <Rect x={16} y={16} width={360} height={120}>
      <LinearGradient
        start={vec(16, 16)}
        end={vec(376, 136)}
        colors={["#5f27cd", "#48dbfb", "#1dd1a1"]}
      />
    </Rect>
    <RoundedRect x={32} y={32} width={88} height={88} r={16} color="#0b1020" />
    {palette.map((color, index) => (
      <Circle key={color} cx={160 + index * 28} cy={76} r={12} color={color} />
    ))}
  </Canvas>
);

export const GraphiteCanvasExample = () => {
  const image = useGpuImage();
  const [snapshot, setSnapshot] = useState<string | null>(null);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Canvas, animated with Reanimated: replayed on the render thread pool
      </Text>
      <AnimatedCanvas image={image} onSnapshot={setSnapshot} />
      <Text style={styles.label}>Canvas, static scene</Text>
      <StaticCanvas />
      <Text style={styles.label}>
        makeImageSnapshot() of the animated canvas
      </Text>
      <View style={styles.snapshot}>
        {snapshot && (
          <RNImage source={{ uri: snapshot }} style={styles.snapshotImage} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  canvas: { flex: 1 },
  snapshot: { flex: 1, alignItems: "center" },
  snapshotImage: { width: 160, height: 160 },
  label: {
    color: "#86868b",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
