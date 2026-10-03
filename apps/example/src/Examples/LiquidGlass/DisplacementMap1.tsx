import type { SkShader } from "react-native-skia";
import { BlendMode, ColorChannel, Skia, TileMode } from "react-native-skia";
import React from "react";

import { Scene } from "./components/Scene";

export const DisplacementMap1 = () => {
  const filter = (baseShader: SkShader) => {
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

    return Skia.ImageFilter.MakeCompose(
      blendFilter,
      Skia.ImageFilter.MakeBlur(
        sigma,
        sigma,
        TileMode.Clamp,
        Skia.ImageFilter.MakeBlend(
          BlendMode.SrcOver,
          displacementMap,
          whiteTint
        )
      )
    );
  };
  return <Scene filter={filter} />;
};
