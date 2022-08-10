import { Skia } from "../Skia";
import type { DataSource } from "../types";

import { useRawData } from "./Data";

const imgFactory = Skia.Image.MakeImageFromEncoded.bind(Skia.Image);

/**
 * Returns a Skia Image object
 * */
export const useImage = (
  source: DataSource | null | undefined,
  onError?: (err: Error) => void
) => useRawData(source, imgFactory, onError);
