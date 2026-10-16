import { Platform } from "../../Platform";
import { Skia } from "../Skia";
import type { DataSourceParam, SkData } from "../types";

import { loadData, useLoading } from "./Data";

const decode = (data: SkData) => {
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (image === null) {
    throw new Error("Could not decode the image");
  }
  return image;
};

/**
 * Loads an image and decodes it off the JS thread. Resolves to a raster
 * image: drawing it uploads it to the GPU once per canvas (see
 * `makeTextureImage()` to upload it once), reading its pixels is a CPU
 * operation. Resolves to null for a null source, rejects when the image
 * cannot be loaded or decoded.
 */
export const loadImage = async (source: DataSourceParam) => {
  const encoded = await loadData(source, decode);
  if (encoded === null) {
    return null;
  }
  if (Platform.OS === "web") {
    // CanvasKit decodes on the CPU already: nothing to read back.
    return encoded;
  }
  const image = await encoded.makeRasterImage();
  if (image !== encoded) {
    // The encoded bytes are no longer needed.
    encoded.dispose();
  }
  return image;
};

/**
 * Returns a Skia Image object, decoded off the JS thread (see `loadImage`).
 * Null until loaded, or when loading fails: `onError` is then called.
 * */
export const useImage = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useLoading(source, () => loadImage(source), onError);
