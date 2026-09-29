#pragma once

#include <optional>
#include <string>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

#if defined(SK_GRAPHITE)
#include "RNSkDeferredTarget.h"
#endif

namespace RNSkia {

class WindowContext {
public:
  virtual ~WindowContext() = default;
  virtual sk_sp<SkSurface> getSurface() = 0;
  virtual void present() = 0;
  virtual void resize(int width, int height) = 0;
  virtual int getWidth() = 0;
  virtual int getHeight() = 0;

#if defined(SK_GRAPHITE)
  /**
   * Thread-safe description of the swapchain texture a Recording must be
   * recorded against to be presentable by this window.
   */
  virtual std::optional<RNSkDeferredTarget> getDeferredTarget() {
    return std::nullopt;
  }

  /**
   * Binds the current swapchain texture as the recording's deferred target,
   * inserts it, submits once and presents. Main thread only.
   */
  virtual bool presentRecording(skgpu::graphite::Recording *recording) {
    return false;
  }
  /**
   * presentRecording in three steps, so several windows can share one
   * submit: insertRecording() binds the swapchain texture and inserts,
   * DawnContext::submit() submits, presentInserted() presents. Any thread.
   */
  virtual bool insertRecording(skgpu::graphite::Recording *recording) {
    return false;
  }
  virtual bool presentInserted() { return false; }
#endif
};

} // namespace RNSkia
