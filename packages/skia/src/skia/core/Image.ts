import { Platform } from "../../Platform";
import { Skia } from "../Skia";
import type { DataSourceParam, SkImage } from "../types";

import { useRawData } from "./Data";

const imgFactory = Skia.Image.MakeImageFromEncoded.bind(Skia.Image);

/**
 * Returns a Skia Image object
 * */
export const useImage = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, imgFactory, onError);

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
