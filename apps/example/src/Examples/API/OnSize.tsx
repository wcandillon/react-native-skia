import { Canvas, Rect, rect, useCanvasSize } from "react-native-skia";
import React from "react";
import { View, StyleSheet } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

const SizedCanvas = () => {
  const size = useSharedValue({ width: 0, height: 0 });
  const redRect = useDerivedValue(() => {
    console.log(
      "new size " +
        size.value.width +
        "x" +
        size.value.height +
        " @ " +
        new Date()
    );
    return rect(0, 0, size.value.width, size.value.height);
  });

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: "cyan",
      }}
    >
      <Canvas onSize={size} style={StyleSheet.absoluteFill}>
        <Rect rect={redRect} color="red" />
      </Canvas>
      <TextInput
        placeholder={`
Hello
World!
 `}
        multiline
      />
    </View>
  );
};

const HookSizedCanvas = () => {
  const { ref, size } = useCanvasSize();
  console.log("useCanvasSize " + size.width + "x" + size.height);
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: "cyan" }}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={size.width} height={size.height} color="red" />
      </Canvas>
      <TextInput
        placeholder={`
useCanvasSize
 `}
        multiline
      />
    </View>
  );
};

export const OnSize = () => {
  return (
    <View>
      <SizedCanvas />
      {/* A scaled ancestor must not change the size onSize or useCanvasSize report (#3836) */}
      <View style={{ transform: [{ scale: 0.5 }] }}>
        <SizedCanvas />
        <HookSizedCanvas />
      </View>
    </View>
  );
};
