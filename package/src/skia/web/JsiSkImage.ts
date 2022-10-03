/*global btoa, atob*/
import type { CanvasKit, Image } from "canvaskit-wasm";

import type {
  ImageFormat,
  FilterMode,
  MipmapMode,
  SkImage,
  SkMatrix,
  SkShader,
  TileMode,
} from "../types";

import { ckEnum, HostObject } from "./Host";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkShader } from "./JsiSkShader";

export class JsiSkImage extends HostObject<Image, "Image"> implements SkImage {
  constructor(CanvasKit: CanvasKit, ref: Image) {
    super(CanvasKit, ref, "Image");
  }

  height() {
    return this.ref.height();
  }

  width() {
    return this.ref.width();
  }

  makeShaderOptions(
    tx: TileMode,
    ty: TileMode,
    fm: FilterMode,
    mm: MipmapMode,
    localMatrix?: SkMatrix
  ): SkShader {
    return new JsiSkShader(
      this.CanvasKit,
      this.ref.makeShaderOptions(
        ckEnum(tx),
        ckEnum(ty),
        ckEnum(fm),
        ckEnum(mm),
        localMatrix ? JsiSkMatrix.fromValue(localMatrix) : undefined
      )
    );
  }

  makeShaderCubic(
    tx: TileMode,
    ty: TileMode,
    B: number,
    C: number,
    localMatrix?: SkMatrix
  ): SkShader {
    return new JsiSkShader(
      this.CanvasKit,
      this.ref.makeShaderCubic(
        ckEnum(tx),
        ckEnum(ty),
        B,
        C,
        localMatrix ? JsiSkMatrix.fromValue(localMatrix) : undefined
      )
    );
  }

  encodeToBytes(fmt?: ImageFormat, quality?: number) {
    let result: Uint8Array | null;
    if (fmt && quality) {
      result = this.ref.encodeToBytes(ckEnum(fmt), quality);
    } else if (fmt) {
      result = this.ref.encodeToBytes(ckEnum(fmt));
    } else {
      result = this.ref.encodeToBytes();
    }
    if (!result) {
      throw new Error("encodeToBytes failed");
    }
    return result;
  }

  encodeToBase64(fmt?: ImageFormat, quality?: number) {
    const bytes = this.encodeToBytes(fmt, quality);
    return btoa(String.fromCharCode(...bytes));
  }
}
