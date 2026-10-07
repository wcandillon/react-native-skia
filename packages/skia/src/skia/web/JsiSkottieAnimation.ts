import type {
  CanvasKit,
  ManagedSkottieAnimation,
  SlottableTextProperty as CKSlottableTextProperty,
} from "canvaskit-wasm";

import type {
  SkSkottieAnimation,
  SlotInfo,
  SlottableTextProperty,
} from "../types/Skottie";
import type { SkColor, SkPoint, SkRect } from "../types";

import { HostObject } from "./Host";
import type { JsiSkCanvas } from "./JsiSkCanvas";
import { JsiSkTypeface } from "./JsiSkTypeface";
import { Color } from "./JsiSkColor";
import { JsiSkRect } from "./JsiSkRect";

export class JsiSkottieAnimation
  extends HostObject<ManagedSkottieAnimation, "SkottieAnimation">
  implements SkSkottieAnimation
{
  constructor(CanvasKit: CanvasKit, ref: ManagedSkottieAnimation) {
    super(CanvasKit, ref, "SkottieAnimation");
  }
  getOpacityProps() {
    return this.ref.getOpacityProps();
  }
  getTextProps() {
    return this.ref.getTextProps();
  }
  getColorProps() {
    return this.ref
      .getColorProps()
      .map(({ key, value }) => ({ key, value: Color(value) }));
  }
  getTransformProps() {
    return this.ref.getTransformProps().map(({ key, value }) => ({
      key,
      value: {
        anchor: { x: value.anchor[0], y: value.anchor[1] },
        position: { x: value.position[0], y: value.position[1] },
        scale: { x: value.scale[0], y: value.scale[1] },
        rotation: value.rotation,
        skew: value.skew,
        skewAxis: value.skew_axis,
      },
    }));
  }
  setColor(key: string, color: SkColor) {
    return this.ref.setColor(key, color);
  }
  setText(key: string, text: string, size: number) {
    return this.ref.setText(key, text, size);
  }
  setOpacity(key: string, opacity: number) {
    return this.ref.setOpacity(key, opacity);
  }
  setTransform(
    key: string,
    anchor: SkPoint,
    position: SkPoint,
    scale: SkPoint,
    rotation: number,
    skew: number,
    skewAxis: number
  ) {
    const a = Float32Array.of(anchor.x, anchor.y);
    const p = Float32Array.of(position.x, position.y);
    const s = Float32Array.of(scale.x, scale.y);
    return this.ref.setTransform(key, a, p, s, rotation, skew, skewAxis);
  }

  getSlotInfo(): SlotInfo {
    return this.ref.getSlotInfo();
  }
  setColorSlot(key: string, color: SkColor) {
    return this.ref.setColorSlot(key, color);
  }
  setScalarSlot(key: string, scalar: number) {
    return this.ref.setScalarSlot(key, scalar);
  }
  setVec2Slot(key: string, vec2: SkPoint) {
    return this.ref.setVec2Slot(key, Float32Array.of(vec2.x, vec2.y));
  }
  setTextSlot(key: string, text: SlottableTextProperty): boolean {
    const txt: CKSlottableTextProperty = {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      typeface:
        text.typeface && text.typeface instanceof JsiSkTypeface
          ? text.typeface.ref
          : null,
      text: text.text ?? "",
      textSize: text.textSize ?? 0,
      minTextSize: text.minTextSize ?? 0,
      maxTextSize: text.maxTextSize ?? Number.MAX_VALUE,
      strokeWidth: text.strokeWidth ?? 0,
      lineHeight: text.lineHeight ?? 0,
      lineShift: text.lineShift ?? 0,
      ascent: text.ascent,
      maxLines: text.maxLines,
      // TODO: implement
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      horizAlign: this.CanvasKit.TextAlign.Left,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      vertAlign: this.CanvasKit.VerticalTextAlign.Top,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      strokeJoin: this.CanvasKit.StrokeJoin.Miter,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      direction: this.CanvasKit.TextDirection.LTR,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      linebreak: this.CanvasKit.LineBreakType.HardLineBreak,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      resize: this.CanvasKit.ResizePolicy.None,
      boundingBox: text.boundingBox
        ? this.CanvasKit.XYWHRect(
            text.boundingBox.x,
            text.boundingBox.y,
            text.boundingBox.width,
            text.boundingBox.height
          )
        : [0, 0, 0, 0],
      fillColor: text.fillColor
        ? Color(text.fillColor)
        : this.CanvasKit.TRANSPARENT,
      strokeColor: text.strokeColor
        ? Color(text.strokeColor)
        : this.CanvasKit.TRANSPARENT,
    };
    return this.ref.setTextSlot(key, txt);
  }
  setImageSlot(key: string, assetName: string) {
    return this.ref.setImageSlot(key, assetName);
  }
  getColorSlot(key: string): SkColor | null {
    const color = this.ref.getColorSlot(key);
    return color;
  }
  getScalarSlot(key: string) {
    return this.ref.getScalarSlot(key);
  }
  getVec2Slot(key: string): SkPoint | null {
    const vec2 = this.ref.getVec2Slot(key);
    if (!vec2) {
      return null;
    }
    return { x: vec2[0], y: vec2[1] };
  }
  getTextSlot(key: string): SlottableTextProperty | null {
    const result = this.ref.getTextSlot(key);
    const textSlot: SlottableTextProperty = {};
    if (result) {
      if (result.typeface) {
        textSlot.typeface = new JsiSkTypeface(this.CanvasKit, result.typeface);
      }
      if (result.text) {
        textSlot.text = result.text;
      }
      if (result.textSize !== undefined) {
        textSlot.textSize = result.textSize;
      }
      if (result.minTextSize !== undefined) {
        textSlot.minTextSize = result.minTextSize;
      }
      if (result.maxTextSize !== undefined) {
        textSlot.maxTextSize = result.maxTextSize;
      }
      if (result.strokeWidth !== undefined) {
        textSlot.strokeWidth = result.strokeWidth;
      }
      if (result.lineHeight !== undefined) {
        textSlot.lineHeight = result.lineHeight;
      }
      if (result.lineShift !== undefined) {
        textSlot.lineShift = result.lineShift;
      }
      if (result.ascent !== undefined) {
        textSlot.ascent = result.ascent;
      }
      if (result.maxLines !== undefined) {
        textSlot.maxLines = result.maxLines;
      }
      // if (result.horizAlign) {
      //   textSlot.horizAlign = result.horizAlign;
      // }
      // if (result.vertAlign) {
      //   textSlot.vertAlign = result.vertAlign;
      // }
      // if (result.strokeJoin) {
      //   textSlot.strokeJoin = result.strokeJoin;
      // }
      // if (result.direction) {
      //   textSlot.direction = result.direction;
      // }
      // if (result.linebreak) {
      //   textSlot.linebreak = result.linebreak;
      // }
      // if (result.resize) {
      //   textSlot.resize = result.resize;
      // }
      // if (result.boundingBox) {
      //   textSlot.boundingBox = new JsiSkRect(
      //     this.CanvasKit,
      //     result.boundingBox
      //   );
      // }
      // if (result.fillColor) {
      //   textSlot.fillColor = Color(result.fillColor);
      // }
      // if (result.strokeColor) {
      //   textSlot.strokeColor = Color(result.strokeColor);
      // }
    }
    return textSlot;
  }

  duration() {
    return this.ref.duration();
  }
  fps() {
    return this.ref.fps();
  }
  render(canvas: JsiSkCanvas, dstRect?: SkRect) {
    const [width, height] = this.ref.size();
    this.ref.render(
      canvas.ref,
      dstRect && dstRect instanceof JsiSkRect
        ? dstRect.ref
        : Float32Array.of(0, 0, width, height)
    );
  }
  seekFrame(frame: number, damageRect?: JsiSkRect) {
    const result = this.ref.seekFrame(frame);
    if (damageRect && damageRect instanceof JsiSkRect) {
      damageRect.ref[0] = result[0];
      damageRect.ref[1] = result[1];
      damageRect.ref[2] = result[2];
      damageRect.ref[3] = result[3];
    }
  }
  size() {
    const [width, height] = this.ref.size();
    return { width, height };
  }
  version() {
    return this.ref.version();
  }
}
