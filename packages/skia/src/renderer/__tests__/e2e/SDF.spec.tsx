import React from "react";

import { surface, importSkia } from "../setup";
import { Fill, Shader } from "../../components";
import { checkImage } from "../../../__tests__/setup";

describe("Signed Distance Function", () => {
  it("should use the sdf of a circle", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform float4 c1;
uniform float4 c2;
uniform float4 c3;
uniform float4 c4;

float sdCircle(vec2 p, float r) {
  return length(p)-r;
}

vec4 main(vec2 xy) { 
  vec2 c = vec2(128.0, 128.0);
  float d = sdCircle(xy-c, 128.0);
  return mix(c1, c2, saturate(d));
}
`)!;
    const c1 = Skia.Color("#61dafb");
    const c2 = Skia.Color("#fb61da");
    const c3 = Skia.Color("#61fbcf");
    const c4 = Skia.Color("#dafb61");
    expect(source).toBeDefined();
    const img = await surface.draw(
      <Fill>
        <Shader source={source} uniforms={{ c1, c2, c3, c4 }} />
      </Fill>
    );
    checkImage(img, "snapshots/sdf/circle.png");
  });
  it("should use the sdf of a line", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform float4 c1;
uniform float4 c2;

float sdLine(vec2 p, vec2 a, vec2 b) {
  float2 ab = b - a;
  float2 ap = p - a;
  float h = saturate(dot(ab, ap)/dot(ab, ab));
  float2 aq = h * ab;
  float d = length(ap-aq);//distance(p, aq+a);//sqrt(pow(length(ap), 2) - pow(length(aq), 2));
  return d;
}
vec4 main(vec2 xy) { 
  float strokeWidth = 40;
  float2 p1 = vec2(32);
  float2 p2 = vec2(256-32);
  vec2 c = vec2(128.0, 128.0);
  float d = sdLine(xy, p1, p2);
  if (d < strokeWidth/2) {
    return c2;
  }
  return c1;
}
`)!;
    const c1 = Skia.Color("#61dafb");
    const c2 = Skia.Color("#fb61da");
    expect(source).toBeDefined();
    const img = await surface.draw(
      <Fill>
        <Shader source={source} uniforms={{ c1, c2 }} />
      </Fill>
    );
    checkImage(img, "snapshots/sdf/line.png");
  });
  it("should use the sdf of a rectangle", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform float4 c1;
uniform float4 c2;

float sdRect( in vec2 p, in vec2 b ) {
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

vec4 main(vec2 xy) { 
  vec2 b = vec2(64, 64);
  vec2 c = vec2(128.0, 128.0);
  float d = sdRect(xy - c, b);
  if (d < 0) {
    return c2;
  }
  return c1;
}
`)!;
    const c1 = Skia.Color("#61dafb");
    const c2 = Skia.Color("#fb61da");
    expect(source).toBeDefined();
    const img = await surface.draw(
      <Fill>
        <Shader source={source} uniforms={{ c1, c2 }} />
      </Fill>
    );
    checkImage(img, "snapshots/sdf/rectangle.png");
  });
  it("should use the sdf of a heart", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform float4 c1;
uniform float4 c2;
uniform float2 resolution;

float dot2(in vec2 v) { return dot(v,v); }

float sdHeart(in vec2 p)
{
    p.x = abs(p.x);

    if( p.y+p.x>1.0 )
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                    dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

vec4 main(vec2 xy) {
  vec2 p = (xy*2.0-resolution.xy)/-resolution.y;
  p.y += 0.5;
  float d = sdHeart(p);
  if (d < 0) {
    return c2;
  }
  return c1;
}
`)!;
    const c1 = Skia.Color("#61dafb");
    const c2 = Skia.Color("#fb61da");
    expect(source).toBeDefined();
    const { width, height } = surface;
    const img = await surface.draw(
      <Fill>
        <Shader
          source={source}
          uniforms={{ c1, c2, resolution: [width, height] }}
        />
      </Fill>
    );
    checkImage(img, "snapshots/sdf/heart.png", { maxPixelDiff: 500 });
  });
});
