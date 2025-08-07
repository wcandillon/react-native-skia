import type { SkShader, SkSize } from "@shopify/react-native-skia";
import {
  BlendMode,
  ColorChannel,
  Skia,
  TileMode,
} from "@shopify/react-native-skia";
import React from "react";

import { Scene } from "./components/Scene";

const debug = true;

export const DisplacementMap1 = () => {
  const filter = (baseShader: SkShader, size: SkSize) => {
    "worklet";

    const shader = Skia.ImageFilter.MakeShader(baseShader);
    const sigma = 2;
    const blendFilter = Skia.ImageFilter.MakeBlend(BlendMode.SrcIn, shader);

    const whiteTint = Skia.ImageFilter.MakeShader(
      Skia.Shader.MakeColor(Skia.Color("rgba(255, 255, 255, 0.4)"))
    );

    const displacementMap = Skia.ImageFilter.MakeDisplacementMap(
      ColorChannel.R,
      ColorChannel.G,
      40,
      shader
    );

    const tint = Skia.ImageFilter.MakeBlend(
      BlendMode.SrcOver,
      displacementMap,
      whiteTint
    );

    let result = Skia.ImageFilter.MakeCompose(
      blendFilter,
      Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, tint)
    );
    if (debug) {
      const matrix = Skia.Matrix();
      matrix.translate(0, -size.height / 2 + 200);
      const transform = Skia.ImageFilter.MakeMatrixTransform(
        matrix,
        undefined,
        undefined,
        shader
      );
      result = Skia.ImageFilter.MakeBlend(BlendMode.SrcOver, result, transform);
    }
    return result;
  };
  return <Scene filter={filter} />;
};
