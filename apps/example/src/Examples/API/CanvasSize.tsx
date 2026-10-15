import { Canvas, Rect, rect } from "react-native-skia";
import React from "react";
import { View, StyleSheet } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

// The canvas size on the UI thread: onLayout writes the layout into a shared
// value and the values derived from it follow every resize. Type into the
// input to resize the canvas.
export const CanvasSize = () => {
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
      <Canvas
        style={StyleSheet.absoluteFill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          size.value = { width, height };
        }}
      >
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
