import type { SkiaValue, Vector, SkFont } from "@shopify/react-native-skia";
import {
  Rect,
  rect,
  Group,
  Paint,
  RoundedRect,
  RuntimeShader,
  Skia,
  usePaintRef,
  Text,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

import { BilinearGradient } from "../../Examples/Aurora/components/BilinearGradient";

const { width } = Dimensions.get("window");
const project = Skia.RRectXY(Skia.XYWHRect(0, 0, width - 32, 150), 16, 16);

const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform vec2 pointer;
uniform vec2 origin;
uniform vec2 resolution;

const float PI = 3.1415926535897932384626433832795;
const float r = 75.0;

vec4 point(vec2 v, vec2 xy, vec4 cl) {
  if (distance(xy, v) < 5) {
    return vec4(0, 0, 1, 1);
  }
  return cl;
}
vec2 rotate(vec2 point, vec2 pivot, float angle) {
    float dx = point.x - pivot.x;
    float dy = point.y - pivot.y;
    float x = pivot.x + dx * cos(angle) - dy * sin(angle);
    float y = pivot.y + dx * sin(angle) + dy * cos(angle);
    return vec2(x, y);
}

bool transparent(vec2 p) {
  return image.eval(p).a < 1.;
}

// https://www.youtube.com/watch?v=D_Zq6q1gnvw&t=158s
vec4 line(vec2 a, vec2 b, vec2 p, vec4 cl) {
  vec2 ba = b - a;
  vec2 pa = p - a;
  //float k = clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0);
  float k = dot(ba, pa) / dot(ba, ba);
  float d = length(pa - ba * k);
  if (d < 1) {
    return vec4(0.3, 0.6, 1.0, 1.0);
  }
  return cl;
}

mat3 translate(vec2 p) {
  return mat3(1.0,0.0,0.0,0.0,1.0,0.0,p.x,p.y,1.0);
}

mat3 scale(vec2 s, vec2 p) {
  return translate(p) * mat3(s.x,0.0,0.0,0.0,s.y,0.0,0.0,0.0,1.0) * translate(-p);
}

vec2 project(vec2 p, mat3 m) {
  vec3 pr = m * vec3(p, 1.);
  return pr.xy;
}


vec4 darken(vec4 color) {
  return color * vec4(vec3(0.7), 1.);
}

vec4 main(float2 xy) {
  float maxScale = 1.1;
  mat3 transform = scale(vec2(1/maxScale, 1/maxScale), 0.5 * resolution);

  vec4 cl = vec4(0, 0, 0, 1);
  float dx = origin.x - pointer.x;
  float x = resolution.x - dx;
  float d = xy.x - x;
  cl = image.eval(xy);

  if (d > r) {
    cl = vec4(0.0, 0.0, 0.0, 0.0);
    if (!transparent(xy)) {
      cl.rgb *= pow(clamp((r - d) / r, 0., 1.), .2);
    }
  } else if (d > 0) {
    float theta = asin(d / r);
    float dp = cos(theta);
    vec2 s = vec2(1./(1. + dp * 0.1));
    transform = scale(s, 0.5 * resolution);
    vec2 uv = project(xy, transform);

    float d1 = theta * r;
    float d2 = (PI - theta) * r;
    vec2 p1 = vec2(x + d1, uv.y);
    vec2 p2 = vec2(x + d2, uv.y);
    cl = image.eval(!transparent(p2) ? p2 : vec2(x + d1, xy.y));
    if (!transparent(p2)) {
      cl = darken(cl);
    }
    cl.rgb *= pow(clamp((r - d) / r, 0., 1.), .2);
  } else {
    float theta = asin(abs(d) / r);
    float dp = cos(theta);
    vec2 s = vec2(1./(1. + dp * 0.1));
    transform = scale(s, 0.5 * resolution);
    vec2 uv = project(xy, transform);
    vec2 p = vec2(x + abs(d) + PI * r, uv.y);
    cl = image.eval(!transparent(p) ? p : xy);
    if (!transparent(p)) {
      cl = darken(cl);
    }
  }
  //cl = line(vec2(x, 0), vec2(x, resolution.y), xy, cl);
  return cl;
}`)!;

interface ProjectProps {
  font: SkFont;
  uniforms: SkiaValue<{ resolution: Vector; pointer: Vector; origin: Vector }>;
}

export const Project = ({ uniforms, font }: ProjectProps) => {
  const paint = usePaintRef();
  return (
    <>
      <Paint ref={paint}>
        <RuntimeShader source={source} uniforms={uniforms} />
      </Paint>
      <RoundedRect rect={project} color="red" />
      <Group layer={paint}>
        <RoundedRect rect={project}>
          <BilinearGradient
            rect={project.rect}
            colors={["#dafb61", "#61DAFB", "#fb61da", "#61fbcf"]}
          />
        </RoundedRect>
        <Rect
          rect={rect(0, 0, width - 32, 30)}
          color="rgba(0.3, 0.3, 0.3, 0.3)"
        />
        <Text x={32} y={150 - 16} text="Untitled Project" font={font} />
      </Group>
    </>
  );
};
