#pragma once

#include <jsi/jsi.h>

#include <RNSkInfoParameter.h>
#include <RNSkPlatformContext.h>
#include <RNSkTimingInfo.h>
#include <RNSkLog.h>

class SkPicture;
class SkRect;
class SkImage;

namespace RNSkia
{
  using namespace facebook;

  enum RNSkDrawingMode
  {
    Default,
    Continuous
  };

  class RNSkBaseDrawView: public std::enable_shared_from_this<RNSkBaseDrawView>
  {
  public:
    /**
     * Constructor
     */
    RNSkBaseDrawView(std::shared_ptr<RNSkPlatformContext> context);

    /**
     Destructor
     */
    virtual ~RNSkBaseDrawView();

    /**
     * Repaints the Skia view using the underlying context and the drawcallback.
     * This method schedules a draw request that will be run on the correct
     * thread.
     */
    void requestRedraw();

    /**
     Sets the native id of the view
     */
    void setNativeId(size_t nativeId);

    /**
     Returns the native id
     */
    size_t getNativeId() { return _nativeId; }

    /**
     Sets the drawing mode for the view
     */
    void setDrawingMode(RNSkDrawingMode mode);

    /**
     * Set to true to show the debug overlays on render
     */
    void setShowDebugOverlays(bool show) { _showDebugOverlay = show; }
    
    /**
     Returns the show debug overlay flag
     */
    bool getShowDebugOverlays() { return _showDebugOverlay; }

    /**
      Update touch state with new touch points
     */
    virtual void updateTouchState(std::vector<RNSkTouchPoint> &points);

  protected:
    /**
     Called when the view needs to be repainted. This function must be overridden in sub classes.
     The function is called on the main thread from the display sync update loop.
     */
    virtual void performDraw() = 0;
    
    /**
     Returns the scaled width of the view
     */
    virtual float getScaledWidth() = 0;

    /**
     Returns the scaled height of the view
     */
    virtual float getScaledHeight() = 0;

    /**
     Override to render picture to GPU
     */
    virtual void drawPicture(const sk_sp<SkPicture> picture) = 0;

    /**
     * @return The platformcontext
     */
    std::shared_ptr<RNSkPlatformContext> getPlatformContext()
    {
      return _platformContext;
    }

  private:
    /**
     Starts beginDrawCallback loop if the drawing mode is continuous
     */
    void beginDrawingLoop();

    /**
     Ends an ongoing beginDrawCallback loop for this view
     */
    void endDrawingLoop();

    /**
      Draw loop callback
     */
    void drawLoopCallback(bool invalidated);

    /**
     * Pointer to the platform context
     */
    std::shared_ptr<RNSkPlatformContext> _platformContext;

    /**
     Drawing mode
     */
    RNSkDrawingMode _drawingMode;

    /**
     * Show debug overlays
     */
    bool _showDebugOverlay = false;

    /**
     * True if the drawing loop has been requested
     */
    size_t _drawingLoopId = 0;

    /**
     Redraw queue counter
     */
    std::atomic<int> _redrawRequestCounter = {1};

    /**
     * Native id
     */
    size_t _nativeId;
  };

} // namespace RNSkia
