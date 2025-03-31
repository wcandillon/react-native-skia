import type { CanvasKit, TypefaceFontProvider } from "canvaskit-wasm";

import type { SkTypefaceFontProvider } from "../types/Paragraph/TypefaceFontProvider";
import type { FontStyle, SkTypeface } from "../types";

import { HostObject, throwNotImplementedOnRNWeb } from "./Host";

export class JsiSkTypefaceFontProvider
  extends HostObject<TypefaceFontProvider, "FontMgr">
  implements SkTypefaceFontProvider
{
  private allocatedPointers: number[] = [];

  constructor(CanvasKit: CanvasKit, ref: TypefaceFontProvider) {
    super(CanvasKit, ref, "FontMgr");
  }

  matchFamilyStyle(_name: string, _style: FontStyle) {
    return throwNotImplementedOnRNWeb<SkTypeface>();
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

  dispose() {
    for (const ptr of this.allocatedPointers) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this.CanvasKit._free(ptr);
    }

    this.ref.delete();
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
