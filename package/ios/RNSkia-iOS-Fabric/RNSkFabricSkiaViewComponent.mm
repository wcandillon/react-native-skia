#import "RNSkFabricSkiaViewComponent.h"

 #import <react/renderer/components/rnskia/EventEmitters.h>
 #import <react/renderer/components/rnskia/Props.h>
 #import <react/renderer/components/rnskia/RCTComponentViewHelpers.h>
 #import <react/renderer/components/rnskia/ComponentDescriptors.h>
 #import <react/renderer/components/rnskia/ShadowNodes.h>

 #import "RCTConversions.h"
 #import "RCTFabricComponentsPlugins.h"

 #import <React/RCTBridge+Private.h>
 #import <RNSkiaModule.h>
 #import <SkiaDrawView.h>
 #import <RNSkManager.h>

 using namespace facebook::react;

 @interface RNSkFabricSkiaViewComponent () <RCTReactNativeSkiaViewViewProtocol>
 @end

 @implementation RNSkFabricSkiaViewComponent {
   SkiaDrawView* _drawView;
 }

 - (instancetype)initWithFrame:(CGRect)frame
 {
   if (self = [super initWithFrame:frame]) {
     static const auto defaultProps = std::make_shared<const ReactNativeSkiaViewProps>();
     _props = defaultProps;
   }

   return self;
 }

 - (void) willMoveToSuperview:(UIView *)newSuperview {
   if(newSuperview == NULL) {
     if(_drawView != NULL) {
       [_drawView removeFromSuperview];
       _drawView = NULL;
     }
   } else {
     // Get the Skia module
     auto skiaModule = (RNSkiaModule*)[RCTBridge.currentBridge moduleForName:@"RNSkia"];
     if(skiaModule != NULL) {
       const auto &props = *std::static_pointer_cast<const ReactNativeSkiaViewProps>(_props);
       _drawView = [[SkiaDrawView alloc] initWithManager:[skiaModule manager].skManager.get()];
       size_t nativeId = std::atoi(props.nativeID.c_str());
       [_drawView setNativeId:nativeId];
       if(props.mode == ReactNativeSkiaViewMode::Continuous) {
         [_drawView setDrawingMode:"continuous"];
       } else {
         [_drawView setDrawingMode:"default"];
       }
       [_drawView setDebugMode:props.debug];
       _drawView.backgroundColor = UIColor.whiteColor;
       self.contentView = _drawView;
     }
   }
 }

 #pragma mark - RCTComponentViewProtocol

 + (ComponentDescriptorProvider)componentDescriptorProvider
 {
   return concreteComponentDescriptorProvider<ReactNativeSkiaViewComponentDescriptor>();
 }

 - (void)updateProps:(const facebook::react::Props::Shared &)props oldProps:(const facebook::react::Props::Shared &)oldProps {
   const auto &newSkiaViewProps = *std::static_pointer_cast<const ReactNativeSkiaViewProps>(props);

   if(_drawView != NULL) {
     size_t nativeId = std::atoi(newSkiaViewProps.nativeID.c_str());
     [_drawView setNativeId:nativeId];
     if(newSkiaViewProps.mode == ReactNativeSkiaViewMode::Continuous) {
       [_drawView setDrawingMode:"continuous"];
     } else {
       [_drawView setDrawingMode:"default"];
     }
     [_drawView setDebugMode:newSkiaViewProps.debug];
   }

   [super updateProps:props oldProps:oldProps];
 }

 @end

 Class<RCTComponentViewProtocol> ReactNativeSkiaViewCls(void)
 {
   return RNSkFabricSkiaViewComponent.class;
 }