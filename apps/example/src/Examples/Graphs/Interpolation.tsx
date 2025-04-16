import type {
  AnimatedProps,
  PathProps,
  SkPath,
} from "@shopify/react-native-skia";
import {
  interpolatePaths,
  Canvas,
  Fill,
  Path,
} from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { createGraphPath } from "./createGraphPath";
import type { GraphProps } from "./types";

export const Interpolation: React.FC<GraphProps> = ({ height, width }) => {
  const [currentPath, setCurrentPath] = useState(() =>
    createGraphPath(width, height, 60)
  );

  useEffect(() => {
    const h = setInterval(() => {
      setCurrentPath(createGraphPath(width, height, 60));
    }, 1000);
    setCurrentPath(createGraphPath(width, height, 60));
    return () => {
      clearTimeout(h);
    };
  }, [height, width]);

  return (
    <View style={{ height, marginBottom: 10 }}>
      <Canvas style={styles.graph}>
        <Fill color="black" />
        <TransitioningPath
          path={currentPath}
          strokeWidth={4}
          style="stroke"
          strokeJoin="round"
          strokeCap="round"
          color="#cccc66"
          start={0}
          end={1}
        />
      </Canvas>
      <Text>Transitions between graphs</Text>
    </View>
  );
};

const TransitioningPath = ({
  path,
  start = 0,
  end = 1,
  ...props
}: AnimatedProps<PathProps> & {
  path: SkPath;
}) => {
  // Save current and next paths (initially the same)
  const currentPathRef = useSharedValue(path);
  const nextPathRef = useSharedValue(path);

  // Progress value drives the animation
  const progress = useSharedValue(0);

  // The animated path is derived from the current and next paths based
  // on the value of the progress.
  const animatedPath = useDerivedValue(
    () =>
      interpolatePaths(
        progress.value,
        [0, 1],
        [currentPathRef.value, nextPathRef.value]
      ),
    [progress, path]
  );

  useEffect(() => {
    // Ensure paths are interpolatable
    // There are libraries to help you make paths interpolatable.
    // For instance: https://github.com/notoriousb1t/polymorph
    if (!path.isInterpolatable(currentPathRef.value)) {
      console.warn("Paths must have the same length. Skipping interpolation.");
      return;
    }
    // Set current path to the current interpolated path to make
    // sure we can interrupt animations
    currentPathRef.value = animatedPath.value;
    // Set the next path to be the value in the updated path property
    nextPathRef.value = path;
    // reset progress - this will cause the derived value to be updated and
    // the path to be repainted through its parent canvas.
    progress.value = 0;
    // Run animation
    progress.value = withTiming(1, {
      duration: 750,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [animatedPath.value, currentPathRef, nextPathRef, path, progress]);

  return <Path {...props} path={animatedPath} />;
};

const styles = StyleSheet.create({
  graph: {
    flex: 1,
  },
});
