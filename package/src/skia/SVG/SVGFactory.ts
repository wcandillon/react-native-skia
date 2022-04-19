import type { Data } from "../Data/Data";
import type { SkJSIInstance } from "../JsiInstance";

import type { SkSVG } from "./SVG";

export interface SVGFactory {
  MakeSVG(): SkSVG;
  MakeFromData(data: Data): SkSVG | null;
  MakeFromString(str: string): SkSVG | null;
}
