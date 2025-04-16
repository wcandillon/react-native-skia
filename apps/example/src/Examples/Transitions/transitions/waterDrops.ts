import { glsl } from "../../../components/ShaderLib/Tags";

import type { Transition } from "./Base";

export const waterDrops: Transition = glsl`
const float amplitude = 30;
const float speed = 30;

vec4 transition(vec2 p) {
  vec2 dir = p - vec2(.5);
  float dist = length(dir);

  if (dist > progress) {
    return mix(getFromColor( p), getToColor( p), progress);
  } else {
    vec2 offset = dir * sin(dist * amplitude - progress * speed);
    return mix(getFromColor( p + offset), getToColor( p), progress);
  }
}
`;
