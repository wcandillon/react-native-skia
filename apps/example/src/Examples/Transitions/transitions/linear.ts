import { glsl } from "../../../components/ShaderLib";

import type { Transition } from "./Base";

export const linear: Transition = glsl`
vec4 transition(vec2 uv) {
  return mix(
    getFromColor(uv),
    getToColor(uv),
    progress
  );
}
`;
