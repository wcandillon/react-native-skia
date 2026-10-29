import React from "react";

import { processResult } from "../../../__tests__/setup";
import {
  BlendColor,
  Image,
  ImageShader,
  Mask,
  Rect,
  Shader,
} from "../../components";
import { height, drawOnNode, width, loadImage, importSkia } from "../setup";

describe("Test blend modes", () => {
  it("Should nicely blend the product color to the image", async () => {
    const image = loadImage("skia/__tests__/assets/product.png");
    const rect = { x: 0, y: 0, width, height };
    const surface = await drawOnNode(
      <Mask mask={<Image image={image} rect={rect} />}>
        <Image image={image} rect={rect}>
          <BlendColor color="lightgreen" mode="hue" />
        </Image>
      </Mask>
    );
    processResult(surface, "snapshots/demos/product.png");
  });
  it("Should nicely blend the product color to the image using a runtime effect", async () => {
    const { Skia } = importSkia();
    const image = loadImage("skia/__tests__/assets/product.png");
    const rect = { x: 0, y: 0, width, height };
    const source = Skia.RuntimeEffect.Make(blender)!;
    const surface = await drawOnNode(
      <Rect rect={rect}>
        <Shader
          source={source}
          uniforms={{ src: [144 / 255, 238 / 255, 144 / 255, 1] }}
        >
          <ImageShader image={image} rect={rect} fit="cover" />
        </Shader>
      </Rect>
    );
    processResult(surface, "snapshots/demos/product2.png");
  });
});

// Blend mode shaders
// https://github.com/google/skia/blob/1f193df9b393d50da39570dab77a0bb5d28ec8ef/src/sksl/sksl_gpu.sksl
const blender = `
uniform shader image;
uniform vec4 src;

half3 _guarded_divide(half3 n, half d) {
  return n/(d + 0.00000001);
}

half _guarded_divide(half n, half d) {
  return n/(d + 0.00000001);
}

half3 _blend_set_color_saturation_helper(half3 minMidMax, half sat) {
  if (minMidMax.r < minMidMax.b) {
      return half3(0,
                  _guarded_divide(sat*(minMidMax.g - minMidMax.r), (minMidMax.b - minMidMax.r)),
                  sat);
  } else {
      return half3(0);
  }
}

half _blend_color_saturation(half3 color) {
  return max(max(color.r, color.g), color.b) - min(min(color.r, color.g), color.b);
}

half3 _blend_set_color_saturation(half3 hueLumColor, half3 satColor) {
  half sat = _blend_color_saturation(satColor);
  if (hueLumColor.r <= hueLumColor.g) {
      if (hueLumColor.g <= hueLumColor.b) {
          return _blend_set_color_saturation_helper(hueLumColor.rgb, sat);
      } else if (hueLumColor.r <= hueLumColor.b) {
          return _blend_set_color_saturation_helper(hueLumColor.rbg, sat).rbg;
      } else {
          return _blend_set_color_saturation_helper(hueLumColor.brg, sat).gbr;
      }
  } else if (hueLumColor.r <= hueLumColor.b) {
     return _blend_set_color_saturation_helper(hueLumColor.grb, sat).grb;
  } else if (hueLumColor.g <= hueLumColor.b) {
     return _blend_set_color_saturation_helper(hueLumColor.gbr, sat).brg;
  } else {
     return _blend_set_color_saturation_helper(hueLumColor.bgr, sat).bgr;
  }
}

half _blend_color_luminance(half3 color) { return dot(half3(0.3, 0.59, 0.11), color); }

half3 _blend_set_color_luminance(half3 hueSatColor, half alpha, half3 lumColor) {
  half lum = _blend_color_luminance(lumColor);
  half3 result = lum - _blend_color_luminance(hueSatColor) + hueSatColor;
  half minComp = min(min(result.r, result.g), result.b);
  half maxComp = max(max(result.r, result.g), result.b);
  if (minComp < 0 && lum != minComp) {
      result = lum + (result - lum) * _guarded_divide(lum, (lum - minComp));
  }
  if (maxComp > alpha && maxComp != lum) {
      return lum + _guarded_divide((result - lum) * (alpha - lum), (maxComp - lum));
  } else {
      return result;
  }
}

half4 blend_hue(half4 src, half4 dst) {
  half alpha = dst.a*src.a;
  half3 sda = src.rgb*dst.a;
  half3 dsa = dst.rgb*src.a;
  return half4(_blend_set_color_luminance(_blend_set_color_saturation(sda, dsa), alpha, dsa) +
               dst.rgb - dsa + src.rgb - sda,
               src.a + dst.a - alpha);
}

vec4 main(vec2 xy) {
  vec4 dst = image.eval(xy);
  return blend_hue(src, dst) * dst.a;
}
`;
