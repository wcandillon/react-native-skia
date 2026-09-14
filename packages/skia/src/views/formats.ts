import { Platform } from "react-native";

// Non-spec helper: the canvas texture format most likely to reach the display
// with more than 8 bits per channel on the current platform. The returned
// format keeps standard (SDR) sRGB semantics: values are encoded exactly like
// on an 8-bit canvas, only with more precision, so colors match across
// formats. This is about bit depth, not HDR (no extended range).
//
// - Apple platforms: "rgba16float" (16-bit float per channel). The library
//   tags the CAMetalLayer with the extended sRGB colorspace automatically so
//   the values display identically to an 8-bit canvas.
// - Android: "rgb10a2unorm". A float16 swapchain works but is tagged as an
//   SDR sRGB layer, and SurfaceFlinger quantizes SDR layers to the display
//   pipeline depth during composition, discarding the extra precision.
//   RGBA_1010102 buffers keep SDR semantics and can pass through composition,
//   including direct scanout on 10-bit panels. Requires the Vulkan surface to
//   expose the 10-bit format (common on modern devices).
// - Web: "rgba16float", the float canvas format supported by browsers.
export const getPreferredHighBitDepthCanvasFormat = (): GPUTextureFormat => {
  return Platform.OS === "android" ? "rgb10a2unorm" : "rgba16float";
};
