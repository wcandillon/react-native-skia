import { Skia } from "@shopify/react-native-skia";

type Value = string | number;
type Values = Value[];

export const glsl = (source: TemplateStringsArray, ...values: Values) => {
  const processed = source.flatMap((s, i) => [s, values[i]]).filter(Boolean);
  return processed.join("");
};

export const frag = (source: TemplateStringsArray, ...values: Values) => {
  const code = glsl(source, ...values);
  const rt = Skia.RuntimeEffect.Make(code);
  if (rt === null) {
    throw new Error("Couln't Compile Shader");
  }
  return rt;
};
