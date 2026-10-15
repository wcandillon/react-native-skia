import { Canvas, Rect, rect, useCanvasSize } from "react-native-skia";
import React, { useEffect } from "react";
import { Button, View, StyleSheet } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const SizedCanvas = () => {
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
      <Canvas onSize={size} style={StyleSheet.absoluteFill}>
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

const HookSizedCanvas = () => {
  const { ref, size } = useCanvasSize();
  console.log("useCanvasSize " + size.width + "x" + size.height);
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: "cyan" }}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={size.width} height={size.height} color="red" />
      </Canvas>
      <TextInput
        placeholder={`
useCanvasSize
 `}
        multiline
      />
    </View>
  );
};

const blockJSThread = (milliseconds: number) => {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    // the JS thread does nothing else meanwhile
  }
};

// The box is resized on the UI thread, and onSize follows it there: the red
// rect keeps filling it while the JS thread is blocked.
const AnimatedSizeCanvas = () => {
  const size = useSharedValue({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
  }, [progress]);
  const boxStyle = useAnimatedStyle(() => ({
    width: 100 + progress.value * 150,
  }));
  const redRect = useDerivedValue(() =>
    rect(0, 0, size.value.width, size.value.height)
  );
  return (
    <View>
      <Animated.View style={[styles.animatedBox, boxStyle]}>
        <Canvas onSize={size} style={StyleSheet.absoluteFill}>
          <Rect rect={redRect} color="red" />
        </Canvas>
      </Animated.View>
      <Button
        title="Block the JS thread for 3s"
        onPress={() => blockJSThread(3000)}
      />
    </View>
  );
};

export const OnSize = () => {
  return (
    <View>
      <SizedCanvas />
      {/* A scaled ancestor must not change the size onSize or useCanvasSize report (#3836) */}
      <View style={{ transform: [{ scale: 0.5 }] }}>
        <SizedCanvas />
        <HookSizedCanvas />
      </View>
      <AnimatedSizeCanvas />
    </View>
  );
};

const styles = StyleSheet.create({
  animatedBox: {
    height: 60,
    backgroundColor: "cyan",
  },
});
