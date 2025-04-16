import React from "react";
import {
  Box,
  BoxShadow,
  Canvas,
  Fill,
  rect,
  rrect,
} from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

export const Boxes = () => {
  const innerShadowSize = useSharedValue({ width: 100, height: 100 });
  const innerShadowRect = useDerivedValue(() =>
    rect(0, 0, innerShadowSize.value.width, innerShadowSize.value.height)
  );
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Fill color="#add8e6" />
      <Box box={rrect(innerShadowRect.value, 24, 24)} color="#add8e6">
        <BoxShadow dx={10} dy={10} blur={10} color="#93b8c4" inner />
        <BoxShadow dx={-10} dy={-10} blur={10} color="#c7f8ff" inner />
        <BoxShadow dx={10} dy={10} blur={10} color="#93b8c4" />
        <BoxShadow dx={-10} dy={-10} blur={10} color="#c7f8ff" />
      </Box>
    </Canvas>
  );
};
