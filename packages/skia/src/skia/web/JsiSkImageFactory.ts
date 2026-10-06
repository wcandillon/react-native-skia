import type { CanvasKit, Image } from "canvaskit-wasm";

import type {
  SkData,
  ImageInfo,
  SkImage,
  NativeBuffer,
  ImageFactory,
} from "../types";

import { Host, getEnum, throwNotImplementedOnRNWeb } from "./Host";
import { JsiSkImage } from "./JsiSkImage";
import { JsiSkData } from "./JsiSkData";
import type { JsiSkSurface } from "./JsiSkSurface";

// On Web a native buffer is any CanvasImageSource (the video element of a
// playing video, an ImageBitmap, a canvas...).
const isCanvasImageSource = (
  buffer: NativeBuffer
): buffer is CanvasImageSource =>
  buffer instanceof HTMLVideoElement ||
  buffer instanceof HTMLCanvasElement ||
  buffer instanceof ImageBitmap ||
  buffer instanceof OffscreenCanvas ||
  (typeof VideoFrame !== "undefined" && buffer instanceof VideoFrame) ||
  buffer instanceof HTMLImageElement ||
  buffer instanceof SVGImageElement;

export class JsiSkImageFactory extends Host implements ImageFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeNull() {
    return new JsiSkImage(this.CanvasKit, null as unknown as Image);
  }

  MakeImageFromViewTag(viewTag: number): Promise<SkImage | null> {
    const view = viewTag as unknown as HTMLElement;
    // TODO: Implement screenshot from view in React JS
    console.log(view);
    return Promise.resolve(null);
  }

  MakeImageFromNativeBuffer(
    buffer: NativeBuffer,
    surface?: JsiSkSurface,
    image?: JsiSkImage
  ) {
    if (!isCanvasImageSource(buffer)) {
      throw new Error("Invalid NativeBuffer");
    }
    if (!surface) {
      let img: Image;
      if (
        buffer instanceof HTMLImageElement ||
        buffer instanceof HTMLVideoElement ||
        buffer instanceof ImageBitmap
      ) {
        img = this.CanvasKit.MakeLazyImageFromTextureSource(buffer);
      } else {
        img = this.CanvasKit.MakeImageFromCanvasImageSource(buffer);
      }
      return new JsiSkImage(this.CanvasKit, img);
    } else if (!image) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img = (surface as any).makeImageFromTextureSource(buffer) as Image;
      return new JsiSkImage(this.CanvasKit, img);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img = (surface as any).updateTextureFromSource(
        image,
        buffer
      ) as Image;
      return new JsiSkImage(this.CanvasKit, img);
    }
  }

  MakeImageFromEncoded(encoded: SkData) {
    const image = this.CanvasKit.MakeImageFromEncoded(
      JsiSkData.fromValue(encoded)
    );
    if (image === null) {
      return null;
    }
    return new JsiSkImage(this.CanvasKit, image);
  }

  MakeImage(info: ImageInfo, data: SkData, bytesPerRow: number) {
    // see toSkImageInfo() from canvaskit
    const image = this.CanvasKit.MakeImage(
      {
        alphaType: getEnum(this.CanvasKit, "AlphaType", info.alphaType),
        colorSpace: this.CanvasKit.ColorSpace.SRGB,
        colorType: getEnum(this.CanvasKit, "ColorType", info.colorType),
        height: info.height,
        width: info.width,
      },
      JsiSkData.fromValue(data),
      bytesPerRow
    );
    if (image === null) {
      return null;
    }
    return new JsiSkImage(this.CanvasKit, image);
  }

  MakeImageFromNativeTexture(_pointer: bigint): SkImage {
    return throwNotImplementedOnRNWeb<SkImage>();
  }

  MakeNativeTextureFromImage(_image: SkImage): bigint {
    return throwNotImplementedOnRNWeb<bigint>();
  }
}
