import React, { useMemo } from "react";
import {
  Canvas,
  Circle,
  vec,
  Fill,
  Skia,
  ShaderLib,
  useValue,
  useTouchHandler,
  BlurMask,
  canvas2Polar,
  polar2Canvas,
  Shader,
} from "@shopify/react-native-skia";
import { Dimensions } from "react-native";

import { polar2Color } from "./Helpers";

const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2);
const center = vec(width / 2, height / 2);

export const Hue = () => {
  const source = useMemo(
    () =>
      Skia.RuntimeEffect.Make(`
uniform float2 c;
uniform float r;

${ShaderLib.Math}
${ShaderLib.Colors}

float quadraticIn(float t) {
  return t * t;
}

half4 main(vec2 uv) { 
  float mag = distance(uv, c);
  float theta = normalizeRad(canvas2Polar(uv, c).x);
  return hsv2rgb(vec3(theta/TAU, quadraticIn(mag/r), 1.0));
}`)!,
    []
  );

  const r = (width - 32) / 2;
  const translateX = useValue(c.x);
  const translateY = useValue(c.y);
  const color = useValue(0xffffffff);
  const onTouch = useTouchHandler({
    onActive: (pt) => {
      const { theta, radius } = canvas2Polar(pt, center);
      const { x, y } = polar2Canvas(
        { theta, radius: Math.min(radius, r) },
        center
      );
      translateX.current = x;
      translateY.current = y;
      color.current = polar2Color(theta, Math.min(radius, r), r);
    },
  });
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch} debug>
      <Fill color={color} />
      <Circle c={c} r={r}>
        <BlurMask blur={40} style="solid" />
        <Shader source={source} uniforms={{ c, r }} />
      </Circle>
      <Circle r={20} color="black" cx={translateX} cy={translateY}>
        <BlurMask blur={10} style="solid" />
      </Circle>
      <Circle r={15} color={color} cx={translateX} cy={translateY} />
    </Canvas>
  );
};
