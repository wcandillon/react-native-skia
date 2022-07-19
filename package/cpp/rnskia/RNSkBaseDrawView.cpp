
#include "RNSkBaseDrawView.h"

namespace RNSkia
{

  using namespace std::chrono;

  RNSkBaseDrawView::RNSkBaseDrawView(std::shared_ptr<RNSkPlatformContext> context)
      : _platformContext(std::move(context)) {
  }

  RNSkBaseDrawView::~RNSkBaseDrawView()
  {
    endDrawingLoop();
  }

  void RNSkBaseDrawView::setNativeId(size_t nativeId)
  {
    _nativeId = nativeId;
    beginDrawingLoop();
  }

  void RNSkBaseDrawView::updateTouchState(std::vector<RNSkTouchPoint> &points)
  {
    requestRedraw();
  }

  void RNSkBaseDrawView::requestRedraw()
  {
    _redrawRequestCounter++;
  }

  void RNSkBaseDrawView::beginDrawingLoop()
  {
    if (_drawingLoopId != 0 || _nativeId == 0)
    {
      return;
    }
    // Set to zero to avoid calling beginDrawLoop before we return
    _drawingLoopId = _platformContext->beginDrawLoop(_nativeId,
                                                     [weakSelf = weak_from_this()](bool invalidated)
                                                     {
                                                       auto self = weakSelf.lock();
                                                       if (self)
                                                       {
                                                         self->drawLoopCallback(invalidated);
                                                       }
                                                     });
  }

  void RNSkBaseDrawView::drawLoopCallback(bool invalidated)
  {
    if (_redrawRequestCounter > 0 || _drawingMode == RNSkDrawingMode::Continuous)
    {
      _redrawRequestCounter = 0;
      performDraw();
    }
  }

  void RNSkBaseDrawView::endDrawingLoop()
  {
    if (_drawingLoopId != 0)
    {
      _drawingLoopId = 0;
      _platformContext->endDrawLoop(_nativeId);
    }
  }

  void RNSkBaseDrawView::setDrawingMode(RNSkDrawingMode mode)
  {
    if (mode == _drawingMode || _nativeId == 0)
    {
      return;
    }
    _drawingMode = mode;
  }

} // namespace RNSkia
