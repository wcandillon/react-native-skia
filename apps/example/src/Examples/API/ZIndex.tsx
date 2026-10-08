import React, { useMemo } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { Canvas, Circle, Group, useClock } from "react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CANVAS_HEIGHT = 350;
const CENTER = { x: width / 2, y: CANVAS_HEIGHT / 2 };
const NUM_POINTS = 150;
const SPHERE_RADIUS = width * 0.35;

// Fibonacci Sphere Algorithm to distribute points evenly
const getSpherePoints = (n: number) => {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle

  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y

    const theta = phi * i; // golden angle increment

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    points.push({ x, y, z });
  }
  return points;
};

const POINTS = getSpherePoints(NUM_POINTS).sort(() => Math.random() - 0.5);

interface Point3D {
  x: number;
  y: number;
  z: number;
}

const SpherePoint = ({
  point,
  rotation,
  enableZIndex,
}: {
  point: Point3D;
  rotation: { x: SharedValue<number>; y: SharedValue<number> };
  enableZIndex: boolean;
}) => {
  const derived = useDerivedValue(() => {
    // Rotate around Y axis
    const cosY = Math.cos(rotation.y.value);
    const sinY = Math.sin(rotation.y.value);

    // Rotate around X axis
    const cosX = Math.cos(rotation.x.value);
    const sinX = Math.sin(rotation.x.value);

    let { x } = point;
    let { y } = point;
    let { z } = point;

    // Apply Y rotation
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;
    x = x1;
    z = z1;

    // Apply X rotation
    const y2 = y * cosX - z * sinX;
    const z2 = z * cosX + y * sinX;
    y = y2;
    z = z2;

    // Project to 2D
    const scale = (z + 2) / 3; // Simple perspective projection
    const screenX = CENTER.x + x * SPHERE_RADIUS;
    const screenY = CENTER.y + y * SPHERE_RADIUS;

    // Map z (-1 to 1) to zIndex
    // We want points with higher z (closer to camera) to have higher zIndex
    const zIndex = Math.round(z * 1000);

    return {
      cx: screenX,
      cy: screenY,
      r: 20 * scale,
      zIndex: enableZIndex ? zIndex : 0,
      color: `hsl(${((x + 1) / 2) * 360}, 80%, ${((z + 2) / 3) * 60}%)`,
    };
  });

  const cx = useDerivedValue(() => derived.value.cx);
  const cy = useDerivedValue(() => derived.value.cy);
  const r = useDerivedValue(() => derived.value.r);
  const color = useDerivedValue(() => derived.value.color);
  const zIndex = useDerivedValue(() => derived.value.zIndex);

  return (
    <Group zIndex={zIndex}>
      <Circle cx={cx} cy={cy} r={r} color={color} />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        color="black"
        style="stroke"
        strokeWidth={1}
      />
    </Group>
  );
};

const Sphere = ({ enableZIndex }: { enableZIndex: boolean }) => {
  const clock = useClock();

  const rotationY = useDerivedValue(() => {
    return (clock.value / 4000) * Math.PI * 2;
  });

  const rotationX = useDerivedValue(() => {
    return (clock.value / 6000) * Math.PI * 2;
  });

  const rotationValues = useMemo(
    () => ({ x: rotationX, y: rotationY }),
    [rotationX, rotationY]
  );

  return (
    <Group>
      {POINTS.map((point, i) => (
        <SpherePoint
          key={i}
          point={point}
          rotation={rotationValues}
          enableZIndex={enableZIndex}
        />
      ))}
    </Group>
  );
};

export const ZIndexExample = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#111" }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          With zIndex
        </Text>
      </View>
      <Canvas style={{ width, height: CANVAS_HEIGHT }}>
        <Sphere enableZIndex={true} />
      </Canvas>

      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Without zIndex
        </Text>
      </View>
      <Canvas style={{ width, height: CANVAS_HEIGHT }}>
        <Sphere enableZIndex={false} />
      </Canvas>
    </ScrollView>
  );
};
