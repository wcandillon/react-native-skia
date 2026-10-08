/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NodeHandle, ViewComponent } from "react-native";

import type { DataModule } from "../skia/types";

export interface IPlatform {
  OS: string;
  PixelRatio: number;
  findNodeHandle: (
    componentOrHandle:
      null | number | React.Component<any, any> | React.ComponentClass<any>
  ) => null | NodeHandle;
  resolveAsset: (source: DataModule) => string;
  View: typeof ViewComponent;
}
