import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import type { Vector } from "@shopify/react-native-skia";
import {
  Rect,
  transformOrigin,
  sub,
  Canvas,
  Circle,
  Skia,
  PaintStyle,
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
} from "@shopify/react-native-skia";

import { translate } from "../../components/Animations";

import { Title } from "./components/Title";

const path = Skia.Path.MakeFromSVGString(
  "M466 91C466 141.258 361.682 182 233 182C104.318 182 0 141.258 0 91C0 40.7421 104.318 0 233 0C361.682 0 466 40.7421 466 91Z"
)!;

const vWidth = 466;
const vHeight = 182;
const vOrigin = { x: vWidth / 2, y: vHeight / 2 };

const basePaint = Skia.Paint();
basePaint.setAntiAlias(true);
basePaint.setColor(Skia.Color("#61DAFB"));

const strokePaint = basePaint.copy();
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(15);
strokePaint.setPathEffect(Skia.PathEffect.MakeDiscrete(10, 4, 0));

const transparentPaint = basePaint.copy();
transparentPaint.setStyle(PaintStyle.Stroke);
transparentPaint.setStrokeWidth(15);
transparentPaint.setAlphaf(0.2);

const Logo: React.FC<{ center: Vector; origin: Vector; scale: number }> = ({
  center,
  origin,
  scale,
}) => {
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
const SquaredLogo: React.FC<{
  center: Vector;
  origin: Vector;
  scale: number;
}> = ({ center, origin, scale }) => {
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
  const { width } = useWindowDimensions();
  const SIZE = width;
  const scale = (SIZE - 64) / vWidth;
  const origin = { x: (vWidth * scale) / 2, y: (vHeight * scale) / 2 };
  const center = { x: SIZE / 2, y: SIZE / 2 };

  const styles = useMemo(() => ({ width, height: width }), [width]);

  return (
    <ScrollView>
      <Title>Discrete</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <DiscretePathEffect length={10} deviation={4} />
          <Logo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>

      <Title>Dash</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <DashPathEffect intervals={[10, 10]} />
          <Logo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>

      <Title>Corner</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15} opacity={0.5}>
          <SquaredLogo center={center} origin={origin} scale={scale} />
        </Group>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <CornerPathEffect r={200} />
          <SquaredLogo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>

      <Title>Path1D</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <Path1DPathEffect
            path="M -10 0 L 0 -10, 10 0, 0 10 Z"
            advance={20}
            phase={0}
            style="rotate"
          />
          <Logo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>

      <Title>Path2D</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <Path2DPathEffect
            path="M -10 0 L 0 -10, 10 0, 0 10 Z"
            matrix={processTransform2d([{ scale: 40 }])}
          />
          <Logo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>

      <Title>Line2D</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <Line2DPathEffect
            width={0}
            matrix={processTransform2d([{ scale: 8 }])}
          />
          <Logo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>

      <Title>Compose</Title>
      <Canvas style={styles}>
        <Group color="#61DAFB" style="stroke" strokeWidth={15}>
          <DashPathEffect intervals={[10, 10]}>
            <DiscretePathEffect length={10} deviation={10} />
          </DashPathEffect>
          <Logo center={center} origin={origin} scale={scale} />
        </Group>
      </Canvas>
    </ScrollView>
  );
};
