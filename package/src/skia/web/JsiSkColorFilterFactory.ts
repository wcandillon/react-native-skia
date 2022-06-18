import type { CanvasKit } from "canvaskit-wasm";

import type {
  ColorFilterFactory,
  SkColorFilter,
  InputColorMatrix,
  SkColor,
  BlendMode,
} from "../types";

import { ckEnum, Host, toValue, NotImplementedOnRNWeb } from "./Host";
import { JsiSkColorFilter } from "./JsiSkColorFilter";

export class JsiSkColorFilterFactory
  extends Host
  implements ColorFilterFactory
{
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeMatrix(cMatrix: InputColorMatrix) {
    return new JsiSkColorFilter(
      this.CanvasKit,
      this.CanvasKit.ColorFilter.MakeMatrix(cMatrix)
    );
  }

  MakeBlend(color: SkColor, mode: BlendMode) {
    return new JsiSkColorFilter(
      this.CanvasKit,
      this.CanvasKit.ColorFilter.MakeBlend(toValue(color), ckEnum(mode))
    );
  }

  MakeCompose(outer: SkColorFilter, inner: SkColorFilter) {
    return new JsiSkColorFilter(
      this.CanvasKit,
      this.CanvasKit.ColorFilter.MakeCompose(toValue(outer), toValue(inner))
    );
  }

  MakeLerp(t: number, dst: SkColorFilter, src: SkColorFilter) {
    return new JsiSkColorFilter(
      this.CanvasKit,
      this.CanvasKit.ColorFilter.MakeLerp(t, toValue(dst), toValue(src))
    );
  }

  MakeLinearToSRGBGamma() {
    return new JsiSkColorFilter(
      this.CanvasKit,
      this.CanvasKit.ColorFilter.MakeLinearToSRGBGamma()
    );
  }

  MakeSRGBToLinearGamma() {
    return new JsiSkColorFilter(
      this.CanvasKit,
      this.CanvasKit.ColorFilter.MakeSRGBToLinearGamma()
    );
  }

  MakeLumaColorFilter(): SkColorFilter {
    return new JsiSkColorFilter(
      this.CanvasKit,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this.CanvasKit.ColorFilter.MakeLumaColorFilter()
    );
  }
}
