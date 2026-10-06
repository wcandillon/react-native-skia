import React from "react";
import { Text } from "react-native";
import { Canvas, Fill, useCanvasSize } from "react-native-skia";

export const OnLayoutDemo = () => {
  const { ref, size } = useCanvasSize();
  return (
    <>
      <Text>{`OnLayout: ${size?.width} / ${size?.height}`}</Text>
      <Canvas style={{ flex: 1 }} ref={ref}>
        <Fill color="red" />
      </Canvas>
    </>
  );
};
