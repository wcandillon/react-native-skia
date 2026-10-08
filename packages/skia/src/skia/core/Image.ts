import type { View } from "react-native";

import { Platform } from "../../Platform";
import { Skia } from "../Skia";
import type { DataSourceParam, SkData, SkImage } from "../types";

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

/**
 * Creates an image from a given view reference. NOTE: This method has different implementations
 * on web/native. On web, the callback is called with the view ref and the callback is expected to
 * return a promise that resolves to a Skia Image object. On native, the view ref is used to
 * find the view tag and the Skia Image object is created from the view tag. This means that on web
 * you will need to implement the logic to create the image from the view ref yourself.
 * @param viewRef Ref to the view we're creating an image from
 * @returns A promise that resolves to a Skia Image object or rejects
 * with an error id the view tag is invalid.
 */
export const makeImageFromView = <
  T extends
    | number
    | React.Component<unknown, unknown>
    | React.ComponentClass<unknown>
    | React.ComponentRef<typeof View>
    | null,
>(
  viewRef: React.RefObject<T>,
  callback:
    null | ((viewRef: React.RefObject<T>) => Promise<SkImage | null>) = null
) => {
  // In web implementation we just delegate the work to the provided callback
  if (Platform.OS === "web") {
    if (callback) {
      return callback(viewRef);
    } else {
      Promise.reject(
        new Error(
          "Callback is required on web in the makeImageFromView function."
        )
      );
    }
  }
  const viewTag = Platform.findNodeHandle(viewRef.current);
  if (viewTag !== null && viewTag !== 0) {
    return Skia.Image.MakeImageFromViewTag(viewTag);
  }
  return Promise.reject(new Error("Invalid view tag"));
};
