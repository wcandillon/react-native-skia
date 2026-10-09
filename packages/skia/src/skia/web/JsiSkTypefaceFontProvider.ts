import type {
  CanvasKit,
  FontStyle as CanvasKitFontStyle,
  TypefaceFontProvider,
} from "canvaskit-wasm";

import type { SkTypefaceFontProvider } from "../types/Paragraph/TypefaceFontProvider";
import type { FontStyle, SkTypeface } from "../types";
import { FontSlant, FontWeight, FontWidth } from "../types";

import { HostObject } from "./Host";
import { JsiSkTypeface } from "./JsiSkTypeface";

export class JsiSkTypefaceFontProvider
  extends HostObject<TypefaceFontProvider, "FontMgr">
  implements SkTypefaceFontProvider
{
  constructor(CanvasKit: CanvasKit, ref: TypefaceFontProvider) {
    super(CanvasKit, ref, "FontMgr");
  }

  matchFamilyStyle(name: string, style: FontStyle): SkTypeface {
    if (!name || !style) {
      throw new Error("matchFamilyStyle requires a name and a style");
    }

    const fontStyle = {
      weight: style.weight ?? FontWeight.Normal,
      width: style.width ?? FontWidth.Normal,
      slant: style.slant ?? FontSlant.Upright,
    } as unknown as CanvasKitFontStyle;

    const typeface = this.ref.matchFamilyStyle(name, fontStyle);

    if (!typeface) {
      throw new Error(`Could not find font family ${name}`);
    }

    return new JsiSkTypeface(this.CanvasKit, typeface);
  }
  countFamilies() {
    return this.ref.countFamilies();
  }
  getFamilyName(index: number) {
    return this.ref.getFamilyName(index);
  }
  registerFont(typeface: SkTypeface, familyName: string) {
    const strLen = lengthBytesUTF8(familyName) + 1;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const strPtr = this.CanvasKit._malloc(strLen);
    stringToUTF8(this.CanvasKit, familyName, strPtr, strLen);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.ref._registerFont(typeface.ref, strPtr);
  }
}

const lengthBytesUTF8 = (str: string) => {
  // TextEncoder will give us the byte length in UTF8 form
  const encoder = new TextEncoder();
  const utf8 = encoder.encode(str);
  return utf8.length;
};

const stringToUTF8 = (
  CanvasKit: CanvasKit,
  str: string,
  outPtr: number,
  maxBytesToWrite: number
) => {
  // TextEncoder will give us the byte array in UTF8 form
  const encoder = new TextEncoder();
  const utf8 = encoder.encode(str);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const heap: Int8Array = CanvasKit.HEAPU8;

  // Check if there's enough space
  if (utf8.length > maxBytesToWrite) {
    throw new Error("Not enough space to write UTF8 encoded string");
  }

  // Copy the bytes
  for (let i = 0; i < utf8.length; i++) {
    heap[outPtr + i] = utf8[i];
  }

  // Null terminate
  if (utf8.length < maxBytesToWrite) {
    heap[outPtr + utf8.length] = 0;
  }
};
