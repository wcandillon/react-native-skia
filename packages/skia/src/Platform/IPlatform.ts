import type { ViewComponent } from "react-native";

import type { DataModule } from "../skia/types";

export interface IPlatform {
  OS: string;
  PixelRatio: number;
  resolveAsset: (source: DataModule) => string;
  View: typeof ViewComponent;
}
