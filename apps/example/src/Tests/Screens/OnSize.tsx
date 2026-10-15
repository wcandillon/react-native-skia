import React, { useState } from "react";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { SkSize } from "react-native-skia";
import { Canvas, Fill, Rect, rect, useCanvasSize } from "react-native-skia";

const CELL = 60;

const useSizeValue = () => useSharedValue<SkSize>({ width: 0, height: 0 });

// Cyan wherever the red rect, as large as onSize, does not reach.
const SizedCanvas = ({ onSize }: { onSize: SharedValue<SkSize> }) => {
  const sizeRect = useDerivedValue(() =>
    rect(0, 0, onSize.value.width, onSize.value.height)
  );
  return (
    <Canvas onSize={onSize} style={{ flex: 1 }}>
      <Fill color="cyan" />
      <Rect rect={sizeRect} color="red" />
    </Canvas>
  );
};

// A scaled ancestor does not change the size the canvas is laid out at.
const ScaledCanvas = () => {
  const size = useSizeValue();
  return (
    <View
      style={{
        width: CELL * 2,
        height: CELL * 2,
        transform: [{ scale: 0.5 }],
      }}
    >
      <SizedCanvas onSize={size} />
    </View>
  );
};

// The second shared value is handed over once the view has its size, so the
// view sends nothing new: only the size read when it starts listening fills it.
const HandedOverCanvas = () => {
  const first = useSizeValue();
  const second = useSizeValue();
  const [handedOver, setHandedOver] = useState(false);
  useAnimatedReaction(
    () => first.value.width > 0,
    (laidOut) => {
      if (laidOut) {
        scheduleOnRN(setHandedOver, true);
      }
    }
  );
  return (
    <View style={{ width: CELL, height: CELL }}>
      <SizedCanvas onSize={handedOver ? second : first} />
    </View>
  );
};

const HookSizedCanvas = () => {
  const { ref, size } = useCanvasSize();
  return (
    <View style={{ width: CELL, height: CELL }}>
      <Canvas ref={ref} style={{ flex: 1 }}>
        <Fill color="cyan" />
        <Rect x={0} y={0} width={size.width} height={size.height} color="red" />
      </Canvas>
    </View>
  );
};

export const OnSize = () => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <ScaledCanvas />
    <HandedOverCanvas />
    <HookSizedCanvas />
  </View>
);

// Green once onSize follows its canvas to an empty width, magenta until then.
export const OnSizeEmpty = () => {
  const size = useSharedValue<SkSize>({ width: -1, height: -1 });
  const [collapsed, setCollapsed] = useState(false);
  useAnimatedReaction(
    () => size.value.width > 0,
    (laidOut) => {
      if (laidOut) {
        scheduleOnRN(setCollapsed, true);
      }
    }
  );
  const color = useDerivedValue(() =>
    collapsed && size.value.width === 0 ? "green" : "magenta"
  );
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ width: collapsed ? 0 : CELL, height: CELL }}>
        <Canvas onSize={size} style={{ flex: 1 }} />
      </View>
      <Canvas style={{ width: CELL, height: CELL }}>
        <Fill color={color} />
      </Canvas>
    </View>
  );
};
