import React, { useState, useRef, useEffect } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { Canvas, Fill } from "react-native-skia";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
} from "react-native-reanimated";

/**
 * This stress test attempts to reproduce a race condition crash in RNSkPictureView.
 *
 * The crash occurs when:
 * 1. A Canvas with animations is rapidly mounted/unmounted
 * 2. The render thread may still be drawing while the view is being torn down
 * 3. _picture could become invalid between the null check and drawPicture() call
 *
 * The crash manifests as:
 *   null pointer dereference: SIGSEGV
 *   at SkRecord::Record::visit (SkRecordDraw)
 *
 * This test rapidly mounts/unmounts animated Canvas components to maximize
 * the chance of hitting this race condition.
 */

const AnimatedCanvas = () => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 16 }), -1, true);
  }, [progress]);

  const color = useDerivedValue(() => {
    const r = Math.floor(progress.value * 255);
    const g = Math.floor((1 - progress.value) * 255);
    const b = Math.floor(Math.abs(0.5 - progress.value) * 2 * 255);
    return `rgb(${r}, ${g}, ${b})`;
  });

  return (
    <Canvas style={styles.smallCanvas}>
      <Fill color={color} />
    </Canvas>
  );
};

export const PictureViewCrashTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(0);
  const [canvasCount, setCanvasCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTest = () => {
    if (isRunning) return;
    setIsRunning(true);
    setIterations(0);
    keyRef.current = 0;

    // Rapidly mount/unmount animated Canvas components
    // This creates a race between:
    // - The animation mapper setting pictures on the UI thread
    // - The view unregistering and potentially clearing state
    // - The render thread drawing the picture
    intervalRef.current = setInterval(() => {
      keyRef.current += 1;
      // Toggle between 0 and 5 canvases to force mount/unmount cycles
      setCanvasCount((prev) => (prev > 0 ? 0 : 5));
      setIterations((prev) => prev + 1);
    }, 50); // 50ms gives enough time for animations to start before unmounting
  };

  const stopTest = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCanvasCount(0);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.title}>PictureView Race Condition Test</Text>
        <Text style={styles.description}>
          This test rapidly mounts and unmounts animated Canvas components to
          reproduce the race condition crash where the render thread tries to
          draw a picture that has been cleared during unmount.
        </Text>
        <Text style={styles.iterations}>
          Mount/Unmount cycles: {iterations}
        </Text>
        <Text style={styles.canvasCount}>Active canvases: {canvasCount}</Text>
        {isRunning && (
          <Text style={styles.warning}>
            Running... If the app crashes, the race condition was triggered.
          </Text>
        )}
      </View>

      <View style={styles.canvasContainer}>
        {Array.from({ length: canvasCount }).map((_, index) => (
          <AnimatedCanvas key={`${keyRef.current}-${index}`} />
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          onPress={isRunning ? stopTest : startTest}
          title={isRunning ? "Stop Test" : "Start Mount/Unmount Test"}
          color={isRunning ? "#dc3545" : "#28a745"}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  iterations: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  canvasCount: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  warning: {
    fontSize: 14,
    color: "#dc3545",
    fontWeight: "600",
  },
  canvasContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 8,
    minHeight: 200,
  },
  smallCanvas: {
    width: 80,
    height: 80,
    margin: 4,
    borderColor: "red",
    borderWidth: 1,
  },
  buttonContainer: {
    padding: 16,
  },
});
