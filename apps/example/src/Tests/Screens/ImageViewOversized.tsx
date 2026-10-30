import React from "react";

import { TextureAboveRaster } from "./ImageView";

// Past the 100 MB that Android draws of one bitmap
// (RecordingCanvas.MAX_BITMAP_SIZE): 5200 x 5200 pixels of 4 bytes.
export const ImageViewOversized = () => <TextureAboveRaster size={5200} />;
