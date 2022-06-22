//
// Created by Christian Falch on 23/08/2021.
//

#include "RNSkDrawView.h"

#include <chrono>
#include <functional>
#include <sstream>
#include <string>
#include <memory>
#include <vector>
#include <utility>

#include <JsiSkCanvas.h>
#include <RNSkLog.h>
#include <RNSkPlatformContext.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkBBHFactory.h>
#include <SkCanvas.h>
#include <SkFont.h>
#include <SkFontTypes.h>
#include <SkGraphics.h>
#include <SkPaint.h>
#include <SkPictureRecorder.h>
#include <SkSurface.h>
#include <SkRect.h>

#pragma clang diagnostic pop

namespace RNSkia {

using namespace std::chrono;

RNSkDrawView::RNSkDrawView(std::shared_ptr<RNSkPlatformContext> context)
    : _jsiCanvas(std::make_shared<JsiSkCanvas>(context)),
      _platformContext(std::move(context)),
      _infoObject(std::make_shared<RNSkInfoObject>()),
      _jsDrawingLock(std::make_shared<std::timed_mutex>()),
      _gpuDrawingLock(std::make_shared<std::timed_mutex>()),
      _jsTimingInfo("SKIA/JS"),
      _gpuTimingInfo("SKIA/GPU")
      {}

RNSkDrawView::~RNSkDrawView() {}

void RNSkDrawView::setNativeId(size_t nativeId) {
  _nativeId = nativeId;
}

void RNSkDrawView::setDrawCallback(std::shared_ptr<jsi::Function> callback) {

  if (callback == nullptr) {
    _drawCallback = nullptr;
    return;
  }
  
  // Reset timing info
  _jsTimingInfo.reset();
  _gpuTimingInfo.reset();
  
  // Create draw drawCallback wrapper
  _drawCallback = std::make_shared<RNSkDrawCallback>(
      [weakSelf = weak_from_this(),
       callback = std::move(callback)](std::shared_ptr<JsiSkCanvas> canvas,
                                       int width,
                                       int height,
                                       double timestamp,
                                       std::shared_ptr<RNSkPlatformContext> context) {

       auto self = weakSelf.lock();
       if(self) {
         auto runtime = context->getJsRuntime();
                           
         // Update info parameter
         self->_infoObject->beginDrawOperation(width, height, timestamp);
         
         // Set up arguments array
         std::vector<jsi::Value> args(2);
         args[0] = jsi::Object::createFromHostObject(*runtime, canvas);
         args[1] = jsi::Object::createFromHostObject(*runtime, self->_infoObject);

         // To be able to call the drawing function we'll wrap it once again
         callback->call(*runtime,
                        static_cast<const jsi::Value *>(args.data()),
                        (size_t)2);
         
         // Reset touches
         self->_infoObject->endDrawOperation();
                           
        // Draw debug overlays
        if (self->_showDebugOverlay) {

          // Display average rendering timer
          auto jsAvg = self->_jsTimingInfo.getAverage();
          //auto jsFps = _jsTimingInfo.getFps();
          
          auto gpuAvg = self->_gpuTimingInfo.getAverage();
          //auto gpuFps = _gpuTimingInfo.getFps();
          
          auto total = jsAvg + gpuAvg;
          
          // Build string
          std::ostringstream stream;
          stream << "js: " << jsAvg << "ms gpu: " << gpuAvg << "ms " << " total: " << total << "ms";
          
          std::string debugString = stream.str();

          // Set up debug font/paints
          auto font = SkFont();
          font.setSize(14);
          auto paint = SkPaint();
          paint.setColor(SkColors::kRed);
          canvas->getCanvas()->drawSimpleText(
           debugString.c_str(), debugString.size(), SkTextEncoding::kUTF8, 8,
           18, font, paint);
        }
      }
    });

  // Request redraw
  requestRedraw();
}

void RNSkDrawView::drawInCanvas(std::shared_ptr<JsiSkCanvas> canvas,
                                int width,
                                int height,
                                double time) {
  
  // Call the draw drawCallback and perform js based drawing
  auto skCanvas = canvas->getCanvas();
  if (_drawCallback != nullptr && skCanvas != nullptr) {
    // Make sure to scale correctly
    auto pd = _platformContext->getPixelDensity();
    skCanvas->save();
    skCanvas->scale(pd, pd);
    
    // Call draw function.
    (*_drawCallback)(canvas, width / pd, height / pd, time, _platformContext);
    
    // Restore and flush canvas
    skCanvas->restore();
    skCanvas->flush();
  }
}

sk_sp<SkImage> RNSkDrawView::makeImageSnapshot(std::shared_ptr<SkRect> bounds) {
  // Assert width/height
  auto surface = SkSurface::MakeRasterN32Premul(getScaledWidth(), getScaledHeight());
  auto canvas = surface->getCanvas();
  auto jsiCanvas = std::make_shared<JsiSkCanvas>(_platformContext);
  jsiCanvas->setCanvas(canvas);
  
  milliseconds ms = duration_cast<milliseconds>(
      system_clock::now().time_since_epoch());
  
  drawInCanvas(jsiCanvas, getScaledWidth(), getScaledHeight(), ms.count() / 1000);
  
  if(bounds != nullptr) {
    SkIRect b = SkIRect::MakeXYWH(bounds->x(), bounds->y(), bounds->width(), bounds->height());
    return surface->makeImageSnapshot(b);
  } else {
    return surface->makeImageSnapshot();
  }
}

void RNSkDrawView::updateTouchState(std::vector<RNSkTouchPoint>&& points) {
  _infoObject->updateTouches(std::move(points));
  requestRedraw();
}

sk_sp<SkPicture> RNSkDrawView::performDraw() {
  if(_redrawRequestCounter > 0 || _drawingMode == RNSkDrawingMode::Continuous) {

    _redrawRequestCounter = 0;

    // Start timing
    _jsTimingInfo.beginTiming();

    // Record the drawing operations on the JS thread so that we can
    // move the actual drawing onto the render thread later
    SkPictureRecorder recorder;
    SkRTreeFactory factory;
    SkCanvas *canvas = recorder.beginRecording(getScaledWidth(), getScaledHeight(), &factory);
    _jsiCanvas->setCanvas(canvas);

    // Get current milliseconds
    milliseconds ms = duration_cast<milliseconds>(
            system_clock::now().time_since_epoch());

    try {
        // Perform the javascript drawing
        // drawInCanvas(_jsiCanvas, getScaledWidth(), getScaledHeight(), ms.count() / 1000.0);

        SkPaint paint;
        paint.setColor(SK_ColorGREEN);
        canvas->drawCircle(20, 20, 10, paint);

    } catch (...) {
        _jsTimingInfo.stopTiming();
        _jsDrawingLock->unlock();
        throw;
    }

    // Finish drawing operations
    auto p = recorder.finishRecordingAsPicture();

    // Unlock JS drawing
    _jsDrawingLock->unlock();

    return p;
  }
  return nullptr;
}

void RNSkDrawView::requestRedraw() {
  _redrawRequestCounter++;
}

void RNSkDrawView::setDrawingMode(RNSkDrawingMode mode) {
  if(mode == _drawingMode || _nativeId == 0) {
    return;
  }
  _drawingMode = mode;
}

} // namespace RNSkia
