import type { SkiaValue, Vector, SkFont } from "@shopify/react-native-skia";
import {
  BlurMask,
  Fill,
  Rect,
  rect,
  Group,
  Paint,
  RoundedRect,
  RuntimeShader,
  Skia,
  usePaintRef,
  vec,
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
const float r = 50.0;
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

bool inRRBound(vec2 p) {
  bool inRect = (p.x > 0. && p.y > 0. && p.x <= resolution.x && p.y <= resolution.y);
  if (!inRect) {
    return false;
  }
  if(distance(p, vec2(resolution.x - 16.0, 16.0)) > 16.0) {
    return false;
  }
  if(distance(p, vec2(resolution.x - 16.0, resolution.y - 16.0)) > 16.0) {
    return false;
  }
  if(distance(p, vec2(16.0, 16.0)) > 16.0) {
    return false;
  }
  if(distance(p, vec2(16.0, resolution.y - 16.0)) > 16.0) {
    return false;
  }
  return true;
}

bool inBound(vec2 p) {
  return (p.x > 0. && p.y > 0. && p.x <= resolution.x && p.y <= resolution.y);
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
  if (d < 1.0) {
    return vec4(0.3, 0.6, 1.0, 1.0);
  }
  return cl;
}
vec4 main(float2 xy) {
  vec4 cl = vec4(0, 0, 0, 1);
  float dx = origin.x - pointer.x;
  float x = resolution.x - dx;
  float d = xy.x - x;
  cl = image.eval(xy);

  if (d > r) {
    cl = vec4(0.0, 0.0, 0.0, 0.0);
    cl.rgb *= pow(clamp(d - r, 0., 1.) * 1.5, .2);
  } else if (d > 0) {
    float theta = asin(d / r);
    float d1 = theta * r;
    float d2 = (PI - theta) * r;
    vec2 p1 = vec2(x + d1, xy.y);
    vec2 p2 = vec2(x + d2, xy.y);
    cl = image.eval(inBound(p2) && !transparent(p2) ? p2  : p1);
    cl.rgb *= pow(clamp((r - d) / r, 0., 1.), .2);
  } else {
    vec2 p = vec2(x + abs(d) + PI * r, xy.y);
    cl = image.eval(inBound(p) && !transparent(p) ? p  : xy);
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
        <Text x={32} y={150 - 16} text="Untitled Project" font={font} />
      </Group>
    </>
  );
};
