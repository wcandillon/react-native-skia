import React, { createElement, useEffect, useState } from "react";
import { View } from "react-native";

import type { SkImage } from "../skia/types";
import { AlphaType, ColorType, FilterMode, MipmapMode } from "../skia/types";
import { JsiSkSurfaceFactory } from "../skia/web/JsiSkSurfaceFactory";

import type { SkiaImageViewProps } from "./types";

// One encode per image while any view waits for it or shows it; the URL goes with the last.
interface ShownImage {
  readonly url: Promise<string>;
  views: number;
}

const shownImages = new Map<SkImage, ShownImage>();

interface ShownUrl {
  readonly image: SkImage;
  readonly url: string;
}

// WebKit's largest canvas on iOS before its d1f63c061e (2024).
const MAX_CANVAS_AREA = 4096 * 4096;
// The widest canvas Chrome and Firefox make.
const MAX_CANVAS_SIDE = 32767;

const encodedSizeOf = (image: SkImage) => {
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

const readEncodedPixels = (image: SkImage, width: number, height: number) => {
  const info = {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  };
  if (width === image.width() && height === image.height()) {
    return image.readPixels(0, 0, info);
  }
  const surface = new JsiSkSurfaceFactory(CanvasKit).MakeOffscreen(
    width,
    height
  );
  if (surface === null) {
    return null;
  }
  surface
    .getCanvas()
    .drawImageRectOptions(
      image,
      { x: 0, y: 0, width: image.width(), height: image.height() },
      { x: 0, y: 0, width, height },
      FilterMode.Linear,
      MipmapMode.Linear
    );
  surface.flush();
  const scaled = surface.makeImageSnapshot();
  const pixels = scaled.readPixels(0, 0, info);
  scaled.dispose();
  surface.dispose();
  return pixels;
};

// The browser encodes asynchronously; Skia's encoder blocks the main thread for seconds on a photo.
const encodeImage = (image: SkImage) =>
  new Promise<Blob>((resolve, reject) => {
    const { width, height } = encodedSizeOf(image);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const pixels =
      context === null ? null : readEncodedPixels(image, width, height);
    if (
      context === null ||
      !(pixels instanceof Uint8Array) ||
      !(pixels.buffer instanceof ArrayBuffer)
    ) {
      reject(new Error("SkiaImageView: could not read the image's pixels"));
      return;
    }
    context.putImageData(
      new ImageData(
        new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.length),
        width,
        height
      ),
      0,
      0
    );
    canvas.toBlob((png) => {
      if (png === null) {
        reject(new Error("SkiaImageView: could not encode the image"));
      } else {
        resolve(png);
      }
    }, "image/png");
  });

const retainImageUrl = (image: SkImage) => {
  let shown = shownImages.get(image);
  if (shown === undefined) {
    const url = encodeImage(image).then((png) => URL.createObjectURL(png));
    url.catch((error: Error) => console.warn(error.message));
    shown = { url, views: 0 };
    shownImages.set(image, shown);
  }
  shown.views++;
  return shown.url;
};

const releaseImageUrl = (image: SkImage) => {
  const shown = shownImages.get(image);
  if (shown === undefined) {
    return;
  }
  shown.views--;
  if (shown.views === 0) {
    shownImages.delete(image);
    shown.url.then(
      (url) => URL.revokeObjectURL(url),
      () => {}
    );
  }
};

const IMAGE_STYLE = { width: "100%", height: "100%", display: "block" };

/**
 * A view showing an image, with no canvas of its own: on the web, an <img> of
 * the image, encoded once however many views show it, after the view mounts.
 * The image fills the view's bounds; a view whose image changes keeps showing
 * the previous one until the next is encoded.
 */
export const SkiaImageView = ({ image, ...viewProps }: SkiaImageViewProps) => {
  const [shown, setShown] = useState<ShownUrl>();
  useEffect(() => {
    if (image === null) {
      setShown(undefined);
      return undefined;
    }
    let awaited = true;
    retainImageUrl(image).then(
      (url) => {
        if (awaited) {
          setShown({ image, url });
        }
      },
      () => {}
    );
    return () => {
      awaited = false;
      // After the commit's other effects: a view taking the image over retains it first.
      queueMicrotask(() => releaseImageUrl(image));
    };
  }, [image]);
  // The URL on screen stays until the next one is: the <img> may not have read it yet.
  useEffect(() => {
    if (shown === undefined) {
      return undefined;
    }
    retainImageUrl(shown.image);
    return () => {
      queueMicrotask(() => releaseImageUrl(shown.image));
    };
  }, [shown]);
  return (
    <View {...viewProps}>
      {shown === undefined
        ? null
        : createElement("img", { src: shown.url, alt: "", style: IMAGE_STYLE })}
    </View>
  );
};
