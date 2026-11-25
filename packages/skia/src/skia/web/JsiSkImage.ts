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
  ImageInfo,
} from "../types";
import { ColorType, ImageFormat } from "../types";
import {
  SkiaInternalError,
  SkiaOutOfMemoryError,
  SkiaValidationError,
} from "../types/Errors";

import { getEnum, HostObject } from "./Host";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkShader } from "./JsiSkShader";

// Zeroed pixels of `info`, in the typed array readPixels() resolves to.
export const zeroPixels = (info: ImageInfo): Float32Array | Uint8Array => {
  const count = info.width * info.height;
  switch (info.colorType) {
    case ColorType.RGBA_F32:
      return new Float32Array(count * 4);
    case ColorType.Alpha_8:
    case ColorType.Gray_8:
      return new Uint8Array(count);
    case ColorType.RGB_565:
    case ColorType.ARGB_4444:
      return new Uint8Array(count * 2);
    case ColorType.RGBA_F16Norm:
    case ColorType.RGBA_F16:
    case ColorType.RGB_F16F16F16x:
    case ColorType.BGRA_10101010_XR:
    case ColorType.RGBA_10x6:
      return new Uint8Array(count * 8);
    default:
      return new Uint8Array(count * 4);
  }
};

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

  // CanvasKit encodes and reads back synchronously; the results are
  // promises like on native, where the GPU is asynchronous. Run inside the
  // promise so that a failure rejects it rather than throwing.
  encodeToBytes(fmt?: ImageFormat, quality?: number) {
    return new Promise<Uint8Array>((resolve) => {
      resolve(this.encode("encodeToBytes", fmt, quality));
    });
  }

  encodeToBase64(fmt?: ImageFormat, quality?: number) {
    return new Promise<string>((resolve) => {
      resolve(toBase64String(this.encode("encodeToBase64", fmt, quality)));
    });
  }

  private encode(
    method: string,
    fmt?: ImageFormat,
    quality?: number
  ): Uint8Array {
    if (
      fmt !== undefined &&
      fmt !== ImageFormat.PNG &&
      fmt !== ImageFormat.JPEG &&
      fmt !== ImageFormat.WEBP
    ) {
      throw new SkiaValidationError(
        `${method}: the format must be ImageFormat.PNG, ImageFormat.JPEG or ImageFormat.WEBP`
      );
    }
    const bytes = this.encodeWith(fmt, quality);
    if (!bytes) {
      throw new SkiaInternalError(`${method}: encoding the image failed`);
    }
    return bytes;
  }

  private encodeWith(fmt?: ImageFormat, quality?: number): Uint8Array | null {
    if (fmt !== undefined && quality !== undefined) {
      // CanvasKit's encodeToBytes() applies `quality || 100`, which would
      // turn a valid quality of 0 into 100. The encoders clamp any quality
      // below 1 up to 1 anyway, so pass 1 to get the same output as 0.
      return this.ref.encodeToBytes(
        getEnum(this.CanvasKit, "ImageFormat", fmt),
        Math.max(quality, 1)
      );
    }
    if (fmt !== undefined) {
      return this.ref.encodeToBytes(
        getEnum(this.CanvasKit, "ImageFormat", fmt)
      );
    }
    return this.ref.encodeToBytes();
  }

  readPixels(srcX?: number, srcY?: number, imageInfo?: ImageInfo) {
    return new Promise<Float32Array | Uint8Array>((resolve) => {
      const info = imageInfo ?? this.getImageInfo();
      const x = srcX ?? 0;
      const y = srcY ?? 0;
      if (
        info.width <= 0 ||
        info.height <= 0 ||
        info.colorType === ColorType.Unknown
      ) {
        throw new SkiaValidationError(
          `readPixels: the image info describes no pixels (${info.width}x${info.height}, or an unknown color type)`
        );
      }
      const pixels = this.readPixelsSync(srcX, srcY, imageInfo);
      if (pixels) {
        resolve(pixels);
      } else if (
        x >= this.width() ||
        y >= this.height() ||
        x + info.width <= 0 ||
        y + info.height <= 0
      ) {
        // Nothing of the image in the rectangle: all of it is zero, as on
        // native.
        resolve(zeroPixels(info));
      } else {
        throw new SkiaInternalError(
          "readPixels: the pixels cannot be converted to the image info"
        );
      }
    });
  }

  private readPixelsSync(srcX?: number, srcY?: number, imageInfo?: ImageInfo) {
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

  makeTextureImage(_opts?: { mipmapped?: boolean }): SkImage {
    // A WebGL texture belongs to the context that created it, so an image
    // is uploaded by the canvas that draws it.
    return this;
  }

  makeRasterImage(): Promise<SkImage> {
    // CanvasKit reads back synchronously; the pixels are copied into a new
    // image so that it can be drawn by any canvas (a WebGL texture belongs to
    // the context that created it). Run inside the promise so that a failure
    // rejects it rather than throwing.
    return new Promise((resolve) => resolve(this.copyToRaster()));
  }

  private copyToRaster(): SkImage {
    // The pixels are always copied: CanvasKit does not tell whether an image
    // is texture-backed, and a copy is drawable by any canvas.
    const partialInfo = this.ref.getImageInfo();
    const colorSpace = this.ref.getColorSpace();
    const info = {
      ...partialInfo,
      colorSpace,
    };
    const pixels = this.ref.readPixels(0, 0, info) as Uint8Array | null;
    if (!pixels) {
      throw new SkiaInternalError(
        "makeRasterImage: reading the image back failed"
      );
    }
    const img = this.CanvasKit.MakeImage(info, pixels, info.width * 4);
    if (!img) {
      throw new SkiaOutOfMemoryError(
        "makeRasterImage: no memory for the copy of the image"
      );
    }
    return new JsiSkImage(this.CanvasKit, img);
  }
}
