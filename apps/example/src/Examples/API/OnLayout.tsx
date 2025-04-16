import React, { useState } from "react";
import type { LayoutRectangle } from "react-native";
import { Text } from "react-native";
import { Canvas, Fill } from "@shopify/react-native-skia";

export const OnLayoutDemo = () => {
  const [layout, setLayout] = useState<LayoutRectangle>();
  return (
    <>
      <Text>{`OnLayout: ${layout?.width} / ${layout?.height}`}</Text>
      <Canvas
        style={{ flex: 1 }}
        onLayout={(evt) => setLayout(evt.nativeEvent.layout)}
      >
        <Fill color="red" />
      </Canvas>
    </>
  );
};
