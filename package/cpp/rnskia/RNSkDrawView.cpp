#include "RNSkDrawView.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkBBHFactory.h>
#include <SkPictureRecorder.h>

#pragma clang diagnostic pop

namespace RNSkia {

using namespace std::chrono;

RNSkDrawView::RNSkDrawView(std::shared_ptr<RNSkRenderer> renderer,
                           std::shared_ptr<RNSkPlatformContext> context)
    : RNSkBaseDrawView(renderer, context),
      _jsiCanvas(std::make_shared<JsiSkCanvas>(context)),
      _infoObject(std::make_shared<RNSkInfoObject>()),
      _jsDrawingLock(std::make_shared<std::timed_mutex>()),
      _gpuDrawingLock(std::make_shared<std::timed_mutex>()),
      _jsTimingInfo("SKIA/JS"),
      _gpuTimingInfo("SKIA/GPU") {}

void RNSkDrawView::setDrawCallback(std::shared_ptr<jsi::Function> callback) {

  if (callback == nullptr) {
    _drawCallback = nullptr;
    // We can just reset everything - this is a signal that we're done.
    // TODO: endDrawingLoop(); ???
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
         auto selfDrawView = std::dynamic_pointer_cast<RNSkDrawView>(self);
                           
         // Update info parameter
         selfDrawView->_infoObject->beginDrawOperation(width, height, timestamp);
         
         // Set up arguments array
         std::vector<jsi::Value> args(2);
         args[0] = jsi::Object::createFromHostObject(*runtime, canvas);
         args[1] = jsi::Object::createFromHostObject(*runtime, selfDrawView->_infoObject);

         // To be able to call the drawing function we'll wrap it once again
         callback->call(*runtime,
                        static_cast<const jsi::Value *>(args.data()),
                        (size_t)2);
         
         // Reset touches
         selfDrawView->_infoObject->endDrawOperation();
                           
        // Draw debug overlays
        if (self->getShowDebugOverlays()) {

          // Display average rendering timer
          auto jsAvg = selfDrawView->_jsTimingInfo.getAverage();
          //auto jsFps = _jsTimingInfo.getFps();
          
          auto gpuAvg = selfDrawView->_gpuTimingInfo.getAverage();
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

void RNSkDrawView::updateTouchState(std::vector<RNSkTouchPoint> &points) {
  RNSkBaseDrawView::updateTouchState(points);
  _infoObject->updateTouches(points);
}

void RNSkDrawView::renderToJsiCanvas(std::shared_ptr<JsiSkCanvas> canvas,
                                     int width,
                                     int height,
                                     double time) {
  
  // Call the draw drawCallback and perform js based drawing
  auto skCanvas = canvas->getCanvas();
  if (_drawCallback != nullptr && skCanvas != nullptr) {
    // Make sure to scale correctly
    auto pd = getPlatformContext()->getPixelDensity();
    skCanvas->save();
    skCanvas->scale(pd, pd);
    
    // Call draw function.
    (*_drawCallback)(canvas, width / pd, height / pd, time, getPlatformContext());
    
    // Restore and flush canvas
    skCanvas->restore();
    skCanvas->flush();
  }
}

sk_sp<SkImage> RNSkDrawView::makeImageSnapshot(std::shared_ptr<SkRect> bounds) {
  // Assert width/height
  auto surface = SkSurface::MakeRasterN32Premul(getRenderer()->getScaledWidth(), getRenderer()->getScaledHeight());
  auto canvas = surface->getCanvas();
  auto jsiCanvas = std::make_shared<JsiSkCanvas>(getPlatformContext());
  jsiCanvas->setCanvas(canvas);
  
  milliseconds ms = duration_cast<milliseconds>(
      system_clock::now().time_since_epoch());

  renderToJsiCanvas(jsiCanvas, getRenderer()->getScaledWidth(), getRenderer()->getScaledHeight(), ms.count() / 1000);
  
  if(bounds != nullptr) {
    SkIRect b = SkIRect::MakeXYWH(bounds->x(), bounds->y(), bounds->width(), bounds->height());
    return surface->makeImageSnapshot(b);
  } else {
    return surface->makeImageSnapshot();
  }
}

void RNSkDrawView::performDraw() {
  
  // We render on the javascript thread.
  if (_jsDrawingLock->try_lock())
  {
    getPlatformContext()->runOnJavascriptThread([weakSelf = weak_from_this(), this]()
                                            {
      auto self = weakSelf.lock();
      if(self) {
        auto selfDrawView = std::dynamic_pointer_cast<RNSkDrawView>(self);
        
        // Start timing
        selfDrawView->_jsTimingInfo.beginTiming();

        // Record the drawing operations on the JS thread so that we can
        // move the actual drawing onto the render thread later
        SkPictureRecorder recorder;
        SkRTreeFactory factory;
        SkCanvas *canvas = recorder.beginRecording(
                selfDrawView->getRenderer()->getScaledWidth(),
                selfDrawView->getRenderer()->getScaledHeight(),
                &factory);
        
        selfDrawView->_jsiCanvas->setCanvas(canvas);

        // Get current milliseconds
        milliseconds ms = duration_cast<milliseconds>(
            system_clock::now().time_since_epoch());

        try
        {
          // Perform the javascript drawing
          renderToJsiCanvas(_jsiCanvas, selfDrawView->getRenderer()->getScaledWidth(),
                            selfDrawView->getRenderer()->getScaledHeight(), ms.count() / 1000.0);
        }
        catch (...)
        {
          selfDrawView->_jsTimingInfo.stopTiming();
          selfDrawView->_jsDrawingLock->unlock();
          throw;
        }

        // Finish drawing operations
        auto p = recorder.finishRecordingAsPicture();

        // Calculate duration
        selfDrawView->_jsTimingInfo.stopTiming();

        if (selfDrawView->_gpuDrawingLock->try_lock())
        {
          // Post drawing message to the render thread where the picture recorded
          // will be sent to the GPU/backend for rendering to screen.
          auto gpuLock = selfDrawView->_gpuDrawingLock;
          getPlatformContext()->runOnRenderThread([weakSelf = weak_from_this(), p = std::move(p), gpuLock]()
                                              {
            auto self = weakSelf.lock();
            if (self) {
              auto selfDrawView = std::dynamic_pointer_cast<RNSkDrawView>(self);
              // Draw the picture recorded on the real GPU canvas
              selfDrawView->_gpuTimingInfo.beginTiming();
              selfDrawView->getRenderer()->renderToSkCanvas([p = std::move(p)](SkCanvas *canvas) {
                  canvas->drawPicture(p);
              });
              selfDrawView->_gpuTimingInfo.stopTiming();
            }
          // Unlock GPU drawing
          gpuLock->unlock(); });
        }
        else
        {
      #ifdef DEBUG
          selfDrawView->_gpuTimingInfo.markSkipped();
      #endif
          // Request a new redraw since the last frame was skipped.
          selfDrawView->requestRedraw();
        }

        // Unlock JS drawing
        selfDrawView->_jsDrawingLock->unlock();
      }
      });
    }
    else
    {
  #ifdef DEBUG
      _jsTimingInfo.markSkipped();
  #endif
      requestRedraw();
    }
  }
} // namespace RNSkia
