import React from "react";
import { Text } from "react-native";
import { Canvas, Fill, useCanvasSize } from "react-native-skia";

export const OnLayoutDemo = () => {
  const { size, onLayout } = useCanvasSize();
  return (
    <>
      <Text>{`OnLayout: ${size?.width} / ${size?.height}`}</Text>
      <Canvas style={{ flex: 1 }} onLayout={onLayout}>
        <Fill color="red" />
      </Canvas>
    </>
  );
};
