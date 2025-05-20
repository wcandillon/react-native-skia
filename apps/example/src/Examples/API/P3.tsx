import {
  Canvas,
  Fill,
  Image,
  LinearGradient,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions, ScrollView, View } from "react-native";

const dims = Dimensions.get("window");
const size = dims.width / 2;
export const P3 = () => {
  const yellowFlower = useImage(require("../../assets/p3/YellowFlower-P3.jpg"));
  const italy = useImage(require("../../assets/p3/Italy-P3.jpg"));
  const iceland = useImage(require("../../assets/p3/Iceland-P3.jpg"));
  return (
    <ScrollView>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        <Canvas style={{ width: size, height: size }}>
          <Fill>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, 0)}
              colors={["rgb(0, 255, 255)", "rgb(255, 0, 255)"]}
            />
          </Fill>
        </Canvas>
        <Canvas style={{ width: size, height: size }} colorSpace="p3">
          <Fill>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, 0)}
              colors={["color(display-p3 0 1 1)", "color(display-p3 1 0 1)"]}
            />
          </Fill>
        </Canvas>
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
        <Canvas style={{ width: size, height: size }}>
          <Fill color="rgb(0, 255, 0)" />
        </Canvas>
        <Canvas style={{ width: size, height: size }} colorSpace="p3">
          <Fill color="color(display-p3 0 1 0)" />
        </Canvas>
      </View>
    </ScrollView>
  );
};
