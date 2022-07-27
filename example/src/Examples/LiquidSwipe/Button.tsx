import React from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Dimensions } from "react-native";

import { Side } from "./Wave";
import { SkiaValue } from "@shopify/react-native-skia";

const { width } = Dimensions.get("screen");
const RADIUS = 25;

interface ButtonProps {
  position: { x: SkiaValue<number>, y: SkiaValue<number> };
  side: Side;
  activeSide: SkiaValue<Side>;
}

export const Button = ({ position, side, activeSide }: ButtonProps) => {
  return null;
  // const isLeft = side === Side.LEFT;
  // const style = useAnimatedStyle(() => ({
  //   position: "absolute",
  //   left: isLeft ? position.x.value - RADIUS * 2 : width - position.x.value,
  //   top: position.y.value - RADIUS,
  //   borderRadius: RADIUS,
  //   width: RADIUS * 2,
  //   height: RADIUS * 2,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   opacity: withTiming(activeSide.value === Side.NONE ? 1 : 0),
  // }));
  // return (
  //   <Animated.View style={style}>
  //     <Icon
  //       name={`chevron-${isLeft ? "right" : "left"}` as const}
  //       size={24}
  //       color="white"
  //     />
  //   </Animated.View>
  // );
};

