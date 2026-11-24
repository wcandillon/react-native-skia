import { useEffect, useState } from "react";

import { Skia } from "../Skia";
import type { SkGpuInfo } from "../types";

/**
 * The GPU Skia renders with (`Skia.gpu`), as state: the component renders
 * again once a lost GPU device has been replaced, with the description of
 * the new device (or of why there is none). Everything made on the lost
 * device draws nothing anymore, so make GPU objects with the value as a
 * dependency and they are made again on the new device:
 *
 * ```tsx
 * const gpu = useGpu();
 * const surface = useMemo(() => Skia.Surface.MakeOffscreen(w, h), [gpu]);
 * ```
 *
 * The texture hooks (`useTexture`, `useImageAsTexture`,
 * `usePictureAsTexture`) do this on their own. The value never changes on
 * the web, where the device cannot be lost.
 */
export const useGpu = () => {
  const [gpu, setGpu] = useState(() => Skia.gpu);
  useEffect(() => {
    let mounted = true;
    // `lost` is the promise of the loss of one device: once it resolves,
    // Skia.gpu describes the new device, whose loss is awaited in turn.
    const watch = ({ lost }: SkGpuInfo) =>
      lost.then(() => {
        if (mounted) {
          const next = Skia.gpu;
          setGpu(next);
          watch(next);
        }
      });
    watch(gpu);
    return () => {
      mounted = false;
    };
    // The watch follows the device by itself: it only starts once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return gpu;
};
