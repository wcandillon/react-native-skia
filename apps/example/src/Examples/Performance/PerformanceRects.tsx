import { Canvas, Rect, Skia, Group } from "@shopify/react-native-skia";
import type { SkRect } from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  Button,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

const Size = 25;
const Increaser = 50;

export const PerformanceDrawingTest: React.FC = () => {
  const [numberOfBoxes, setNumberOfBoxes] = useState(150);

  const { width, height } = useWindowDimensions();

  const SizeWidth = Size;
  const SizeHeight = Size * 0.45;

  const pos = useSharedValue({
    x: width / 2,
    y: height * 0.25,
  });

  const rects = useMemo(
    () =>
      new Array(numberOfBoxes)
        .fill(0)
        .map((_, i) =>
          Skia.XYWHRect(
            5 + ((i * Size) % width),
            25 + Math.floor(i / (width / Size)) * Size,
            SizeWidth,
            SizeHeight
          )
        ),
    [numberOfBoxes, width, SizeWidth, SizeHeight]
  );

  const gesture = Gesture.Pan().onChange((e) => (pos.value = e));

  return (
    <View style={styles.container}>
      <View style={styles.mode}>
        <View style={styles.panel}>
          <Button
            title="⬇️"
            onPress={() => setNumberOfBoxes((n) => Math.max(0, n - Increaser))}
          />
          <Text>&nbsp;Size&nbsp;</Text>
          <Text>{numberOfBoxes}</Text>
          <Text>&nbsp;</Text>
          <Button
            title="⬆️"
            onPress={() => setNumberOfBoxes((n) => n + Increaser)}
          />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <GestureDetector gesture={gesture}>
          <Canvas style={styles.container}>
            {rects.map((_, i) => (
              <Rct pos={pos} key={i} rct={rects[i]} />
            ))}
          </Canvas>
        </GestureDetector>
      </View>
    </View>
  );
};

interface RctProps {
  pos: SharedValue<{ x: number; y: number }>;
  rct: SkRect;
}

const Rct = ({ pos, rct }: RctProps) => {
  const transform = useDerivedValue(() => {
    const p1 = { x: rct.x, y: rct.y };
    const p2 = pos.value;
    const r = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    return [{ rotate: r }];
  });
  return (
    <Group transform={transform} origin={rct}>
      <Rect rect={rct} color="#00ff00" />
      <Rect rect={rct} color="#4060A3" style="stroke" strokeWidth={2} />
    </Group>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mode: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panel: {
    flexDirection: "row",
    alignItems: "center",
  },
});
