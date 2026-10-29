#import <memory>

#import "RNSkApplePlatformContext.h"
#import "RNSkMetalCanvasProvider.h"
#import "RNSkView.h"

class RNSkBaseAppleView {
public:
  virtual CALayer *getLayer() = 0;
  virtual void setSize(CGFloat width, CGFloat height) = 0;
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

  void setSize(CGFloat width, CGFloat height) override {
    std::static_pointer_cast<RNSkMetalCanvasProvider>(this->getCanvasProvider())
        ->setSize(width, height);
  }

  std::shared_ptr<RNSkia::RNSkView> getDrawView() override {
    return this->shared_from_this();
  }
};
