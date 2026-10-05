import type { AndroidSurfaceType } from "@shopify/react-native-skia";
import {
  Canvas,
  Fill,
  LinearGradient,
  Text as SkiaText,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

type SurfaceType = "auto" | AndroidSurfaceType;

const surfaceTypes: SurfaceType[] = ["auto", "SurfaceView", "TextureView"];
const DRAWER_WIDTH = 220;

export const ZIndexDrawer = () => {
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("auto");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const font = useFont(require("../../assets/SF-Pro-Display-Bold.otf"), 48);

  const drawerStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: withTiming(drawerOpen ? -DRAWER_WIDTH : 0, {
            duration: 300,
          }),
        },
      ],
    }),
    [drawerOpen]
  );

  const backdropStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(drawerOpen ? 1 : 0, { duration: 300 }),
    }),
    [drawerOpen]
  );

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.stage, { zIndex: drawerOpen ? 0 : 1 }]}>
          <Canvas
            style={styles.canvas}
            android={{
              surfaceType: surfaceType === "auto" ? undefined : surfaceType,
              zOrderOnTop: surfaceType === "SurfaceView" ? true : undefined,
            }}
          >
            <Fill>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, 200)}
                colors={["#1c1c1e", "#3a3a3c"]}
              />
            </Fill>
            {font && (
              <SkiaText text="Skia" x={40} y={130} font={font}>
                <LinearGradient
                  start={vec(0, 90)}
                  end={vec(220, 170)}
                  colors={["#ff375f", "#ff9f0a", "#30d158"]}
                />
              </SkiaText>
            )}
          </Canvas>
        </View>

        <View style={styles.controls}>
          <Pressable
            style={styles.openButton}
            onPress={() => setDrawerOpen((open) => !open)}
          >
            <Text style={styles.openButtonText}>
              {drawerOpen ? "Close drawer" : "Open drawer"}
            </Text>
          </Pressable>
          <Text style={styles.label}>android.surfaceType</Text>
          <View style={styles.row}>
            {surfaceTypes.map((type) => (
              <Pressable
                key={type}
                onPress={() => setSurfaceType(type)}
                style={[styles.chip, type === surfaceType && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    type === surfaceType && styles.chipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        style={styles.backdropTouchable}
        pointerEvents={drawerOpen ? "auto" : "none"}
        onPress={() => setDrawerOpen(false)}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <Animated.View style={[styles.drawer, drawerStyle]} collapsable={false}>
        <Text style={styles.drawerTitle}>Drawer</Text>
        <Text style={styles.drawerHint}>
          Opening/closing this animates over the canvas while flipping its
          zIndex, same as React Navigation's Drawer does to screen content.
        </Text>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingBottom: 16,
  },
  stage: {
    flex: 1,
    backgroundColor: "red",
  },
  canvas: {
    flex: 1,
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFill,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: -DRAWER_WIDTH,
    width: DRAWER_WIDTH,
    backgroundColor: "white",
    padding: 20,
    gap: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 0 },
    zIndex: 2,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  drawerHint: {
    color: "#666",
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  openButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#007aff",
    alignItems: "center",
  },
  openButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontWeight: "bold",
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
  },
  chipText: {
    color: "#333",
  },
  chipTextActive: {
    color: "white",
  },
});
