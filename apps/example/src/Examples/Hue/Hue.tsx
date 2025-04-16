import React, { useMemo } from "react";
import type { Color } from "@shopify/react-native-skia";
import {
  Canvas,
  Circle,
  vec,
  Fill,
  Skia,
  ShaderLib,
  BlurMask,
  canvas2Polar,
  polar2Canvas,
  Shader,
} from "@shopify/react-native-skia";
import { View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";

import { polar2Color } from "./Helpers";

const source = Skia.RuntimeEffect.Make(`
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
}`)!;

export const Hue = () => {
  const { width, height } = useWindowDimensions();
  const c = vec(width / 2, height / 2);
  const center = useMemo(() => vec(width / 2, height / 2), [height, width]);

  const r = (width - 32) / 2;
  const translateX = useSharedValue(c.x);
  const translateY = useSharedValue(c.y);
  const color = useSharedValue<Color>(0xffffffff);

  const gesture = Gesture.Pan().onChange((e) => {
    const { theta, radius } = canvas2Polar(e, center);
    const { x, y } = polar2Canvas(
      { theta, radius: Math.min(radius, r) },
      center
    );
    translateX.value = x;
    translateY.value = y;
    color.value = polar2Color(theta, Math.min(radius, r), r);
  });
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ flex: 1 }}>
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
      </GestureDetector>
    </View>
  );
};
