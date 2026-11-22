#pragma once

#include <memory>

#include "RNSkVideoEncoder.h"

namespace RNSkia {

/**
 The Apple video encoder (see RNSkVideoEncoder): an AVAssetWriter writing
 H.264 through an AVAssetWriterInputPixelBufferAdaptor. Each frame is drawn
 into a CVPixelBuffer of the adaptor's pool: its IOSurface is imported into
 Dawn as shared texture memory, Skia draws into the texture, and the pixel
 buffer goes to the encoder once the GPU is done with it, without a copy.
 The sound, when there is one, is read with an AVAssetReader and written
 alongside, as it is when it is AAC already, encoded to AAC otherwise.
 */
std::unique_ptr<RNSkVideoEncoder>
MakeAppleVideoEncoder(const RNSkVideoEncoderOptions &options);

} // namespace RNSkia
