import { useEffect, useMemo } from "react";

import { SkiaViewApi } from "./api";

/**
 * The native id of a view component, for the life of the component.
 *
 * The native side keeps the properties set for the id (`setJsiProperty`: the
 * recording, the view options) for as long as the component is mounted, so
 * that the native views Fabric creates for it over time (`display: none` and
 * view recycling tear the previous one down) all draw them. Unmounting lets
 * go of them; a native view that outlives the component (exit animations,
 * screen transitions) keeps showing its last frame until it is torn down.
 *
 * The cleanup is a passive one, like the one that unmounts the content of a
 * canvas: the content can still be recorded, and set for the id, until
 * then. On a simulated unmount (StrictMode, a hidden Activity), every cleanup
 * runs before the effects run again, which set the properties again.
 */
export const useNativeViewId = () => {
  const nativeId = useMemo(() => SkiaViewApi.allocateNativeId(), []);
  useEffect(
    () => () => {
      // Missing from a native binary older than this bundle, which lets go
      // of the properties by itself, as the view is torn down.
      if (SkiaViewApi.releaseView) {
        SkiaViewApi.releaseView(nativeId);
      }
    },
    [nativeId]
  );
  return nativeId;
};
