#pragma once

#include <memory>

#include "RNSkVideoEncoder.h"

namespace RNSkia {

/**
 The Android video encoder (see RNSkVideoEncoder): a MediaCodec H.264
 encoder fed through its input surface, and a MediaMuxer. Dawn presents
 each frame onto the encoder's input window, as a view presents onto its
 own, so the frames never leave the GPU. A window has no way to carry the
 presentation time of a frame here (eglPresentationTimeANDROID has no
 Vulkan counterpart), so the encoder is told the frame rate instead (the
 max-pts-gap-to-encoder key) and each frame is muxed at index / fps. The sound,
 when there is one, is read with a MediaExtractor and muxed as it is when it is
 AAC, decoded and encoded to AAC otherwise.
 */
std::unique_ptr<RNSkVideoEncoder>
MakeAndroidVideoEncoder(const RNSkVideoEncoderOptions &options);

} // namespace RNSkia
