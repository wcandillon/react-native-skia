// The benchmark scenes. Layouts match apps/benchmark in react-native-tgfx
// (same counts, grids and SkSL), so numbers can be compared across the two.
import React from "react";
import { Dimensions, PixelRatio, Platform } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";
import type { SkImage, SkPicture } from "react-native-skia";
import {
  Circle,
  createPicture,
  Fill,
  Group,
  Image,
  ImageShader,
  matchFont,
  Path,
  Picture,
  Rect,
  Shader,
  Skia,
  Text,
  vec,
} from "react-native-skia";

import type { Scene } from "./plan";

// The panel, portrait: some Android builds report a rotated size at bundle
// load, which would squeeze every scene into half of the screen.
const screen = Dimensions.get("screen");
export const W = Math.min(screen.width, screen.height);
export const H = Math.max(screen.width, screen.height);
const origin = vec(W / 2, H / 2);

const PALETTE = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#5AC8FA",
  "#007AFF",
  "#5856D6",
  "#AF52DE",
];

// 20,000 rects and circles: per-draw cost on the CPU.
const SHAPES = Array.from({ length: 20000 }, (_, i) => ({
  x: (i % 80) * (W / 80),
  y: Math.floor(i / 80) * (H / 250),
  size: W / 80 - 1,
  color: PALETTE[i % PALETTE.length],
  circle: i % 3 === 0,
}));

// The same 20,000 shapes in one SkShapeBlob, drawn with a single
// canvas.drawShapes (one drawVertices): the `shapes` scene without the
// per-draw cost. The picture is recorded once; it pins the sprites at the
// pixel density, since a recording canvas has no device scale.
let shapeBlob: SkPicture | null = null;
const getShapeBlob = () => {
  if (shapeBlob === null) {
    const blob = Skia.ShapeBlob({ rasterScale: PixelRatio.get() });
    const colors = PALETTE.map((c) => Skia.Color(c));
    SHAPES.forEach((s, i) => {
      const color = colors[i % colors.length];
      if (s.circle) {
        blob.addCircle(s.x + s.size / 2, s.y + s.size / 2, s.size / 2, color);
      } else {
        blob.addRect(Skia.XYWHRect(s.x, s.y, s.size, s.size), color);
      }
    });
    shapeBlob = createPicture((canvas) => canvas.drawShapes(blob));
  }
  return shapeBlob;
};

// 3,600 image draws over 8 textures.
const IMAGE_CELLS = Array.from({ length: 3600 }, (_, i) => ({
  x: (i % 60) * (W / 60),
  y: Math.floor(i / 60) * (H / 60),
  size: W / 60 - 1,
  which: i % 8,
}));

// 900 cubic squiggles, half filled, half stroked: path rendering on the GPU.
const PATHS = Array.from({ length: 900 }, (_, i) => {
  const x = (i % 30) * (W / 30);
  const y = Math.floor(i / 30) * (H / 30);
  const w = W / 30 - 1;
  const h = H / 30 - 1;
  return {
    d:
      `M${x} ${y + h / 2}` +
      `C${x + w / 4} ${y}, ${x + w / 2} ${y + h}, ${x + w} ${y + h / 2}` +
      `C${x + w * 0.75} ${y + h}, ${x + w / 2} ${y}, ${x} ${y + h / 2}Z`,
    color: PALETTE[i % PALETTE.length],
    stroked: i % 2 === 0,
  };
});

// 6,000 short labels: glyph atlas and text draws.
const TEXTS = Array.from({ length: 6000 }, (_, i) => ({
  x: (i % 25) * (W / 25),
  y: 8 + Math.floor(i / 25) * ((H - 16) / 240),
  label: `bench ${i}`,
  color: PALETTE[i % PALETTE.length],
}));

// A 40-octave fullscreen SkSL: fragment cost on the GPU.
const SKSL = `
uniform float uTime;
uniform float2 uSize;
half4 main(float2 pos) {
  float2 uv = pos / uSize;
  float v = 0.0;
  float2 c = uv - 0.5;
  for (int i = 1; i <= 40; i++) {
    float f = float(i);
    v += sin((uv.x * 9.0 + uTime) * f) * 0.5 / f;
    v += sin((uv.y * 11.0 - uTime) * f) * 0.5 / f;
    v += sin(sqrt(dot(c, c)) * (18.0 + 3.0 * f) - uTime * 2.0) / f;
  }
  v *= 0.22;
  return half4(0.5 + 0.5 * sin(6.28 * v),
               0.5 + 0.5 * sin(6.28 * v + 2.1),
               0.5 + 0.5 * sin(6.28 * v + 4.2), 1.0);
}`;

const effect = Skia.RuntimeEffect.Make(SKSL)!;
const font = matchFont({
  fontFamily: Platform.select({ ios: "Helvetica", default: "sans-serif" }),
  fontSize: 14,
});

// A CPU surface: its snapshot is a raster image any canvas can draw.
const makeTexture = (i: number, size: number): SkImage => {
  const surface = Skia.Surface.MakeRaster(size, size)!;
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(PALETTE[i % PALETTE.length]));
  canvas.drawRect({ x: 0, y: 0, width: size, height: size }, paint);
  paint.setColor(Skia.Color(PALETTE[(i + 3) % PALETTE.length]));
  canvas.drawCircle(size / 2, size / 2, size / 3, paint);
  paint.setColor(Skia.Color("#00000040"));
  canvas.drawRect(
    { x: size / 4, y: size / 4, width: size / 2, height: 6 },
    paint
  );
  return surface.makeImageSnapshot();
};

let textures: { images: SkImage[]; tile: SkImage } | null = null;
const getTextures = () => {
  if (textures === null) {
    textures = {
      images: Array.from({ length: 8 }, (_, i) => makeTexture(i, 128)),
      tile: makeTexture(2, 64),
    };
  }
  return textures;
};

/** One scene, rotated (or animated) by `t`, a shared value in radians. */
export const BenchScene = ({
  scene,
  t,
}: {
  scene: Scene;
  t: SharedValue<number>;
}) => {
  const transform = useDerivedValue(() => [{ rotate: t.value }]);
  const patternTransform = useDerivedValue(() => [
    { rotate: t.value },
    { scale: 0.03 },
  ]);
  const uniforms = useDerivedValue(() => ({ uTime: t.value, uSize: [W, H] }));
  switch (scene) {
    case "shapes":
      return (
        <Group transform={transform} origin={origin}>
          {SHAPES.map((s, i) =>
            s.circle ? (
              <Circle
                key={i}
                cx={s.x + s.size / 2}
                cy={s.y + s.size / 2}
                r={s.size / 2}
                color={s.color}
              />
            ) : (
              <Rect
                key={i}
                x={s.x}
                y={s.y}
                width={s.size}
                height={s.size}
                color={s.color}
              />
            )
          )}
        </Group>
      );
    case "shapeBlob":
      return (
        <Group transform={transform} origin={origin}>
          <Picture picture={getShapeBlob()} />
        </Group>
      );
    case "images": {
      const { images } = getTextures();
      return (
        <Group transform={transform} origin={origin}>
          {IMAGE_CELLS.map((c, i) => (
            <Image
              key={i}
              image={images[c.which]}
              x={c.x}
              y={c.y}
              width={c.size}
              height={c.size}
            />
          ))}
        </Group>
      );
    }
    case "shader":
      return (
        <Fill>
          <Shader source={effect} uniforms={uniforms} />
        </Fill>
      );
    case "pattern": {
      const { tile } = getTextures();
      return (
        <Group transform={patternTransform} origin={origin}>
          <Rect x={-W * 20} y={-H * 20} width={W * 41} height={H * 41}>
            <ImageShader image={tile} tx="repeat" ty="repeat" />
          </Rect>
        </Group>
      );
    }
    case "paths":
      return (
        <Group transform={transform} origin={origin}>
          {PATHS.map((p, i) =>
            p.stroked ? (
              <Path
                key={i}
                path={p.d}
                color={p.color}
                style="stroke"
                strokeWidth={2}
              />
            ) : (
              <Path key={i} path={p.d} color={p.color} />
            )
          )}
        </Group>
      );
    case "text":
      return (
        <Group transform={transform} origin={origin}>
          {TEXTS.map((item, i) => (
            <Text
              key={i}
              x={item.x}
              y={item.y}
              text={item.label}
              font={font}
              color={item.color}
            />
          ))}
        </Group>
      );
  }
};
