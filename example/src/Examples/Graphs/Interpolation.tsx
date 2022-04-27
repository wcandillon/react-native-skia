import type {
  AnimatedProps,
  PathProps,
  SkPath,
} from "@shopify/react-native-skia";
import {
  Easing,
  Canvas,
  Fill,
  Path,
  runTiming,
  useDerivedValue,
  useValue,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { createGraphPath } from "./createGraphPath";
import type { GraphProps } from "./types";

export const Interpolation: React.FC<GraphProps> = ({ height, width }) => {
  const [currentPath, setCurrentPath] = useState<SkPath>(() =>
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
        />
      </Canvas>
      <Text>Transitions between graphs</Text>
    </View>
  );
};

const TransitioningPath = ({
  path,
  ...props
}: AnimatedProps<PathProps> & { path: SkPath }) => {
  // Save current and next paths (initially the same)
  const currentPathRef = useRef(path);
  const nextPathRef = useRef(path);

  // Progress value drives the animation
  const progress = useValue(0);

  // The animated path is derived from the current and next paths based
  // on the value of the progress.
  const animatedPath = useDerivedValue(
    () =>
      nextPathRef.current.interpolate(currentPathRef.current, progress.current),
    [progress, path]
  );

  useEffect(() => {
    // Ensure paths are interpolatable
    // There are libraries to help you make paths interpolatable.
    // For instance: https://github.com/notoriousb1t/polymorph
    if (!path.isInterpolatable(currentPathRef.current)) {
      console.warn("Paths must have the same length. Skipping interpolation.");
      return;
    }
    // Set current path to the current interpolated path to make
    // sure we can interrupt animations
    currentPathRef.current = animatedPath.current;
    // Set the next path to be the value in the updated path property
    nextPathRef.current = path;
    // reset progress - this will cause the derived value to be updated and
    // the path to be repainted through its parent canvas.
    progress.current = 0;
    // Run animation
    runTiming(progress, 1, {
      duration: 750,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [animatedPath, path, progress]);

  return <Path {...props} path={animatedPath} />;
};

TransitioningPath.defaultProps = {
  start: 0,
  end: 1,
};

const styles = StyleSheet.create({
  graph: {
    flex: 1,
  },
});
