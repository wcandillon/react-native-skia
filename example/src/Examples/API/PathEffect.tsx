import React from "react";
import { StyleSheet, Dimensions, ScrollView } from "react-native";
import {
  Rect,
  transformOrigin,
  sub,
  Canvas,
  Circle,
  translate,
  DiscretePathEffect,
  DashPathEffect,
  CornerPathEffect,
  rect,
  Path,
  Path1DPathEffect,
  Path2DPathEffect,
  Line2DPathEffect,
  Group,
  processTransform2d,
  useSvgPath,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const { width } = Dimensions.get("window");
const SIZE = width;

const vWidth = 466;
const vHeight = 182;
const vOrigin = { x: vWidth / 2, y: vHeight / 2 };
const scale = (SIZE - 64) / vWidth;
const origin = { x: (vWidth * scale) / 2, y: (vHeight * scale) / 2 };
const center = { x: SIZE / 2, y: SIZE / 2 };

const Logo = () => {
  const path = useSvgPath(
    // eslint-disable-next-line max-len
    "M466 91C466 141.258 361.682 182 233 182C104.318 182 0 141.258 0 91C0 40.7421 104.318 0 233 0C361.682 0 466 40.7421 466 91Z"
  )!;

  return (
    <>
      <Circle c={center} r={30} style="fill" />
      <Group>
        <Group transform={[...translate(sub(center, origin)), { scale }]}>
          <Path path={path} style="stroke" strokeWidth={15} />
        </Group>
        <Group
          transform={[
            ...translate(sub(center, origin)),
            { scale },
            ...transformOrigin(vOrigin, [{ rotate: Math.PI / 3 }]),
          ]}
        >
          <Path path={path} style="stroke" strokeWidth={15} />
        </Group>
        <Group
          transform={[
            ...translate(sub(center, origin)),
            { scale },
            ...transformOrigin(vOrigin, [{ rotate: -Math.PI / 3 }]),
          ]}
        >
          <Path path={path} style="stroke" strokeWidth={15} />
        </Group>
      </Group>
    </>
  );
};

const rect1 = rect(0, 0, vWidth, vHeight);
const SquaredLogo = () => {
  return (
    <>
      <Circle c={center} r={30} style="fill" />
      <Group color="#61DAFB" opacity={1} style="stroke" strokeWidth={15}>
        <Group transform={[...translate(sub(center, origin)), { scale }]}>
          <Rect rect={rect1} />
        </Group>
        <Group
          transform={[
            ...translate(sub(center, origin)),
            { scale },
            ...transformOrigin(vOrigin, [{ rotate: Math.PI / 3 }]),
          ]}
        >
          <Rect rect={rect1} />
        </Group>
        <Group
          transform={[
            ...translate(sub(center, origin)),
            { scale },
            ...transformOrigin(vOrigin, [{ rotate: -Math.PI / 3 }]),
          ]}
        >
          <Rect rect={rect1} />
        </Group>
      </Group>
    </>
  );
};

export const PathEffectDemo = () => {
  return (
    <ScrollView>
      <Title>Discrete</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <DiscretePathEffect length={10} deviation={4} />
          <Logo />
        </Group>
      </Canvas>

      <Title>Dash</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <DashPathEffect intervals={[10, 10]} />
          <Logo />
        </Group>
      </Canvas>

      <Title>Corner</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15} opacity={0.5}>
          <SquaredLogo />
        </Group>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <CornerPathEffect r={200} />
          <SquaredLogo />
        </Group>
      </Canvas>

      <Title>Path1D</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <Path1DPathEffect
            path="M -10 0 L 0 -10, 10 0, 0 10 Z"
            advance={20}
            phase={0}
            style="rotate"
          />
          <Logo />
        </Group>
      </Canvas>

      <Title>Path2D</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <Path2DPathEffect
            path="M -10 0 L 0 -10, 10 0, 0 10 Z"
            matrix={processTransform2d([{ scale: 40 }])}
          />
          <Logo />
        </Group>
      </Canvas>

      <Title>Line2D</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <Line2DPathEffect
            width={0}
            matrix={processTransform2d([{ scale: 8 }])}
          />
          <Logo />
        </Group>
      </Canvas>

      <Title>Compose</Title>
      <Canvas style={styles.container}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <DashPathEffect intervals={[10, 10]}>
            <DiscretePathEffect length={10} deviation={10} />
          </DashPathEffect>
          <Logo />
        </Group>
      </Canvas>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
  },
});
