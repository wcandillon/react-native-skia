import React, { createElement, useEffect, useState } from "react";
import { View } from "react-native";

import type { SkImage, SkSurface } from "../skia/types";
import { AlphaType, ColorType, FilterMode, MipmapMode } from "../skia/types";
import { JsiSkSurfaceFactory } from "../skia/web/JsiSkSurfaceFactory";
import { getSharedWebGLContext } from "../skia/web/SharedWebGLContext";

import type { ImageUrlObserver } from "./imageObjectUrls";
import { createImageObjectUrls } from "./imageObjectUrls";
import { IMAGE_VIEW_BASE_STYLE } from "./imageViewBaseStyle";
import type { SkiaImageViewProps } from "./types";

interface EncodedSize {
  readonly width: number;
  readonly height: number;
}

interface ShownUrl {
  readonly image: SkImage;
  readonly url: string;
}

// WebKit's largest canvas on iOS before its d1f63c061e (2024).
const MAX_CANVAS_AREA = 4096 * 4096;
// The widest canvas Chrome and Firefox make.
const MAX_CANVAS_SIDE = 32767;

const encodedSizeOf = (image: SkImage): EncodedSize => {
  const width = image.width();
  const height = image.height();
  const scale = Math.min(
    1,
    Math.sqrt(MAX_CANVAS_AREA / (width * height)),
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
};

// The pixels as a canvas's ImageData holds them.
const encodedInfo = (size: EncodedSize) => ({
  width: size.width,
  height: size.height,
  colorType: ColorType.RGBA_8888,
  alphaType: AlphaType.Unpremul,
});

const readScaledOn = async (
  surface: SkSurface,
  image: SkImage,
  size: EncodedSize
) => {
  try {
    surface
      .getCanvas()
      .drawImageRectOptions(
        image,
        { x: 0, y: 0, width: image.width(), height: image.height() },
        { x: 0, y: 0, width: size.width, height: size.height },
        FilterMode.Linear,
        MipmapMode.Linear
      );
    surface.flush();
    const scaled = surface.makeImageSnapshot();
    try {
      return await scaled.readPixels(0, 0, encodedInfo(size));
    } finally {
      scaled.dispose();
    }
  } finally {
    surface.dispose();
  }
};

// Null past the GPU's largest texture, with its context lost, and on a page
// without WebGL, where the shared context throws (getSharedWebGLContext).
const makeRenderTarget = (surfaces: JsiSkSurfaceFactory, size: EncodedSize) => {
  try {
    getSharedWebGLContext(CanvasKit);
  } catch {
    return null;
  }
  return surfaces.MakeOffscreen(size.width, size.height);
};

// Scaled on the GPU, and on the CPU where the GPU makes no render target of
// the encoded size.
const readScaledPixels = async (image: SkImage, size: EncodedSize) => {
  const surfaces = new JsiSkSurfaceFactory(CanvasKit);
  const target = makeRenderTarget(surfaces, size);
  if (target !== null) {
    return readScaledOn(target, image, size);
  }
  const raster = await image.makeRasterImage();
  try {
    return await readScaledOn(
      surfaces.MakeRaster(size.width, size.height),
      raster,
      size
    );
  } finally {
    raster.dispose();
  }
};

const readEncodedPixels = (image: SkImage, size: EncodedSize) =>
  size.width === image.width() && size.height === image.height()
    ? image.readPixels(0, 0, encodedInfo(size))
    : readScaledPixels(image, size);

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((png) => {
      if (png === null) {
        reject(new Error("SkiaImageView: could not encode the image"));
      } else {
        resolve(png);
      }
    }, "image/png");
  });

// The browser encodes asynchronously; Skia's encoder blocks the main thread for seconds on a photo.
const encodeImage = async (image: SkImage) => {
  const size = encodedSizeOf(image);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  const pixels = context === null ? null : await readEncodedPixels(image, size);
  if (
    context === null ||
    !(pixels instanceof Uint8Array) ||
    !(pixels.buffer instanceof ArrayBuffer)
  ) {
    throw new Error("SkiaImageView: could not read the image's pixels");
  }
  context.putImageData(
    new ImageData(
      new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.length),
      size.width,
      size.height
    ),
    0,
    0
  );
  return toPng(canvas);
};

const imageObjectUrls = createImageObjectUrls(encodeImage, URL, (error) =>
  console.warn(error)
);

const IMAGE_STYLE = { width: "100%", height: "100%", display: "block" };

/**
 * A view showing an image, with no canvas of its own: on the web, an <img> of
 * the image, encoded once however many views show it, after the view mounts.
 * The image fills the view's content box, inside its padding and border, and
 * is clipped to its rounded corners unless its style sets `overflow`. A view
 * whose image changes keeps showing the previous one until the next is
 * encoded. When an image cannot be encoded, its views show nothing until a
 * later encode of it succeeds, and a view that changes to it shows nothing
 * too rather than its previous image.
 */
export const SkiaImageView = ({
  image,
  style,
  ...viewProps
}: SkiaImageViewProps) => {
  const [shown, setShown] = useState<ShownUrl>();
  useEffect(() => {
    if (image === null) {
      setShown(undefined);
      return undefined;
    }
    const observer: ImageUrlObserver = {
      published: (url) => setShown({ image, url }),
      failed: () => setShown(undefined),
    };
    imageObjectUrls.retain(image);
    imageObjectUrls.observe(image, observer);
    return () => {
      imageObjectUrls.unobserve(image, observer);
      // After the commit's other effects: a view taking the image over retains it first.
      queueMicrotask(() => imageObjectUrls.release(image));
    };
  }, [image]);
  // The URL on screen stays until the next one is: the <img> may not have read it yet.
  useEffect(() => {
    if (shown === undefined) {
      return undefined;
    }
    imageObjectUrls.retain(shown.image);
    return () => {
      queueMicrotask(() => imageObjectUrls.release(shown.image));
    };
  }, [shown]);
  const visible = image === null ? undefined : shown;
  return (
    <View {...viewProps} style={[IMAGE_VIEW_BASE_STYLE, style]}>
      {visible === undefined
        ? null
        : createElement("img", {
            src: visible.url,
            alt: "",
            draggable: false,
            style: IMAGE_STYLE,
          })}
    </View>
  );
};
