import type {
  CanvasKit,
  ImageInfo as CKImageInfo,
  Image,
} from "canvaskit-wasm";

import type {
  FilterMode,
  MipmapMode,
  SkImage,
  SkMatrix,
  SkShader,
  TileMode,
  ImageFormat,
  ImageInfo,
} from "../types";

import { getEnum, HostObject } from "./Host";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkShader } from "./JsiSkShader";

// https://github.com/google/skia/blob/1f193df9b393d50da39570dab77a0bb5d28ec8ef/modules/canvaskit/htmlcanvas/util.js
export const toBase64String = (bytes: Uint8Array) => {
  if (typeof Buffer !== "undefined") {
    // Are we on node?
    return Buffer.from(bytes).toString("base64");
  } else {
    // From https://stackoverflow.com/a/25644409
    // because the naive solution of
    //     btoa(String.fromCharCode.apply(null, bytes));
    // would occasionally throw "Maximum call stack size exceeded"
    var CHUNK_SIZE = 0x8000; //arbitrary number
    var index = 0;
    var { length } = bytes;
    var result = "";
    var slice;
    while (index < length) {
      slice = bytes.slice(index, Math.min(index + CHUNK_SIZE, length));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result += String.fromCharCode.apply(null, slice as any);
      index += CHUNK_SIZE;
    }
    return btoa(result);
  }
};

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

  getImageInfo(): ImageInfo {
    const info = this.ref.getImageInfo();
    return {
      width: info.width,
      height: info.height,
      colorType: info.colorType.value,
      alphaType: info.alphaType.value,
    };
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
        getEnum(this.CanvasKit, "TileMode", tx),
        getEnum(this.CanvasKit, "TileMode", ty),
        getEnum(this.CanvasKit, "FilterMode", fm),
        getEnum(this.CanvasKit, "MipmapMode", mm),
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
        getEnum(this.CanvasKit, "TileMode", tx),
        getEnum(this.CanvasKit, "TileMode", ty),
        B,
        C,
        localMatrix ? JsiSkMatrix.fromValue(localMatrix) : undefined
      )
    );
  }

  encodeToBytes(fmt?: ImageFormat, quality?: number) {
    let result: Uint8Array | null;
    if (fmt && quality) {
      result = this.ref.encodeToBytes(
        getEnum(this.CanvasKit, "ImageFormat", fmt),
        quality
      );
    } else if (fmt) {
      result = this.ref.encodeToBytes(
        getEnum(this.CanvasKit, "ImageFormat", fmt)
      );
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
    return toBase64String(bytes);
  }

  // TODO: this is leaking on Web
  // Add signature with allocated buffer
  readPixels(srcX?: number, srcY?: number, imageInfo?: ImageInfo) {
    const info = this.getImageInfo();
    const pxInfo: CKImageInfo = {
      colorSpace: this.CanvasKit.ColorSpace.SRGB,
      width: imageInfo?.width ?? info.width,
      height: imageInfo?.height ?? info.height,
      alphaType: getEnum(
        this.CanvasKit,
        "AlphaType",
        (imageInfo ?? info).alphaType
      ),
      colorType: getEnum(
        this.CanvasKit,
        "ColorType",
        (imageInfo ?? info).colorType
      ),
    };
    return this.ref.readPixels(srcX ?? 0, srcY ?? 0, pxInfo);
  }

  dispose = () => {
    this.ref.delete();
  };

  makeNonTextureImage(): SkImage {
    // if the image is already a non-texture image, this is a no-op
    const partialInfo = this.ref.getImageInfo();
    const colorSpace = this.ref.getColorSpace();
    const info = {
      ...partialInfo,
      colorSpace,
    };
    const pixels = this.ref.readPixels(0, 0, info) as Uint8Array | null;
    if (!pixels) {
      throw new Error("Could not read pixels from image");
    }
    const img = this.CanvasKit.MakeImage(info, pixels, info.width * 4);
    if (!img) {
      throw new Error("Could not create image from bytes");
    }
    return new JsiSkImage(this.CanvasKit, img);
  }

  getNativeTextureUnstable(): unknown {
    console.warn("getBackendTexture is not implemented on Web");
    return null;
  }
}
