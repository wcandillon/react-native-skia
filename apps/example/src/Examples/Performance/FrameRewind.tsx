import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  RoundedRect,
  rect,
  rrect,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const GLIDE_DURATION_MS = 1200;

const createOrbit = (count: number, radius: number, color: string) => {
  return new Array(count).fill(null).map((_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return (
      <Circle
        key={`${color}-${count}-${index}`}
        cx={x}
        cy={y}
        r={6}
        color={color}
      />
    );
  });
};

type DemoStatus = "idle" | "dragging" | "gliding";

export const FrameRewind = () => {
  const { width, height } = useWindowDimensions();
  const translateX = useSharedValue(width / 2);
  const translateY = useSharedValue(height / 2);
  const startPos = useSharedValue({ x: width / 2, y: height / 2 });
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [burst, setBurst] = useState(false);
  const [tick, setTick] = useState(0);
  const glideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGlideTimeout = () => {
    if (glideTimeout.current) {
      clearTimeout(glideTimeout.current);
      glideTimeout.current = null;
    }
  };

  useEffect(() => {
    translateX.value = width / 2;
    translateY.value = height / 2;
    startPos.value = { x: width / 2, y: height / 2 };
  }, [height, width, startPos, translateX, translateY]);

  useEffect(() => {
    return () => clearGlideTimeout();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setBurst((value) => !value);
      setTick((value) => (value + 1) % 1000);
    }, 120);

    return () => clearInterval(id);
  }, []);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
  ]);

  const statusLabel =
    status === "dragging"
      ? "tracking finger"
      : status === "gliding"
      ? "gliding with timing"
      : "idle";

  const staticOrbit = useMemo(() => createOrbit(8, 52, "#FBBF24"), []);
  const dynamicOrbit = useMemo(
    () =>
      createOrbit(burst ? 18 : 6, burst ? 92 : 64, burst ? "#38BDF8" : "#F472B6"),
    [burst]
  );

  const scheduleGlideComplete = (duration: number) => {
    clearGlideTimeout();
    glideTimeout.current = setTimeout(() => {
      setStatus("idle");
      glideTimeout.current = null;
    }, duration + 50);
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      runOnJS(clearGlideTimeout)();
      runOnJS(setStatus)("dragging");
      startPos.value = { x: translateX.value, y: translateY.value };
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    })
    .onChange((event) => {
      translateX.value = startPos.value.x + event.translationX;
      translateY.value = startPos.value.y + event.translationY;
    })
    .onFinalize((event) => {
      const travelFactor = 0.35;
      const targetX = translateX.value + event.velocityX * travelFactor;
      const targetY = translateY.value + event.velocityY * travelFactor;

      runOnJS(setStatus)("gliding");

      translateX.value = withTiming(targetX, {
        duration: GLIDE_DURATION_MS,
        easing: Easing.out(Easing.linear),
      });
      translateY.value = withTiming(targetY, {
        duration: GLIDE_DURATION_MS,
        easing: Easing.out(Easing.linear),
      });

      runOnJS(scheduleGlideComplete)(GLIDE_DURATION_MS);
    });

  return (
    <View style={styles.screen}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.canvas}>
          <Group transform={transform}>
            <RoundedRect
              rect={rrect(rect(-120, -80, 240, 160), 28, 28)}
              color="#111827"
            />
            <Circle cx={0} cy={0} r={18} color="#34D399" />
            {staticOrbit}
            {dynamicOrbit}
          </Group>
        </Canvas>
      </GestureDetector>
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.title}>Frame rewind regression</Text>
        <Text style={styles.status}>Status: {statusLabel}</Text>
        <Text style={styles.tick}>
          Update ticks: {tick.toString().padStart(3, "0")}
        </Text>
        <Text style={styles.description}>
          Drag the tile and release to let it glide. A lightweight mutation loop
          adds or removes orbiting dots every frame. The reported regression
          shows that once the gesture ends the glide can replay frames out of
          order.
        </Text>
        <Text style={styles.hint}>
          Touch the screen again while it is gliding to immediately smooth the
          motion.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030712",
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  status: {
    color: "#A5B4FC",
    fontSize: 14,
    marginBottom: 4,
  },
  tick: {
    color: "#FCD34D",
    fontSize: 12,
    marginBottom: 12,
  },
  description: {
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 16,
  },
  hint: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 8,
  },
});
