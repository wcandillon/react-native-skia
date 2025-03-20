#pragma once

#import <memory>

#import "RNSkMetalCanvasProvider.h"
#import "RNSkView.h"
#import "RNSkApplePlatformContext.h"

class RNSkBaseAppleView {
public:
  virtual CALayer *getLayer() = 0;
  virtual void setSize(int width, int height) = 0;
  virtual std::shared_ptr<RNSkia::RNSkView> getDrawView() = 0;
};

template <class T> class RNSkAppleView : public RNSkBaseAppleView, public T {
public:
  RNSkAppleView(std::shared_ptr<RNSkia::RNSkPlatformContext> context)
      : T(context,
          std::make_shared<RNSkMetalCanvasProvider>(
              std::bind(&RNSkia::RNSkView::requestRedraw, this), context)) {}

  CALayer *getLayer() override {
    return std::static_pointer_cast<RNSkMetalCanvasProvider>(
               this->getCanvasProvider())
        ->getLayer();
  }

  void setSize(int width, int height) override {
    std::static_pointer_cast<RNSkMetalCanvasProvider>(this->getCanvasProvider())
        ->setSize(width, height);
  }

  std::shared_ptr<RNSkia::RNSkView> getDrawView() override {
    return this->shared_from_this();
  }
};
