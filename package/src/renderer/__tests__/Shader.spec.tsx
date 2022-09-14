import React from "react";

import { docPath, processResult } from "../../__tests__/setup";
import {
  Blend,
  Fill,
  Group,
  RadialGradient,
  LinearGradient,
  ShaderLib,
  Shader,
  ColorShader,
} from "../components";

import { drawOnNode, height, width, importSkia } from "./setup";

const bilinearInterpolation = `
uniform vec4 position;
uniform vec4 colors[4];

vec4 main(vec2 pos) {
  vec2 uv = (pos - vec2(position.x, position.y))/vec2(position.z, position.w);
  vec4 colorA = mix(colors[0], colors[1], uv.x);
  vec4 colorB = mix(colors[2], colors[3], uv.x);
  return mix(colorA, colorB, uv.y);
}`;

const hue = `
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
  if (mag > r) {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
  return hsv2rgb(vec3(theta/TAU, quadraticIn(mag/r), 1.0));
}`;

const spiral = `
uniform float scale;
uniform int2   center;
uniform float4 colors[2];
half4 main(float2 p) {
    float2 pp = p - float2(center);
    float radius = sqrt(dot(pp, pp));
    radius = sqrt(radius);
    float angle = atan(pp.y / pp.x);
    float t = (angle + 3.1415926/2) / (3.1415926);
    t += radius * scale;
    t = fract(t);
    return half4(mix(colors[0], colors[1], t));
}`;

describe("Test Shader component", () => {
  it("should flatten shader uniforms", () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(bilinearInterpolation)!;
    expect(source).toBeTruthy();
    const surface = drawOnNode(
      <Group>
        <Shader
          source={source}
          uniforms={{
            position: [0, 0, width, height],
            colors: ["#dafb61", "#61DAFB", "#fb61da", "#61fbcf"]
              .map(Skia.Color)
              .map(([r, g, b, a]) => [r, g, b, a]),
          }}
        />
        <Fill />
      </Group>
    );
    processResult(surface, "snapshots/shader/bilinear-interpolation.png");
  });

  it("should display a hue wheel", () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(hue)!;
    expect(source).toBeTruthy();
    const surface = drawOnNode(
      <Group>
        <Shader
          source={source}
          uniforms={{
            c: Skia.Point(width / 2, height / 2),
            r: width / 2,
          }}
        />
        <Fill />
      </Group>
    );
    processResult(surface, "snapshots/shader/hue.png");
  });

  it("should display a green and red spiral", () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(spiral)!;
    expect(source).toBeTruthy();
    const surface = drawOnNode(
      <Group>
        <Shader
          source={source}
          uniforms={{
            scale: 0.3,
            center: Skia.Point(width / 2, height / 2),
            colors: [
              [1, 0, 0, 1], // red
              [0, 1, 0, 1], // green
            ],
          }}
        />
        <Fill />
      </Group>
    );
    processResult(surface, "snapshots/runtime-effects/spiral.png");
  });

  it("should display a linear gradient", () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(spiral)!;
    expect(source).toBeTruthy();
    const surface = drawOnNode(
      <Group>
        <LinearGradient
          colors={["cyan", "magenta", "yellow"]}
          start={{ x: 0, y: 0 }}
          end={{ x: width, y: height }}
        />
        <Fill />
      </Group>
    );
    processResult(surface, "snapshots/runtime-effects/linear-gradient.png");
  });

  it("should display a color", () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(spiral)!;
    expect(source).toBeTruthy();
    const surface = drawOnNode(
      <Fill>
        <ColorShader color="lightblue" />
      </Fill>
    );
    processResult(surface, docPath("shaders/color.png"));
  });

  it("should blend cyan/magenta/yellow to black (multiply)", () => {
    const { vec } = importSkia();
    const r = width / 2;
    const c = vec(r, r);
    const surface = drawOnNode(
      <Fill>
        <Blend mode="multiply">
          <RadialGradient r={r} c={c} colors={["cyan", "magenta"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
        </Blend>
      </Fill>
    );
    processResult(surface, "snapshots/runtime-effects/blend-multiply.png");
  });

  it("should blend using color burn", () => {
    const { vec } = importSkia();
    const r = width / 2;
    const c = vec(r, r);
    let surface = drawOnNode(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
        </Blend>
      </Fill>
    );
    processResult(surface, "snapshots/runtime-effects/blend-color-burn.png");
    surface = drawOnNode(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
        </Blend>
      </Fill>
    );
    processResult(surface, "snapshots/runtime-effects/blend-color-burn2.png");
  });

  it("should blend using multiply", () => {
    const { vec } = importSkia();
    const r = width / 2;
    const c = vec(r, r);
    let surface = drawOnNode(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
          <RadialGradient r={r} c={c} colors={["cyan", "magenta"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
        </Blend>
      </Fill>
    );
    processResult(surface, "snapshots/runtime-effects/blend-color-burn3.png");
    surface = drawOnNode(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
          <Blend mode="colorBurn">
            <RadialGradient r={r} c={c} colors={["cyan", "magenta"]} />
            <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          </Blend>
        </Blend>
      </Fill>
    );
    processResult(surface, "snapshots/runtime-effects/blend-color-burn3.png");
  });
});
