import { useEffect, useState } from "react";
import type { DependencyList, ReactElement } from "react";
import type { SharedValue } from "react-native-reanimated";

import type {
  DataSourceParam,
  SkImage,
  SkPicture,
  SkSize,
} from "../../skia/types";
import { drawAsPicture } from "../../renderer/Offscreen";
import { Skia, useGpu, useImage } from "../../skia";
import { Platform } from "../../Platform";

import Rea from "./ReanimatedProxy";
import { Worklets } from "./WorkletsProxy";

const createTextureFromImage = (
  texture: SharedValue<SkImage | null>,
  image: SkImage
) => {
  "worklet";
  try {
    texture.value = image.makeTextureImage();
  } catch {
    // Too large for a texture, or out of GPU memory.
    texture.value = null;
  }
};

const createTexture = (
  texture: SharedValue<SkImage | null>,
  picture: SkPicture,
  size: SkSize
) => {
  "worklet";
  const surface = Skia.Surface.MakeOffscreen(size.width, size.height)!;
  const canvas = surface.getCanvas();
  canvas.drawPicture(picture);
  surface.flush();
  texture.value = surface.makeImageSnapshot();
  if (Platform.OS === "web") {
    texture.value = texture.value.makeRasterImageSync();
  }
};

export const useTexture = (
  element: ReactElement,
  size: SkSize,
  deps?: DependencyList
) => {
  const { width, height } = size;
  const [picture, setPicture] = useState<SkPicture | null>(null);
  useEffect(() => {
    drawAsPicture(element, {
      x: 0,
      y: 0,
      width,
      height,
    }).then((pic) => {
      setPicture(pic);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? []);
  return usePictureAsTexture(picture, size);
};

export const usePictureAsTexture = (
  picture: SkPicture | null,
  size: SkSize
) => {
  const texture = Rea.useSharedValue<SkImage | null>(null);
  // The texture lives on the GPU device: once a lost device has been
  // replaced, it is made again on the new one.
  const gpu = useGpu();
  useEffect(() => {
    if (picture !== null) {
      Worklets.scheduleOnUI(createTexture, texture, picture, size);
    }
  }, [picture, size, texture, gpu]);
  return texture;
};

export const useImageAsTexture = (source: DataSourceParam) => {
  const image = useImage(source);
  const texture = Rea.useSharedValue<SkImage | null>(null);
  const gpu = useGpu();
  useEffect(() => {
    if (image !== null) {
      Worklets.scheduleOnUI(createTextureFromImage, texture, image);
    }
  }, [image, texture, gpu]);
  return texture;
};
