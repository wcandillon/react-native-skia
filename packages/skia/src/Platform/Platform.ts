import { Image, PixelRatio, Platform as RNPlatform, View } from "react-native";

import type { DataModule } from "../skia/types";
import { isRNModule, unwrapModule } from "../skia/types";

import type { IPlatform } from "./IPlatform";

export const Platform: IPlatform = {
  OS: RNPlatform.OS,
  Version: RNPlatform.Version,
  PixelRatio: PixelRatio.get(),
  resolveAsset: (source: DataModule) => {
    const asset = unwrapModule(source);
    if (typeof asset === "string") {
      return asset;
    }
    return isRNModule(asset) ? Image.resolveAssetSource(asset).uri : asset.uri;
  },
  View,
};
