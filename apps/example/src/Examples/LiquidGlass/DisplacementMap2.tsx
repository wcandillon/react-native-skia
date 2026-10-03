import type { SkShader } from "react-native-skia";
import { BlendMode, ColorChannel, Skia, TileMode } from "react-native-skia";
import React from "react";

import { Scene } from "./components/Scene";

export const DisplacementMap2 = () => {
  const brightness = 0.25; // 0.0 to 1.0 - higher values = brighter
  const contrast = 0.5; // 0.0 to 1.0 - higher values = more contrast

  const filter = (baseShader: SkShader) => {
    "worklet";

    const shader = Skia.ImageFilter.MakeShader(baseShader);
    const sigma = 4;
    const blendFilter = Skia.ImageFilter.MakeBlend(BlendMode.SrcIn, shader);

    const displacementMap = Skia.ImageFilter.MakeDisplacementMap(
      ColorChannel.R,
      ColorChannel.G,
      40,
      shader
    );

    const brightnessContrast = Skia.ImageFilter.MakeArithmetic(
      contrast, // k1 - contrast multiplier
      brightness, // k2 - brightness additive
      1.0, // k3 - original image strength
      brightness * 0.3, // k4 - overall brightness offset
      true, // enforce premultiplied alpha
      displacementMap // background input
    );

    return Skia.ImageFilter.MakeCompose(
      blendFilter,
      Skia.ImageFilter.MakeBlur(
        sigma,
        sigma,
        TileMode.Clamp,
        brightnessContrast
      )
    );
  };
  return <Scene filter={filter} />;
};
