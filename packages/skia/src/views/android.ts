import type { AndroidCanvasProps, AndroidSurfaceType } from "./types";

// Anything else reaching the native component would hit the generated
// string-enum parser, which aborts on unknown values.
const resolveSurfaceType = (
  surfaceType: AndroidSurfaceType | undefined
): "auto" | AndroidSurfaceType =>
  surfaceType === "SurfaceView" || surfaceType === "TextureView"
    ? surfaceType
    : "auto";

/** The native props the `android` prop of a view resolves to. */
export const androidNativeProps = (android?: AndroidCanvasProps) => ({
  androidSurfaceType: resolveSurfaceType(android?.surfaceType),
  androidZOrderOnTop: !!android?.zOrderOnTop,
});
