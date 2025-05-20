import { Canvas, Image, useImage } from "@shopify/react-native-skia";
import React from "react";
import { Dimensions, View } from "react-native";

const dims = Dimensions.get("window");
const size = dims.width / 2;
export const P3 = () => {
  const yellowFlower = useImage(require("../../assets/p3/YellowFlower-P3.jpg"));
  const italy = useImage(require("../../assets/p3/Italy-P3.jpg"));
  const iceland = useImage(require("../../assets/p3/Iceland-P3.jpg"));
  return (
    <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
      <Canvas style={{ width: size, height: size }}>
        <Image
          image={yellowFlower}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Canvas>
      <Canvas style={{ width: size, height: size }} colorSpace="p3">
        <Image
          image={yellowFlower}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Canvas>
      <Canvas style={{ width: size, height: size }}>
        <Image
          image={italy}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Canvas>
      <Canvas style={{ width: size, height: size }} colorSpace="p3">
        <Image
          image={italy}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Canvas>
      <Canvas style={{ width: size, height: size }}>
        <Image
          image={iceland}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Canvas>
      <Canvas style={{ width: size, height: size }} colorSpace="p3">
        <Image
          image={iceland}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Canvas>
    </View>
  );
};
