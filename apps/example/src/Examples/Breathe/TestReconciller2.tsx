import React, { useCallback, useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
// import { vec, mix, Paint } from "@shopify/react-native-skia";
// import type { SharedValue } from "react-native-reanimated";
import {
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

const c1 = "#61bea2";
const c2 = "#529ca0";

// Commented out Ring component - not used with regular View implementation
// interface RingProps {
//   index: number;
//   progress: SharedValue<number>;
//   total: number;
//   frameNumber: number; // Add frame tracking
// }

// const Ring = ({ index, progress, total, frameNumber }: RingProps) => {
//   const { width, height } = useWindowDimensions();
//   const R = width / 4;
//   const center = useMemo(
//     () => vec(width / 2, height / 2 - 64),
//     [height, width]
//   );

//   const theta = (index * (2 * Math.PI)) / total;
//   const transform = useDerivedValue(() => {
//     const { x, y } = polar2Canvas(
//       { theta, radius: progress.value * R },
//       { x: 0, y: 0 }
//     );
//     const scale = mix(progress.value, 0.3, 1);
//     return [{ translateX: x }, { translateY: y }, { scale }];
//   });

//   // Visual indicator: Use opacity based on frame number to detect ordering issues
//   const opacity = 0.5 + (frameNumber % 2) * 0.5;

//   return (
//     <Circle
//       c={center}
//       r={R}
//       color={index % 2 ? c1 : c2}
//       origin={center}
//       transform={transform}
//       opacity={opacity}
//     />
//   );
// };

export const Breathe = () => {
  const [rings, setRings] = useState(6);
  const [frameCounter, setFrameCounter] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { width, height } = useWindowDimensions();
  // const center = useMemo(
  //   () => vec(width / 2, height / 2 - 64),
  //   [height, width]
  // );

  // Shared values for gesture and animation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureScale = useSharedValue(1);
  const animationProgress = useSharedValue(0);

  // Extracted function to handle frame counter and ring updates
  const updateFrameAndRings = () => {
    setFrameCounter((prev) => prev + 1);
    // Randomly add/remove elements to cause redraws
    if (Math.random() > 0.7) {
      setRings((r) =>
        Math.max(3, Math.min(12, r + (Math.random() > 0.5 ? 1 : -1)))
      );
    }
  };

  // Create frequent state updates during animation to stress the system
  useAnimatedReaction(
    () => animationProgress.value,
    (current) => {
      // Trigger JS thread updates while animation is running
      if (current > 0 && current < 1) {
        runOnJS(updateFrameAndRings)();
      }
    }
  );

  // Extracted function for incrementing frame counter
  const incrementFrameCounter = () => {
    setFrameCounter((prev) => prev + 1);
  };

  const isAnimatingFn = (animating: boolean) => {
    setIsAnimating(animating);
  };

  const isAnimatingFnJS = () => {
    setTimeout(() => setIsAnimating(false), 2000);
  };

  // Pan gesture with state updates
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      // Trigger state updates during gesture (JS thread)
      if (Math.abs(e.translationX) > 10 || Math.abs(e.translationY) > 10) {
        runOnJS(incrementFrameCounter)();
      }
    })
    .onEnd(() => {
      // This is where the bug typically manifests
      // Animation on UI thread + state updates on JS thread
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);

      // Start progress animation
      animationProgress.value = withTiming(1, { duration: 2000 }, () => {
        animationProgress.value = 0;
      });

      // Simultaneous state updates
      runOnJS(isAnimatingFn)(true);
      runOnJS(isAnimatingFnJS)();
    });

  // Pinch gesture with continuous updates
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      gestureScale.value = e.scale;
      // Force state updates during pinch
      runOnJS(incrementFrameCounter)();
    })
    .onEnd(() => {
      gestureScale.value = withTiming(1);
      // Trigger rapid state changes
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          setRings((r) =>
            Math.max(3, Math.min(12, r + (Math.random() > 0.5 ? 1 : -1)))
          );
        }, i * 100);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Commented out - not needed for regular View implementation
  // const groupTransform = useDerivedValue(() => [
  //   { translateX: translateX.value },
  //   { translateY: translateY.value },
  //   { scale: gestureScale.value },
  //   { rotate: mix(animationProgress.value, 0, Math.PI * 2) },
  // ]);

  const add = useCallback(() => {
    setRings((r) => Math.min(12, r + 1));
    setFrameCounter((prev) => prev + 1);
  }, []);

  const remove = useCallback(() => {
    setRings((r) => Math.max(1, r - 1));
    setFrameCounter((prev) => prev + 1);
  }, []);

  const triggerBug = useCallback(() => {
    // Simulate the exact conditions that trigger the bug
    // Start animation on UI thread
    animationProgress.value = withTiming(1, { duration: 3000 }, () => {
      animationProgress.value = 0;
    });

    // Simultaneously trigger multiple state updates from JS thread
    const interval = setInterval(() => {
      setRings((r) => {
        const newValue = Math.max(
          3,
          Math.min(12, r + (Math.random() > 0.5 ? 2 : -2))
        );
        return newValue;
      });
      setFrameCounter((prev) => prev + 1);
    }, 50);

    setTimeout(() => clearInterval(interval), 3000);
  }, [animationProgress]);

  // Commented out - not needed for regular View implementation
  // const frameIndicatorColor = useDerivedValue(() => {
  //   // This should smoothly transition, but will flicker if frames are out of order
  //   const r = Math.sin(animationProgress.value * Math.PI * 2) * 127 + 128;
  //   const g = Math.cos(animationProgress.value * Math.PI * 2) * 127 + 128;
  //   return `rgb(${r}, ${g}, 100)`;
  // });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={styles.controls}>
          <Button onPress={add} title="Add Ring" />
          <Button onPress={remove} title="Remove Ring" />
          <Button onPress={triggerBug} title="Trigger Bug" color="red" />
          <Text>
            Rings: {rings} | Frame: {frameCounter}
          </Text>
          <Text style={{ fontSize: 10 }}>
            {isAnimating
              ? "⚠️ Animating - Watch for flickers!"
              : "Drag or pinch canvas"}
          </Text>
        </View>

        <GestureDetector gesture={composedGesture}>
          <View
            style={[styles.container, { backgroundColor: "rgb(36,43,56)" }]}
          >
            {/* Frame order indicator - using regular View */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                backgroundColor: `rgb(${Math.floor(Math.sin(frameCounter * 0.1) * 127 + 128)}, ${Math.floor(Math.cos(frameCounter * 0.1) * 127 + 128)}, 100)`,
              }}
            />

            {/* Render rings as regular Views */}
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {new Array(rings).fill(0).map((_, index) => {
                const theta = (index * (2 * Math.PI)) / rings;
                const opacity = 0.5 + (frameCounter % 2) * 0.5;
                return (
                  <View
                    key={index}
                    style={{
                      position: "absolute",
                      width: width / 2,
                      height: width / 2,
                      borderRadius: width / 4,
                      backgroundColor: index % 2 ? c1 : c2,
                      opacity: opacity,
                      transform: [
                        { translateX: Math.cos(theta) * 50 },
                        { translateY: Math.sin(theta) * 50 },
                      ],
                    }}
                  />
                );
              })}
            </View>

            {/* Debug indicator - using regular View */}
            <View
              style={{
                position: "absolute",
                top: 20,
                left: 20,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "white",
                opacity: 0.3 + Math.abs(Math.sin(frameCounter * 0.05)) * 0.7,
              }}
            />

            {/* Status text overlay */}
            <View
              style={{ position: "absolute", bottom: 20, alignSelf: "center" }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>
                Frame: {frameCounter} | Rings: {rings}
              </Text>
            </View>
          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
});
