import type { CanvasKit, ImageFilter } from "canvaskit-wasm";

import type {
  ColorChannel,
  ImageFilterFactory,
  SkColor,
  SkColorFilter,
  SkImageFilter,
  BlendMode,
  SkRect,
  SkRuntimeShaderBuilder,
  SkShader,
  TileMode,
} from "../types";

import { Host, NotImplementedOnRNWeb, ckEnum } from "./Host";
import { JsiSkImageFilter } from "./JsiSkImageFilter";
import { JsiSkColorFilter } from "./JsiSkColorFilter";

export class JsiSkImageFilterFactory
  extends Host
  implements ImageFilterFactory
{
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeOffset(dx: number, dy: number, input: SkImageFilter | null) {
    const inputFilter =
      input === null ? null : JsiSkImageFilter.fromValue<ImageFilter>(input);
    const filter = this.CanvasKit.ImageFilter.MakeOffset(dx, dy, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeDisplacementMap(
    channelX: ColorChannel,
    channelY: ColorChannel,
    scale: number,
    in1: SkImageFilter,
    input: SkImageFilter | null
  ): SkImageFilter {
    const inputFilter =
      input === null ? null : JsiSkImageFilter.fromValue<ImageFilter>(input);
    const filter = this.CanvasKit.ImageFilter.MakeDisplacementMap(
      ckEnum(channelX),
      ckEnum(channelY),
      scale,
      JsiSkImageFilter.fromValue(in1),
      inputFilter
    );
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeShader(shader: SkShader, _input: SkImageFilter | null): SkImageFilter {
    const filter = this.CanvasKit.ImageFilter.MakeShader(
      JsiSkImageFilter.fromValue(shader)
    );
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeBlur(
    sigmaX: number,
    sigmaY: number,
    mode: TileMode,
    input: SkImageFilter | null
  ) {
    return new JsiSkImageFilter(
      this.CanvasKit,
      this.CanvasKit.ImageFilter.MakeBlur(
        sigmaX,
        sigmaY,
        ckEnum(mode),
        input === null ? null : JsiSkImageFilter.fromValue(input)
      )
    );
  }

  MakeColorFilter(cf: SkColorFilter, input: SkImageFilter | null) {
    return new JsiSkImageFilter(
      this.CanvasKit,
      this.CanvasKit.ImageFilter.MakeColorFilter(
        JsiSkColorFilter.fromValue(cf),
        input === null ? null : JsiSkImageFilter.fromValue(input)
      )
    );
  }

  MakeCompose(outer: SkImageFilter | null, inner: SkImageFilter | null) {
    return new JsiSkImageFilter(
      this.CanvasKit,
      this.CanvasKit.ImageFilter.MakeCompose(
        outer === null ? null : JsiSkImageFilter.fromValue(outer),
        inner === null ? null : JsiSkImageFilter.fromValue(inner)
      )
    );
  }

  MakeDropShadow(
    dx: number,
    dy: number,
    sigmaX: number,
    sigmaY: number,
    color: SkColor,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ): SkImageFilter {
    const inputFilter =
      input === null ? null : JsiSkImageFilter.fromValue<ImageFilter>(input);
    if (cropRect) {
      throw new NotImplementedOnRNWeb(
        "The cropRect argument is not yet supported on React Native Web."
      );
    }
    const filter = this.CanvasKit.ImageFilter.MakeDropShadow(
      dx,
      dy,
      sigmaX,
      sigmaY,
      color,
      inputFilter
    );
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeDropShadowOnly(
    dx: number,
    dy: number,
    sigmaX: number,
    sigmaY: number,
    color: SkColor,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ): SkImageFilter {
    const inputFilter =
      input === null ? null : JsiSkImageFilter.fromValue<ImageFilter>(input);
    if (cropRect) {
      throw new NotImplementedOnRNWeb(
        "The cropRect argument is not yet supported on React Native Web."
      );
    }
    const filter = this.CanvasKit.ImageFilter.MakeDropShadowOnly(
      dx,
      dy,
      sigmaX,
      sigmaY,
      color,
      inputFilter
    );
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeErode(
    rx: number,
    ry: number,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ): SkImageFilter {
    const inputFilter =
      input === null ? null : JsiSkImageFilter.fromValue<ImageFilter>(input);
    if (cropRect) {
      throw new NotImplementedOnRNWeb(
        "The cropRect argument is not yet supported on React Native Web."
      );
    }
    const filter = this.CanvasKit.ImageFilter.MakeErode(rx, ry, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeDilate(
    rx: number,
    ry: number,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ): SkImageFilter {
    const inputFilter =
      input === null ? null : JsiSkImageFilter.fromValue<ImageFilter>(input);
    if (cropRect) {
      throw new NotImplementedOnRNWeb(
        "The cropRect argument is not yet supported on React Native Web."
      );
    }
    const filter = this.CanvasKit.ImageFilter.MakeDilate(rx, ry, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeBlend(
    mode: BlendMode,
    background: SkImageFilter,
    foreground: SkImageFilter | null,
    cropRect?: SkRect
  ): SkImageFilter {
    const inputFilter =
      foreground === null
        ? null
        : JsiSkImageFilter.fromValue<ImageFilter>(foreground);
    if (cropRect) {
      throw new NotImplementedOnRNWeb(
        "The cropRect argument is not yet supported on React Native Web."
      );
    }
    const filter = this.CanvasKit.ImageFilter.MakeBlend(
      ckEnum(mode),
      JsiSkImageFilter.fromValue(background),
      inputFilter
    );
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }

  MakeRuntimeShader(
    _builder: SkRuntimeShaderBuilder,
    _childShaderName: string | null,
    _input: SkImageFilter | null
  ): SkImageFilter {
    throw new NotImplementedOnRNWeb();
  }
}
