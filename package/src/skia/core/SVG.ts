import { Skia } from "../Skia";
import type { DataSource } from "../types";

import { useRawData } from "./Data";

const svgFactory = Skia.SVG.MakeFromData.bind(Skia.SVG);

export const useSVG = (
  source: DataSource | null | undefined,
  onError?: (err: Error) => void
) => useRawData(source, svgFactory, onError);
