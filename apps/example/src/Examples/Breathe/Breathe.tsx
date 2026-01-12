import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { SkPath } from "@shopify/react-native-skia";
import {
  BlurMask,
  vec,
  Canvas,
  Circle,
  Fill,
  Group,
  polar2Canvas,
  mix,
  Skia,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

import { useLoop } from "../../components/Animations";

const c1 = "#61bea2";
const c2 = "#529ca0";

const hostPath1 = Skia.Path.Make();

console.log("=== Host Object (Skia.Path.Make) ===");
console.log("prototype:", hostPath1.__proto__);
console.log("constructor:", hostPath1.constructor);

console.log('"moveTo" in hostPath:', "moveTo" in hostPath1);
console.log('"fakeMethod" in hostPath:', "fakeMethod" in hostPath1);

const newPath1 = Skia.Path2.Make() as SkPath;
const newPath2 = Skia.Path2.Make() as SkPath;
const SkiaPath = newPath1.constructor;

console.log("\n=== New API (Skia.Path2.Make) ===");
console.log("prototype:", newPath1.__proto__);
console.log("constructor:", newPath1.constructor);
console.log("same constructor:", newPath1.constructor === newPath2.constructor);

// "in" operator works correctly
console.log('"moveTo" in newPath:', "moveTo" in newPath1);
console.log('"fakeMethod" in newPath:', "fakeMethod" in newPath1);

// instanceof works as expected
console.log("instanceof check:", newPath1 instanceof SkiaPath);

interface RingProps {
  index: number;
  progress: SharedValue<number>;
  total: number;
}

const Ring = ({ index, progress, total }: RingProps) => {
  const { width, height } = useWindowDimensions();
  const R = width / 4;
  const center = useMemo(
    () => vec(width / 2, height / 2 - 64),
    [height, width]
  );

  const transform = useDerivedValue(() => {
    const theta = (index * (2 * Math.PI)) / total;
    const { x, y } = polar2Canvas(
      { theta, radius: progress.value * R },
      { x: 0, y: 0 }
    );
    const scale = mix(progress.value, 0.3, 1);
    return [{ translateX: x }, { translateY: y }, { scale }];
  });

  return (
    <Circle
      c={center}
      r={R}
      color={index % 2 ? c1 : c2}
      origin={center}
      transform={transform}
    />
  );
};

export const Breathe = () => {
  const { width, height } = useWindowDimensions();
  const center = useMemo(
    () => vec(width / 2, height / 2 - 64),
    [height, width]
  );

  const progress = useLoop({ duration: 3000 });

  const transform = useDerivedValue(() => [
    { rotate: mix(progress.value, -Math.PI, 0) },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={styles.container} testID="breathe-canvas">
        <Fill color="rgb(36,43,56)" />
        <Group origin={center} transform={transform} blendMode="screen">
          <BlurMask style="solid" blur={40} />
          {new Array(6).fill(0).map((_, index) => {
            return (
              <Ring key={index} index={index} progress={progress} total={6} />
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
