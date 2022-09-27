import type { SkiaValue, Vector, SkFont } from "@shopify/react-native-skia";
import {
  Fill,
  ImageShader,
  Rect,
  rect,
  Group,
  Paint,
  RoundedRect,
  RuntimeShader,
  Skia,
  usePaintRef,
  Text,
  useImage,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions, PixelRatio } from "react-native";

import { Trash } from "./Icons";
import { Labels } from "./Labels";

const { width } = Dimensions.get("window");
const project = Skia.RRectXY(Skia.XYWHRect(0, 0, width - 32, 150), 16, 16);

const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float pointer;
uniform float origin;
uniform vec2 resolution;

const float PI = 3.1415926535897932384626433832795;
const float r = 225.0;
vec4 color = vec4(0., 0., 0., 0.);

// https://www.youtube.com/watch?v=D_Zq6q1gnvw&t=158s
void line(vec2 a, vec2 b, vec2 p) {
  vec2 ba = b - a;
  vec2 pa = p - a;
  //float k = clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0);
  float k = dot(ba, pa) / dot(ba, ba);
  float d = length(pa - ba * k);
  if (d < 3.) {
    color = vec4(0.3, 0.6, 1.0, 1.0);
  }
}

mat3 translate(vec2 p) {
  return mat3(1.0,0.0,0.0,0.0,1.0,0.0,p.x,p.y,1.0);
}

mat3 scale(vec2 s, vec2 p) {
  return translate(p) * mat3(s.x,0.0,0.0,0.0,s.y,0.0,0.0,0.0,1.0) * translate(-p);
}

vec2 project(vec2 p, mat3 m) {
  return (inverse(m) * vec3(p, 1.)).xy;
}

void darken() {
  color *= vec4(vec3(0.7), 1.);
}

bool transparent(vec2 p) {
  return image.eval(p).a < 1.;
}

vec4 main(float2 xy) {
  color = image.eval(xy);
  float dx = origin - pointer;
  float x = clamp(resolution.x - dx, 0., resolution.x);
  float d = xy.x - x;
  mat3 transform = mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0);
  if (d > r) {
    color = vec4(0.0, 0.0, 0.0, 0.0);
    if (!transparent(xy)) {
      color.rgb *= pow(clamp((r - d) / r, 0., 1.), .2);
    }
  } else if (d > 0) {
    float theta = asin(d / r);
    float dp = cos(theta);
    vec2 s = vec2((1. + dp * 0.2));
    transform = scale(s, 0.5 * resolution);
    vec2 uv = project(xy, transform);
    float d1 = theta * r;
    float d2 = (PI - theta) * r;
    vec2 p1 = vec2(x + d1, uv.y);
    vec2 p2 = vec2(x + d2, uv.y);
    color = image.eval(!transparent(p2) ? p2 : vec2(x + d1, xy.y));
    if (!transparent(p2)) {
      darken();
    }
    color.rgb *= pow(clamp((r - d) / r, 0., 1.), .2);
  } else {
    float theta = asin(abs(d) / r);
    float dp = cos(theta);
    vec2 s = vec2((1. + dp * 0.2));
    transform = scale(s, 0.5 * resolution);
    vec2 uv = project(xy, transform);
    vec2 p = vec2(x + abs(d) + PI * r, uv.y);
    color = image.eval(!transparent(p) ? p : xy);
    if (!transparent(p)) {
      darken();
    }
  }
  return color;
}`)!;

export interface Project {
  id: string;
  title: string;
  size: string;
  duration: string;
  picture: number;
  color: string;
}

interface ProjectProps {
  active: boolean;
  project: Project;
  font: SkFont;
  smallFont: SkFont;
  uniforms: SkiaValue<{ resolution: Vector; pointer: number; origin: number }>;
}

export const Project = ({
  active,
  uniforms,
  font,
  smallFont,
  project: { picture, title, color, size, duration },
}: ProjectProps) => {
  const image = useImage(picture);
  const paint = usePaintRef();
  if (!image) {
    return null;
  }
  return (
    <>
      <Paint ref={paint}>
        <RuntimeShader source={source} uniforms={uniforms} />
      </Paint>
      <RoundedRect rect={project} color="red" />
      <Group
        transform={[
          { translateX: 290 },
          { translateY: (150 - 24 * 1.5) / 2 },
          { scale: 1.5 },
        ]}
      >
        <Trash />
      </Group>
      <Group transform={[{ scale: 1 / PixelRatio.get() }]}>
        <Group
          clip={project}
          layer={active ? paint : undefined}
          transform={[{ scale: PixelRatio.get() }]}
        >
          <Fill>
            <ImageShader image={image} rect={project.rect} fit="cover" />
          </Fill>
          <Rect rect={rect(0, 120, width - 32, 30)} color={color} />
          <Labels size={size} font={smallFont} duration={duration} />
          <Text x={32} y={150 - 40} text={title} color="white" font={font} />
        </Group>
      </Group>
    </>
  );
};
