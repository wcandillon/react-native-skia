import React, { useCallback, useMemo } from "react";
import {
  Canvas,
  Circle,
  Oval,
  rect,
  vec,
  Group,
  SweepGradient,
  RadialGradient,
  BlurMask,
  Drawing,
  Skia,
} from "@shopify/react-native-skia";
import type { DrawingContext } from "@shopify/react-native-skia/src/renderer/DrawingContext";
import { Text, View } from "react-native";

type Props = {
  width: number;
  height: number;
  color1?: string;
  color2?: string;
};

export const ReactLogoImperative: React.FC<Props> = ({
  color1,
  color2,
  width,
  height,
}) => {
  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(color1 || "#3884FF"));
    return p;
  }, [color1]);

  const r = useMemo(
    () => Skia.XYWHRect(1, 1, width - 2, height - 2),
    [height, width]
  );

  const onDraw = useCallback(
    ({ canvas }: DrawingContext) => {
      canvas.drawRect(r, paint);
    },
    [paint, r]
  );
  return (
    <>
      <View
        style={{
          backgroundColor: "#F2f402",
          position: "absolute",
          left: 0,
          top: 200,
          height: 40,
          width: 100,
          zIndex: 10,
        }}
      >
        <Text>Back</Text>
      </View>
      <Canvas style={{ width, height, zIndex: 20 }}>
        <Drawing drawing={onDraw} />
      </Canvas>
      <View
        style={{
          backgroundColor: color2,
          position: "absolute",
          left: 0,
          top: 100,
          height: 40,
          width: 100,
          zIndex: 30,
        }}
      >
        <Text>Front</Text>
      </View>
    </>
  );
};

export const ReactLogo: React.FC<Props> = ({
  width,
  height,
  color1,
  color2,
}) => {
  const ellipsisAspectRatio = 180 / 470;
  const rx = width / 2 - width * 0.05;
  const ry = rx * ellipsisAspectRatio;

  // Origin of the Logo
  const center = vec(width / 2, height / 2);
  // Radius of the middle circle
  const r = 0.08 * width;
  // Rectangle to draw the oval in
  const rct = rect(center.x - rx, center.y - ry, rx * 2, ry * 2);
  // Some colors
  const c1 = color1 || "#3884FF";
  const c2 = color2 || "#51D3ED";
  const strokeWidth = r;

  return (
    <Canvas style={{ width, height }}>
      <Group>
        <BlurMask blur={2} style="inner" />
        <Circle c={center} color="lightblue" r={r}>
          <RadialGradient
            c={vec(center.x + r / 2, center.y + r / 2)}
            colors={[c1, c2]}
            r={2 * r}
          />
        </Circle>
        <Group>
          <SweepGradient c={center} colors={[c1, c2, c1]} />
          <Group transform={[{ scaleX: -1 }]} origin={center}>
            <Oval rect={rct} style="stroke" strokeWidth={strokeWidth} />
          </Group>
          <Group transform={[{ rotate: Math.PI / 3 }]} origin={center}>
            <Oval rect={rct} style="stroke" strokeWidth={strokeWidth} />
          </Group>
          <Group transform={[{ rotate: -Math.PI / 3 }]} origin={center}>
            <Oval rect={rct} style="stroke" strokeWidth={strokeWidth} />
          </Group>
        </Group>
      </Group>
    </Canvas>
  );
};
