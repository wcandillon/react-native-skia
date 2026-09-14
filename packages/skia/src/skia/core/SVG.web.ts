import { useEffect, useState } from "react";

import { Skia } from "../Skia";
import type { DataSourceParam, SkSVG } from "../types";
import { Platform } from "../../Platform";

export const useSVG = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => {
  const [svg, setSVG] = useState<SkSVG | null>(null);
  if (source === null || source === undefined) {
    throw new Error(`Invalid svg data source. Got: ${source}`);
  }
  useEffect(() => {
    (async () => {
      let src: string;
      if (typeof source === "string") {
        src = source;
      } else if (source instanceof Uint8Array) {
        throw new Error(
          `Invalid svg data source. Make sure that the source resolves to a string. Got: ${source}`
        );
      } else {
        src = Platform.resolveAsset(source);
      }
      const result = await fetch(src);
      const svgStr = await result.text();
      const newSvg = Skia.SVG.MakeFromString(svgStr);
      setSVG(newSvg);
      if (newSvg === null && onError !== undefined) {
        onError(new Error("Failed to create SVG from source."));
      }
    })();
  }, [onError, source]);
  return svg;
};
