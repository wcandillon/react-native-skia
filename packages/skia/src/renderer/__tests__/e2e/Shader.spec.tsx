import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
import {
  Fill,
  Group,
  LinearGradient,
  ShaderLib,
  Shader,
  ColorShader,
} from "../../components";
import { images, importSkia, surface } from "../setup";
import { ImageShader } from "../../components/image/ImageShader";

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
uniform float2   center;
uniform float4 colors[2];
half4 main(float2 p) {
    float2 pp = p - center;
    float radius = sqrt(dot(pp, pp));
    radius = sqrt(radius);
    float angle = atan(pp.y / pp.x);
    float t = (angle + 3.1415926/2) / (3.1415926);
    t += radius * scale;
    t = fract(t);
    return half4(mix(colors[0], colors[1], t));
}`;

describe("Test Shader component", () => {
  it("should cast int to a float properly", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform int opacity;

half4 main(float2 p) {
  return vec4(0.33, 0.66, 1.0, float(opacity)/255.0);
}
`)!;
    expect(source).toBeTruthy();
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Group>
          <Shader
            source={source}
            uniforms={{
              opacity: 128,
            }}
          />
          <Fill />
        </Group>
      </>
    );
    checkImage(img, "snapshots/runtime-effects/int-uniform.png");
  });
  it("should display a green and red spiral", async () => {
    const { width, height } = surface;
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(spiral)!;
    expect(source).toBeTruthy();
    const img = await surface.draw(
      <>
        <Group>
          <Shader
            source={source}
            uniforms={{
              scale: 0.6,
              center: { x: width / 2, y: height / 2 },
              colors: [
                [1, 0, 0, 1], // red
                [0, 1, 0, 1], // green
              ],
            }}
          />
          <Fill />
        </Group>
      </>
    );
    checkImage(img, "snapshots/runtime-effects/spiral.png");
  });

  it("should flatten shader uniforms", async () => {
    const { width, height } = surface;
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(bilinearInterpolation)!;
    expect(source).toBeTruthy();
    const img = await surface.draw(
      <Group>
        <Shader
          source={source}
          uniforms={{
            position: [0, 0, width, height],
            colors: ["#dafb61", "#61DAFB", "#fb61da", "#61fbcf"].map(
              Skia.Color
            ),
          }}
        />
        <Fill />
      </Group>
    );
    checkImage(img, "snapshots/shader/bilinear-interpolation.png");
  });

  it("should display a hue wheel", async () => {
    const { width, height } = surface;
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(hue)!;
    expect(source).toBeTruthy();
    const img = await surface.draw(
      <Group>
        <Shader
          source={source}
          uniforms={{
            c: { x: width / 2, y: height / 2 },
            r: width / 2,
          }}
        />
        <Fill />
      </Group>
    );
    checkImage(img, "snapshots/shader/hue.png");
  });

  it("should display a hue wheel with transform", async () => {
    const { width, height } = surface;
    const { Skia, vec } = importSkia();
    const source = Skia.RuntimeEffect.Make(hue)!;
    expect(source).toBeTruthy();
    const img = await surface.draw(
      <Group>
        <Shader
          source={source}
          uniforms={{
            c: { x: width / 2, y: height / 2 },
            r: width / 2,
          }}
          origin={vec(width / 2, height / 2)}
          transform={[{ scale: 2 }]}
        />
        <Fill />
      </Group>
    );
    checkImage(img, "snapshots/shader/hue2.png");
  });

  it("should display a linear gradient", async () => {
    const { width, height } = surface;
    const img = await surface.draw(
      <Group>
        <LinearGradient
          colors={["cyan", "magenta", "yellow"]}
          start={{ x: 0, y: 0 }}
          end={{ x: width, y: height }}
        />
        <Fill />
      </Group>
    );
    checkImage(img, "snapshots/runtime-effects/linear-gradient.png");
  });

  it("should display a linear gradient with transform", async () => {
    const { vec } = importSkia();
    const { width, height } = surface;
    const img = await surface.draw(
      <Group>
        <LinearGradient
          colors={["cyan", "magenta", "yellow"]}
          start={{ x: 0, y: 0 }}
          end={{ x: width, y: height }}
          origin={vec(width / 2, height / 2)}
          transform={[{ scale: 2 }]}
        />
        <Fill />
      </Group>
    );
    checkImage(img, "snapshots/runtime-effects/linear-gradient2.png");
  });

  it("should display a color", async () => {
    const img = await surface.draw(
      <Fill>
        <ColorShader color="lightblue" />
      </Fill>
    );
    checkImage(img, docPath("shaders/color.png"));
  });

  it("should display an image and respect the transform", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const { vec } = importSkia();

    const img = await surface.draw(
      <Fill>
        <ImageShader
          image={oslo}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
          transform={[{ scale: 2 }]}
          origin={vec(width / 2, height / 2)}
        />
      </Fill>
    );
    checkImage(img, docPath("shaders/image-with-transform.png"));
  });

  it("should display a lightblue color", async () => {
    const { Skia } = importSkia();
    const colorSelection = Skia.RuntimeEffect.Make(`uniform shader child1;
uniform shader child2;

vec4 main(vec2 pos) {
  return child1.eval(pos);
}`)!;
    const img = await surface.draw(
      <Fill>
        <Shader source={colorSelection}>
          <ColorShader color="lightblue" />
          <ColorShader color="red" />
        </Shader>
      </Fill>
    );
    checkImage(img, docPath("shaders/color.png"));
  });
  it("should display a mix of red and lightblue color", async () => {
    const { Skia } = importSkia();
    const colorSelection = Skia.RuntimeEffect.Make(`uniform shader child1;
uniform shader child2;

vec4 main(vec2 pos) {
  vec4 c1 = child1.eval(pos);
  vec4 c2 = child2.eval(pos);
  return mix(c1, c2, 0.5);
}`)!;
    const img = await surface.draw(
      <Fill>
        <Shader source={colorSelection}>
          <ColorShader color="lightblue" />
          <ColorShader color="red" />
        </Shader>
      </Fill>
    );
    checkImage(img, docPath("shaders/mixed-colors.png"));
  });
  it("should display a mix of red and lightblue from custom shaders", async () => {
    const { Skia } = importSkia();
    const colorSelection = Skia.RuntimeEffect.Make(`uniform shader child1;
uniform shader child2;

vec4 main(vec2 pos) {
  vec4 c1 = child1.eval(pos);
  vec4 c2 = child2.eval(pos);
  return mix(c1, c2, 0.5);
}`)!;
    expect(colorSelection).toBeDefined();
    const colorShader = Skia.RuntimeEffect.Make(`
uniform vec4 color;

vec4 main(vec2 pos) {
  return color;
}
`)!;
    expect(colorShader).toBeDefined();
    const img = await surface.draw(
      <Fill>
        <Shader source={colorSelection}>
          <Shader
            source={colorShader}
            uniforms={{ color: Skia.Color("lightblue") }}
          />
          <Shader
            source={colorShader}
            uniforms={{ color: Skia.Color("red") }}
          />
        </Shader>
      </Fill>
    );
    checkImage(img, docPath("shaders/mixed-colors.png"));
  });

  it("should display different results based on children order", async () => {
    const { Skia } = importSkia();
    const orderSensitiveShader = Skia.RuntimeEffect.Make(`uniform shader child1;
uniform shader child2;

vec4 main(vec2 pos) {
  vec4 c1 = child1.eval(pos);
  vec4 c2 = child2.eval(pos);
  // Order-dependent: blend child2 over child1 with position-based alpha
  float alpha = pos.x / 256.0;
  return mix(c1, c2, alpha);
}`)!;
    expect(orderSensitiveShader).toBeDefined();
    const colorShader = Skia.RuntimeEffect.Make(`
uniform vec4 color;

vec4 main(vec2 pos) {
  return color;
}
`)!;
    expect(colorShader).toBeDefined();
    const img = await surface.draw(
      <Fill>
        <Shader source={orderSensitiveShader}>
          <Shader
            source={colorShader}
            uniforms={{ color: Skia.Color("blue") }}
          />
          <Shader
            source={colorShader}
            uniforms={{ color: Skia.Color("yellow") }}
          />
        </Shader>
      </Fill>
    );
    checkImage(img, docPath("shaders/order-dependent.png"));
  });
});
