#ifdef RCT_NEW_ARCH_ENABLED
#import "SkiaPictureView.h"

#import "RNSkAppleView.h"
#import "RNSkPictureView.h"
#import "RNSkPlatformContext.h"

#import "RNSkiaModule.h"
#import "SkiaManager.h"
#import "SkiaUIView.h"

#import <React/RCTBridge+Private.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import <react/renderer/components/rnskia/ComponentDescriptors.h>
#import <react/renderer/components/rnskia/EventEmitters.h>
#import <react/renderer/components/rnskia/Props.h>
#import <react/renderer/components/rnskia/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation SkiaPictureView

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    // Pass SkManager as a raw pointer to avoid circular dependencies
    auto skManager = [SkiaManager latestActiveSkManager].get();
    [self initCommon:skManager
             factory:[](std::shared_ptr<RNSkia::RNSkPlatformContext> context) {
               return std::make_shared<RNSkAppleView<RNSkia::RNSkPictureView>>(
                   context);
             }];
    static const auto defaultProps =
        std::make_shared<const SkiaPictureViewProps>();
    _props = defaultProps;
  }
  return self;
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<
      SkiaPictureViewComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props
           oldProps:(const Props::Shared &)oldProps {
  const auto &newProps =
      *std::static_pointer_cast<const SkiaPictureViewProps>(props);
  [super updateProps:props oldProps:oldProps];
  int nativeId =
      [[RCTConvert NSString:RCTNSStringFromString(newProps.nativeId)] intValue];
  [self setNativeId:nativeId];
  [self setDebugMode:newProps.debug];
  [self setOpaque:newProps.opaque];
}

@end

Class<RCTComponentViewProtocol> SkiaPictureViewCls(void) {
  return SkiaPictureView.class;
}

#endif // RCT_NEW_ARCH_ENABLED
