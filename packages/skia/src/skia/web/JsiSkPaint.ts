import type { Blender, CanvasKit, Paint } from "canvaskit-wasm";

import type {
  StrokeJoin,
  BlendMode,
  SkColor,
  SkColorFilter,
  SkImageFilter,
  SkPaint,
  SkShader,
  StrokeCap,
  PaintStyle,
  SkMaskFilter,
  SkPathEffect,
} from "../types";

import { HostObject, getEnum } from "./Host";
import { JsiSkColorFilter } from "./JsiSkColorFilter";
import { JsiSkImageFilter } from "./JsiSkImageFilter";
import { JsiSkMaskFilter } from "./JsiSkMaskFilter";
import { JsiSkPathEffect } from "./JsiSkPathEffect";
import { JsiSkShader } from "./JsiSkShader";

// Custom blend mode values (must match TypeScript BlendMode enum)
const kBlendModePlusDarker = 1001;
const kBlendModePlusLighter = 1002;

// SkSL for PlusDarker blend mode
// Formula: rc = max(0, ra - ((da - dst) + (sa - src))), ra = min(1, sa + da)
// On premultiplied colors, so a translucent source darkens proportionally
const plusDarkerSkSL = `
    vec4 main(vec4 src, vec4 dst) {
        float outAlpha = min(1.0, src.a + dst.a);
        vec3 c = max(vec3(0.0), outAlpha - ((dst.a - dst.rgb) + (src.a - src.rgb)));
        return vec4(c, outAlpha);
    }
`;

// Cache for custom blenders per CanvasKit instance
// Using WeakMap ensures blenders are cleaned up when CanvasKit instance is garbage collected
interface BlenderCache {
  plusDarker: Blender | null;
}
const blenderCache = new WeakMap<CanvasKit, BlenderCache>();

const getBlenderCache = (ck: CanvasKit): BlenderCache => {
  let cache = blenderCache.get(ck);
  if (!cache) {
    cache = { plusDarker: null };
    blenderCache.set(ck, cache);
  }
  return cache;
};

export class JsiSkPaint extends HostObject<Paint, "Paint"> implements SkPaint {
  constructor(CanvasKit: CanvasKit, ref: Paint) {
    super(CanvasKit, ref, "Paint");
  }

  copy() {
    return new JsiSkPaint(this.CanvasKit, this.ref.copy());
  }

  assign(paint: JsiSkPaint) {
    const previous = this.ref;
    this.ref = paint.ref.copy();
    // The replaced ref is a WASM object the GC will not reclaim.
    previous.delete();
  }

  reset() {
    const previous = this.ref;
    this.ref = new this.CanvasKit.Paint();
    previous.delete();
  }

  getAlphaf() {
    return this.getColor()[3];
  }

  getColor() {
    return this.ref.getColor();
  }

  getStrokeCap() {
    return this.ref.getStrokeCap().value;
  }

  getStrokeJoin() {
    return this.ref.getStrokeJoin().value;
  }

  getStrokeMiter() {
    return this.ref.getStrokeMiter();
  }

  getStrokeWidth() {
    return this.ref.getStrokeWidth();
  }

  setAlphaf(alpha: number) {
    this.ref.setAlphaf(alpha);
  }

  setAntiAlias(aa: boolean) {
    this.ref.setAntiAlias(aa);
  }

  setDither(dither: boolean) {
    this.ref.setDither(dither);
  }

  setBlendMode(blendMode: BlendMode) {
    if (blendMode === kBlendModePlusDarker) {
      // Use custom PlusDarker blender via SkRuntimeEffect
      const cache = getBlenderCache(this.CanvasKit);
      if (!cache.plusDarker) {
        const effect =
          this.CanvasKit.RuntimeEffect.MakeForBlender(plusDarkerSkSL);
        if (effect) {
          cache.plusDarker = effect.makeBlender([]);
        }
      }
      if (cache.plusDarker) {
        this.ref.setBlender(cache.plusDarker);
      }
    } else if (blendMode === kBlendModePlusLighter) {
      // CSS plus-lighter: min(1, dst + src) on every premultiplied channel,
      // alpha included, which is BlendMode.Plus
      this.ref.setBlendMode(this.CanvasKit.BlendMode.Plus);
    } else {
      this.ref.setBlendMode(getEnum(this.CanvasKit, "BlendMode", blendMode));
    }
  }

  setColor(color: SkColor) {
    this.ref.setColor(color);
  }

  setColorFilter(filter: SkColorFilter | null) {
    this.ref.setColorFilter(filter ? JsiSkColorFilter.fromValue(filter) : null);
  }

  setImageFilter(filter: SkImageFilter | null) {
    this.ref.setImageFilter(filter ? JsiSkImageFilter.fromValue(filter) : null);
  }

  setMaskFilter(filter: SkMaskFilter | null) {
    this.ref.setMaskFilter(filter ? JsiSkMaskFilter.fromValue(filter) : null);
  }

  setPathEffect(effect: SkPathEffect | null) {
    this.ref.setPathEffect(effect ? JsiSkPathEffect.fromValue(effect) : null);
  }

  setShader(shader: SkShader | null) {
    this.ref.setShader(shader ? JsiSkShader.fromValue(shader) : null);
  }

  setStrokeCap(cap: StrokeCap) {
    this.ref.setStrokeCap(getEnum(this.CanvasKit, "StrokeCap", cap));
  }

  setStrokeJoin(join: StrokeJoin) {
    this.ref.setStrokeJoin(getEnum(this.CanvasKit, "StrokeJoin", join));
  }

  setStrokeMiter(limit: number) {
    this.ref.setStrokeMiter(limit);
  }

  setStrokeWidth(width: number) {
    this.ref.setStrokeWidth(width);
  }

  setStyle(style: PaintStyle) {
    this.ref.setStyle({ value: style });
  }
}
