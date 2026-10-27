import { Skia } from "../Skia";
import type { DataSourceParam } from "../types";

import { useRawData } from "./Data";

const tfFactory = Skia.Typeface.MakeFromData.bind(Skia.Typeface);

/**
 * Returns a Skia Typeface object
 * */
export const useTypeface = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, tfFactory, onError);
