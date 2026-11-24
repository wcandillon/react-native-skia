#pragma once

#include <algorithm>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <utility>

#include "RNDawnContext.h"

#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/Recorder.h"

namespace RNSkia {

/**
 * The Graphite recorder of one offscreen surface JS made
 * (Skia.Surface.MakeOffscreen, MakeFromGPUTexture).
 *
 * A recorder has a single owner. A surface that borrowed the recorder of the
 * thread that made it (DawnContext::getRecorder) would race with that thread
 * as soon as another one draws into it, a worklet for instance. So each
 * surface owns its recorder, and whichever thread uses the surface uses the
 * recorder: one thread at a time, as for the surface itself.
 *
 * The recorder must outlive the surface (see SurfaceAndRecorder). One made
 * for a GPU device lost since submits nothing (see DawnContext::generation).
 */
class RNSkSurfaceRecorder {
public:
  /**
   The recorder of a surface of that size, for the GPU device in use. Throws
   when none can be made. Any thread.
   */
  static std::shared_ptr<RNSkSurfaceRecorder> Make(int width, int height) {
    uint64_t generation = 0;
    auto recorder = DawnContext::getInstance().makeRecorder(
        budgetFor(width, height), &generation);
    return std::shared_ptr<RNSkSurfaceRecorder>(
        new RNSkSurfaceRecorder(std::move(recorder), generation));
  }

  skgpu::graphite::Recorder *get() const { return _recorder.get(); }

  /** Something is about to be drawn into the surface (see flushIfDirty). */
  void markDirty() { _dirty = true; }

  /**
   surface.flush(): snaps what was drawn into the surface and submits it to
   the GPU. Returns whether it runs (see DawnContext::submitRecording).
   Called by the thread using the surface.
   */
  bool flush(
      skgpu::graphite::SyncToCpu syncToCpu = skgpu::graphite::SyncToCpu::kNo) {
    _dirty = false;
    const bool submitted = DawnContext::getInstance().submitRecording(
        _recorder.get(), _generation, syncToCpu);
    // Throttled: the scratch textures the recorder cached and did not use
    // for a while go.
    const auto now = std::chrono::steady_clock::now();
    if (now - _lastCleanup >= DawnContext::kThreadTrimDelay) {
      _lastCleanup = now;
      _recorder->performDeferredCleanup(DawnContext::kThreadTrimDelay);
    }
    // The images the drawing uploaded went through the upload recorder of
    // this thread, not this one.
    DawnContext::trimThreadIfDue();
    return submitted;
  }

  /**
   flush(), unless nothing was drawn since the last one. For a surface about
   to go: what is not submitted by then is lost with the recorder, and the
   texture may outlive both (asImage(), MakeFromGPUTexture).
   */
  void flushIfDirty() {
    if (_dirty) {
      flush();
    }
  }

private:
  RNSkSurfaceRecorder(std::unique_ptr<skgpu::graphite::Recorder> recorder,
                      uint64_t generation)
      : _recorder(std::move(recorder)), _generation(generation) {}

  /**
   The GPU budget of the recorder: what it may keep cached for reuse. The
   layers and blurs of a surface take textures of its size, several at once,
   hence 8 times its pixels, and no less than 32 MB. Graphite's default (256
   MB, made for a thread's whole content) is the most it gets.
   */
  static size_t budgetFor(int width, int height) {
    constexpr uint64_t kMin = 32 * 1024 * 1024;
    // 64 bits: the product overflows a 32-bit size_t.
    const auto bytes = static_cast<uint64_t>(std::max(width, 0)) *
                       static_cast<uint64_t>(std::max(height, 0)) * 4;
    return static_cast<size_t>(std::clamp<uint64_t>(
        bytes * 8, kMin,
        skgpu::graphite::RecorderOptions::kDefaultRecorderBudget));
  }

  std::unique_ptr<skgpu::graphite::Recorder> _recorder;
  // The GPU device the recorder was made for (see DawnContext::generation).
  uint64_t _generation;
  // Whether something was drawn and not submitted. A new surface is dirty:
  // its initial clear is yet to be submitted.
  bool _dirty = true;
  // The latest cleanup (see flush).
  std::chrono::steady_clock::time_point _lastCleanup =
      std::chrono::steady_clock::now();
};

} // namespace RNSkia
