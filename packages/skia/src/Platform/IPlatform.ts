import type { ViewComponent } from "react-native";

import type { DataModule } from "../skia/types";

export interface IPlatform {
  OS: string;
  // The OS version: a number on Android, a string on iOS, absent on web.
  Version?: number | string;
  PixelRatio: number;
  resolveAsset: (source: DataModule) => string;
  View: typeof ViewComponent;
}
