import { glsl } from "../../../components/ShaderLib";

import type { Transition } from "./Base";

export const swap: Transition = glsl`
const float reflection1 = 0.4;
const float perspective = 0.2;
const float depth = 3.0;
  
const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);
  
bool inBounds1 (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}
  
vec2 project1(vec2 p) {
  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);
}

vec4 bgColor(vec2 p, vec2 pfr, vec2 pto) {
  vec4 c = black;
  pfr = project1(pfr);
  if (inBounds1(pfr)) {
    c += mix(black, getFromColor(pfr), reflection1 * mix(1.0, 0.0, pfr.y));
  }
  pto = project1(pto);
  if (inBounds1(pto)) {
    c += mix(black, getToColor(pto), reflection1 * mix(1.0, 0.0, pto.y));
  }
  return c;
}

vec4 transition(vec2 p) {
  vec2 pfr, pto = vec2(-1.);
 
  float size = mix(1.0, depth, progress);
  float persp = perspective * progress;
  pfr = (p + vec2(-0.0, -0.5)) * vec2(size/(1.0-perspective*progress), size/(1.0-size*persp*p.x)) + vec2(0.0, 0.5);
 
  size = mix(1.0, depth, 1.-progress);
  persp = perspective * (1.-progress);
  pto = (p + vec2(-1.0, -0.5)) * vec2(size/(1.0-perspective*(1.0-progress)), size/(1.0-size*persp*(0.5-p.x))) + vec2(1.0, 0.5);

  if (progress < 0.5) {
    if (inBounds1(pfr)) {
      return getFromColor(pfr);
    }
    if (inBounds1(pto)) {
      return getToColor(pto);
    }  
  }
  if (inBounds1(pto)) {
    return getToColor(pto);
  }
  if (inBounds1(pfr)) {
    return getFromColor(pfr);
  }
  return bgColor(p, pfr, pto);
}
`;
