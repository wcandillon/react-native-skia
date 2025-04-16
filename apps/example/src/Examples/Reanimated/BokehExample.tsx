import { Dimensions, StyleSheet } from "react-native";
import React from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Canvas, Circle, Fill } from "@shopify/react-native-skia";

import { AnimationDemo } from "./Components";

const { width } = Dimensions.get("window");
const ExampleHeight = 300;

function getRandomWidth() {
  return Math.random() * width;
}

function getRandomHeight() {
  return Math.random() * ExampleHeight;
}

function getRandomHue() {
  return 100 + Math.random() * 100;
}

function getRandomPositionDiff() {
  return -100 + Math.random() * 200;
}

function getRandomHueDiff() {
  return Math.random() * 100;
}

function MovingCircle() {
  const x = useSharedValue(getRandomWidth());
  const y = useSharedValue(getRandomHeight());
  const hue = useSharedValue(getRandomHue());

  const duration = 2000 + Math.random() * 1000;
  const power = Math.random();
  const config = { duration, easing: Easing.linear };
  const size = 50 + power * ExampleHeight * 0.3;

  const update = () => {
    x.value = withTiming(x.value + getRandomPositionDiff(), config);
    y.value = withTiming(y.value + getRandomPositionDiff(), config);
    hue.value = withTiming(hue.value + getRandomHueDiff(), config);
  };

  React.useEffect(() => {
    update();
    const id = setInterval(update, duration);
    return () => clearInterval(id);
  });

  const color = useDerivedValue(() => {
    return `hsl(${hue.value}, 100%, 50%)`;
  });

  return (
    <Circle
      cx={x}
      cy={y}
      r={size}
      color={color}
      opacity={0.1 + (1 - power) * 0.1}
    />
  );
}

interface BokehProps {
  count: number;
}

function Bokeh({ count }: BokehProps) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <MovingCircle key={i} />
      ))}
    </>
  );
}

export function BokehExample() {
  return (
    <AnimationDemo title={"Reanimated's bokeh"}>
      <Canvas style={styles.canvas}>
        <Fill color="black" />
        <Bokeh count={100} />
      </Canvas>
    </AnimationDemo>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: ExampleHeight,
    width: "100%" as const,
    backgroundColor: "black" as const,
  },
});
