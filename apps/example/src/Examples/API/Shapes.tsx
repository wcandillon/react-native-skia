import React, { useMemo } from "react";
import { ScrollView, PixelRatio, useWindowDimensions } from "react-native";
import {
  Skia,
  PaintStyle,
  Canvas,
  Rect,
  DiffRect,
  Group,
  Oval,
  Line,
  Points,
  vec,
  rect,
  rrect,
  Paint,
  DashPathEffect,
  Vertices,
  RoundedRect,
  Patch,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const paint = Skia.Paint();
paint.setAntiAlias(true);
paint.setColor(Skia.Color("#61DAFB"));

const strokePaint = paint.copy();
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(2);

const PADDING = 16;

export const Shapes = () => {
  const { width } = useWindowDimensions();
  const SIZE = width / 4;
  const c = useMemo(() => ({ x: width / 2, y: SIZE / 2 + 16 }), [SIZE, width]);
  const S = 25;
  const c1 = useMemo(
    () => [
      vec(c.x - 2 * S, c.y - S),
      vec(c.x - S, c.y - 2 * S),
      vec(c.x - S, c.y - S),
    ],
    [c.x, c.y]
  );

  const c2 = useMemo(
    () => [vec(c.x, c.y - 2 * S), vec(c.x + S, c.y), vec(c.x + S, c.y - S)],
    [c.x, c.y]
  );

  const c3 = useMemo(
    () => [vec(c.x - 10, c.y + 10), vec(c.x + S, c.y), vec(c.x + S, c.y + S)],
    [c.x, c.y]
  );

  const c4 = useMemo(
    () => [
      vec(c.x - 2 * S, c.y + S),
      vec(c.x - S, c.y + 2 * S),
      vec(c.x - S, c.y + S),
    ],
    [c.x, c.y]
  );

  const cubics = useMemo(() => [...c1, ...c2, ...c3, ...c4], [c1, c2, c3, c4]);

  const outer = useMemo(
    () => rrect(rect(2 * SIZE + 3 * 16, PADDING, SIZE, SIZE), 25, 25),
    [SIZE]
  );
  const inner = useMemo(
    () =>
      rrect(
        rect(2 * SIZE + 4 * PADDING, 2 * PADDING, SIZE - 32, SIZE - 32),
        0,
        0
      ),
    [SIZE]
  );

  const topLeft = useMemo(
    () => ({ pos: vec(16, 0), c1: vec(0, 15), c2: vec(15, 0) }),
    []
  );
  const topRight = useMemo(
    () => ({ pos: vec(100, 0), c1: vec(80, 15), c2: vec(85, 0) }),
    []
  );
  const bottomRight = useMemo(
    () => ({
      pos: vec(100, 100),
      c1: vec(100, 85),
      c2: vec(85, 100),
    }),
    []
  );
  const bottomLeft = useMemo(
    () => ({ pos: vec(16, 100), c1: vec(0, 85), c2: vec(15, 100) }),
    []
  );

  const style = useMemo(() => ({ width, height: SIZE + 32 }), [SIZE, width]);

  return (
    <ScrollView>
      <Title>Rectangles</Title>
      <Canvas style={style}>
        <Group color="#61DAFB" antiAlias={true}>
          <Rect rect={{ x: PADDING, y: PADDING, width: 100, height: 100 }} />
          <RoundedRect
            x={SIZE + 2 * PADDING}
            y={PADDING}
            width={SIZE}
            height={SIZE}
            r={25}
          />
          <DiffRect outer={outer} inner={inner} />
        </Group>
      </Canvas>
      <Title>Ovals & Circles</Title>
      <Canvas style={style}>
        <Group color="#61DAFB">
          <Oval x={PADDING} y={PADDING} width={2 * SIZE} height={SIZE}>
            <Paint
              style="stroke"
              color="#61fbcf"
              strokeWidth={10}
              opacity={0.5}
            >
              <DashPathEffect intervals={[10, 10]} />
            </Paint>
          </Oval>
          <Oval
            rect={rect(2 * SIZE + 2 * 16 + SIZE / 2, PADDING, SIZE, SIZE)}
          />
        </Group>
      </Canvas>
      <Title>Points & Lines</Title>
      <Canvas style={style}>
        <Group color="#61DAFB" style="stroke" strokeWidth={PixelRatio.get()}>
          <Points mode="polygon" points={cubics} />
          <Line p1={c} p2={vec(SIZE, 0)} />
          <Points mode="points" points={cubics} color="red" />
        </Group>
      </Canvas>
      <Title>Coon Patch</Title>
      <Canvas style={style}>
        <Patch
          colors={["#61DAFB", "#fb61da", "#61fbcf", "#dafb61"]}
          patch={[topLeft, topRight, bottomRight, bottomLeft]}
        />
      </Canvas>
      <Title>Vertices</Title>
      <Canvas style={style}>
        <Vertices
          mode="triangleFan"
          vertices={[
            vec(16, 0),
            vec(250, 0),
            vec(100, SIZE / 2),
            vec(16, SIZE + 32),
          ]}
          colors={["#61DAFB", "#fb61da", "#61fbcf", "#dafb61"]}
        />
      </Canvas>
    </ScrollView>
  );
};
