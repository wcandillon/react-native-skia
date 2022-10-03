import { Skia } from "../Skia";
import type { DataSourceParam } from "../types";

import { useRawData } from "./Data";

const imgFactory = Skia.Image.MakeImageFromEncoded.bind(Skia.Image);

/**
 * Returns a Skia Image object
 * */
export const useImage = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, imgFactory, onError);
