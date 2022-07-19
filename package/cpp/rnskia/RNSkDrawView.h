#pragma once

#include <jsi/jsi.h>

#include <RNSkBaseDrawView.h>
#include <RNSkPlatformContext.h>
#include <JsiSkCanvas.h>

namespace RNSkia {

using namespace facebook;

using RNSkDrawCallback =
    std::function<void(std::shared_ptr<JsiSkCanvas>, int, int, double,
                       std::shared_ptr<RNSkPlatformContext>)>;

class RNSkDrawView:
  public RNSkBaseDrawView {

public:
  /**
   Constructor
   */
  RNSkDrawView(std::shared_ptr<RNSkPlatformContext> context);

  /**
   * Installs the draw callback for the view
   */
  void setDrawCallback(std::shared_ptr<jsi::Function> callback);
    
  /**
   Draws the view's surface into an image
   return an SkImage
   */
  sk_sp<SkImage> makeImageSnapshot(std::shared_ptr<SkRect> bounds);
    
  void updateTouchState(std::vector<RNSkTouchPoint> &points) override;
        
protected:
  
  void performDraw() override;
    
private:
      
  /**
   Draw in canvas
   */
  void renderToJsiCanvas(std::shared_ptr<JsiSkCanvas> canvas,
                         int width,
                         int height,
                         double time);
    
  /**
   * Stores a pointer to the jsi wrapper for the canvas. The reason for
   * storing this pointer and not recreate it is that it creates a set of
   * functions that we don't want to recreate on each render
   */
  std::shared_ptr<JsiSkCanvas> _jsiCanvas;
  
  /**
   * Stores the draw drawCallback
   */
  std::shared_ptr<RNSkDrawCallback> _drawCallback;
  
  /**
   * Info object parameter
   */
  std::shared_ptr<RNSkInfoObject> _infoObject;

  /**
   Timing information for javascript drawing
   */
  RNSkTimingInfo _jsTimingInfo;

  /**
   Timing information for GPU rendering
   */
  RNSkTimingInfo _gpuTimingInfo;
  
  /**
   * JS Drawing mutex
   */
  std::shared_ptr<std::timed_mutex> _jsDrawingLock;
    
  /**
   * SKIA Drawing mutex
   */
  std::shared_ptr<std::timed_mutex> _gpuDrawingLock;

};

} // namespace RNSkia
