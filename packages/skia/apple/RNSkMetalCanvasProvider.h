#pragma once

#include <atomic>
#include <mutex>

#import "RNSkPlatformContext.h"
#import "RNSkView.h"

#import <MetalKit/MetalKit.h>
#import <QuartzCore/CAMetalLayer.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <include/gpu/ganesh/GrDirectContext.h>

#pragma clang diagnostic pop

class RNSkMetalCanvasProvider : public RNSkia::RNSkCanvasProvider {
public:
  RNSkMetalCanvasProvider(std::function<void()> requestRedraw,
                          std::shared_ptr<RNSkia::RNSkPlatformContext> context,
                          bool useP3ColorSpace = true);

  ~RNSkMetalCanvasProvider();

  int getWidth() override;
  int getHeight() override;

  bool renderToCanvas(const std::function<void(SkCanvas *)> &cb) override;

#if defined(SK_GRAPHITE)
  std::optional<RNSkia::RNSkDeferredTarget> getDeferredTarget() override;
  // Any thread: a producer thread may present its own recordings.
  bool presentRecording(skgpu::graphite::Recording *recording) override;
  bool insertRecording(skgpu::graphite::Recording *recording) override;
  bool presentInserted() override;
#endif

  void setSize(int width, int height);
  void setUseP3ColorSpace(bool useP3ColorSpace);
  void setHighBitDepth(bool highBitDepth);
  CALayer *getLayer();

private:
  // True while the app is in the background (#1257): presenting then can
  // clear the CAMetalLayer. Tracked from notifications so that any thread
  // can check it; UIApplication.applicationState is main thread only.
  static bool isBackgrounded();

  std::shared_ptr<RNSkia::RNSkPlatformContext> _context;
  // Presents may run on a producer thread while setSize() replaces the
  // window context on the main thread: every use of it is under this lock.
  std::recursive_mutex _ctxMutex;
  std::unique_ptr<RNSkia::WindowContext> _ctx = nullptr;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop
  bool _useP3ColorSpace = true;
  bool _highBitDepth = false;
};
