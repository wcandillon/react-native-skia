import { Canvas, RoundedRect } from "@shopify/react-native-skia";
import React from "react";
import { View } from "react-native";

export const Snapshot4 = () => {
  return (
    <View style={{ flex: 1, opacity: 0 }}>
      <Canvas style={{ width: 100, height: 100 }}>
        <RoundedRect x={0} y={20} width={80} height={80} r={10} color="blue" />
      </Canvas>
    </View>
  );
};
