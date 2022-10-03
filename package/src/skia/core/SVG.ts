import { Skia } from "../Skia";
import type { DataSourceParam } from "../types";

import { useRawData } from "./Data";

const svgFactory = Skia.SVG.MakeFromData.bind(Skia.SVG);

export const useSVG = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, svgFactory, onError);
