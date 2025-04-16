import { frag } from "../../../components/ShaderLib";

export type Transition = string;

export const transition = (t: Transition) => {
  return frag`
  uniform shader image1;
  uniform shader image2;

  uniform float progress;
  uniform float2 resolution;
  
  half4 getFromColor(float2 uv) {
    return image1.eval(uv * resolution);
  }
  
  half4 getToColor(float2 uv) {
    return image2.eval(uv * resolution);
  }
  
  ${t}

  half4 main(vec2 xy) {
    vec2 uv = xy / resolution;
    return transition(uv);
  }
  `;
};
