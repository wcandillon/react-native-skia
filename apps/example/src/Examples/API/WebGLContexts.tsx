import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Canvas, Fill } from "@shopify/react-native-skia";

// Renders more canvases than the browser allows concurrent WebGL contexts
// (typically 16) to exercise
// __destroyWebGLContextAfterRender, which releases each context after the
// frame is drawn. On native the flag is a no-op.
const CANVAS_COUNT = 17;

export const WebGLContexts = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>WebGL Canvas Stress Test</Text>
      <Text style={styles.description}>
        {CANVAS_COUNT} canvases, more than the browser's concurrent WebGL
        context limit. Expected: every canvas shows its color. Broken: the
        oldest canvases go blank as their contexts are evicted.
      </Text>
      <View style={styles.grid}>
        {new Array(CANVAS_COUNT).fill(0).map((_, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.label}>Canvas {i + 1}</Text>
            <Canvas style={styles.canvas} __destroyWebGLContextAfterRender>
              <Fill color={`hsl(${(i * 18) % 360}, 70%, 50%)`} />
            </Canvas>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
  },
  description: {
    fontSize: 13,
    color: "#666",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  canvas: {
    width: 160,
    height: 160,
  },
});
