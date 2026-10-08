import type { SkShader } from "react-native-skia";
import { BlendMode, Skia, TileMode } from "react-native-skia";
import React from "react";

import { Scene } from "./components/Scene";

export const LiquidShape = () => {
  const filter = (baseShader: SkShader) => {
    "worklet";

    const shader = Skia.ImageFilter.MakeShader(baseShader);
    const sigma = 12;
    const blur = Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp);
    const blendFilter = Skia.ImageFilter.MakeBlend(BlendMode.SrcIn, shader);

    const whiteTint = Skia.Shader.MakeColor(
      Skia.Color("rgba(255, 255, 255, 0.4)")
    );

    return Skia.ImageFilter.MakeCompose(
      blendFilter,
      Skia.ImageFilter.MakeBlend(
        BlendMode.SrcOver,
        blur,
        Skia.ImageFilter.MakeShader(whiteTint)
      )
    );
  };
  return <Scene filter={filter} />;
};
