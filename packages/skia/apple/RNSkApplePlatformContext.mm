#import "RNSkApplePlatformContext.h"

#import <CoreVideo/CoreVideo.h>
#import <IOSurface/IOSurfaceRef.h>
#import <Metal/Metal.h>
#include <mach/kern_return.h>

#import <React/RCTUtils.h>
#include <chrono>
#include <cstdlib>
#include <set>
#include <thread>
#include <utility>

#include "RNDawnContext.h"
#import "SkiaPresentedImages.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFontMgr.h"
#include "include/core/SkSurface.h"

#include "include/ports/SkFontMgr_mac_ct.h"

#pragma clang diagnostic pop

namespace RNSkia {

void RNSkApplePlatformContext::performStreamOperation(
    const std::string &sourceUri,
    const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) {

  auto loader = [=]() {
    NSURL *url = [[NSURL alloc]
        initWithString:[NSString stringWithUTF8String:sourceUri.c_str()]];

    NSData *data = nullptr;
    auto scheme = url.scheme;
    auto extension = url.pathExtension;

    if (scheme == nullptr &&
        (extension == nullptr || [extension isEqualToString:@""])) {
      // If the extension and scheme is nil, we assume that we're trying to
      // load from the embedded iOS app bundle and will try to load image
      // and get data from the image directly. imageNamed will return the
      // best version of the requested image:
#if !TARGET_OS_OSX
      auto image = [UIImage imageNamed:[url absoluteString]];
#else
      auto image = [NSImage imageNamed:[url absoluteString]];
#endif // !TARGET_OS_OSX
      // We don't know the image format (png, jpg, etc) but
      // UIImagePNGRepresentation will support all of them
      data = UIImagePNGRepresentation(image);
    } else {
      // Load from metro / node
      data = [NSData dataWithContentsOfURL:url];
    }

    if (data == nil) {
      // Nothing at the uri: the caller is told rather than handed no bytes.
      op(nullptr);
      return;
    }
    auto skData = SkData::MakeWithCopy([data bytes], [data length]);
    op(SkMemoryStream::Make(skData));
  };

  // Fire and forget the thread - will be resolved on completion
  std::thread(loader).detach();
}

void RNSkApplePlatformContext::raiseError(const std::exception &err) {
  RCTFatal(RCTErrorWithMessage([NSString stringWithUTF8String:err.what()]));
}

bool RNSkApplePlatformContext::mainScreenSupportsP3() {
  static bool supportsP3 = false;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
#if !TARGET_OS_OSX
    supportsP3 =
        [UIScreen mainScreen].traitCollection.displayGamut == UIDisplayGamutP3;
#else
    NSColorSpace *screenColorSpace = [NSScreen mainScreen].colorSpace;
    supportsP3 =
        screenColorSpace != nil &&
        [screenColorSpace isEqual:[NSColorSpace displayP3ColorSpace]];
#endif // !TARGET_OS_OSX
  });
  return supportsP3;
}

sk_sp<SkSurface>
RNSkApplePlatformContext::makeOffscreenSurface(int width, int height,
                                               bool useP3ColorSpace) {
  return DawnContext::getInstance().MakeOffscreen(width, height,
                                                  useP3ColorSpace);
}

sk_sp<SkFontMgr> RNSkApplePlatformContext::createFontMgr() {
  return SkFontMgr_New_CoreText(nullptr);
}

std::vector<std::string> RNSkApplePlatformContext::getSystemFontFamilies() {
  std::vector<std::string> families;

  // System UI fonts (e.g., .AppleSystemUIFont) are not enumerated by Skia's
  // font manager. We retrieve them via Core Text's CTFontUIFontType constants.
  // This list covers common system font types as of iOS 17 / macOS 14.
  // Apple may add new CTFontUIFontType values in future OS versions,
  // so this list may need to be updated periodically.
  CTFontUIFontType fontTypes[] = {
      kCTFontUIFontUser,        kCTFontUIFontUserFixedPitch,
      kCTFontUIFontSystem,      kCTFontUIFontEmphasizedSystem,
      kCTFontUIFontSmallSystem, kCTFontUIFontSmallEmphasizedSystem,
      kCTFontUIFontMiniSystem,  kCTFontUIFontMiniEmphasizedSystem,
      kCTFontUIFontLabel,       kCTFontUIFontMessage,
      kCTFontUIFontToolTip,
  };

  std::set<std::string> uniqueFamilies;

  for (CTFontUIFontType fontType : fontTypes) {
    CTFontRef font = CTFontCreateUIFontForLanguage(fontType, 12.0, nullptr);
    if (font) {
      CFStringRef familyName = CTFontCopyFamilyName(font);
      if (familyName) {
        const char *cstr =
            CFStringGetCStringPtr(familyName, kCFStringEncodingUTF8);
        if (cstr) {
          uniqueFamilies.insert(std::string(cstr));
        } else {
          char buffer[256];
          if (CFStringGetCString(familyName, buffer, sizeof(buffer),
                                 kCFStringEncodingUTF8)) {
            uniqueFamilies.insert(std::string(buffer));
          }
        }
        CFRelease(familyName);
      }
      CFRelease(font);
    }
  }

  families.assign(uniqueFamilies.begin(), uniqueFamilies.end());
  return families;
}

std::string
RNSkApplePlatformContext::resolveFontFamily(const std::string &familyName) {
  // Handle special font family names like React Native does
  // See: RCTFont.mm in React Native
  if (familyName == "System" || familyName == "system" ||
      familyName == "sans-serif") {
    return ".AppleSystemUIFont";
  }
  if (familyName == "SystemCondensed" || familyName == "system-condensed") {
    // Return system font - condensed trait is handled via font style
    return ".AppleSystemUIFont";
  }
  // CSS generic font families
  if (familyName == "serif") {
    return "Times New Roman";
  }
  if (familyName == "monospace") {
    return "Courier New";
  }
  // Return as-is if no mapping exists
  return familyName;
}

void RNSkApplePlatformContext::observeApplicationState() {
#if !TARGET_OS_OSX
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    DawnContext::setForeground(
        UIApplication.sharedApplication.applicationState ==
        UIApplicationStateActive);
    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    [center addObserverForName:UIApplicationWillResignActiveNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      DawnContext::setForeground(false);
                    }];
    [center addObserverForName:UIApplicationDidBecomeActiveNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      DawnContext::setForeground(true);
                    }];
  });
#endif // !TARGET_OS_OSX
}

void RNSkApplePlatformContext::runOnMainThread(std::function<void()> func) {
  dispatch_async(dispatch_get_main_queue(), ^{
    func();
  });
}

namespace {

// A CGImage the image views show (see RNSkPresentedImages). Presents, failures
// and discards are queued on the main queue in the order they are made.
class ApplePresentedBitmap : public PresentedBitmap {
public:
  // Takes ownership of `image`.
  explicit ApplePresentedBitmap(CGImageRef image) : _image(image) {}

  ~ApplePresentedBitmap() override { CGImageRelease(_image); }

  void present(uint32_t id) override {
    CGImageRef image = CGImageRetain(_image);
    dispatch_async(dispatch_get_main_queue(), ^{
      [SkiaPresentedImages publishImage:image forId:id];
      CGImageRelease(image);
    });
  }

private:
  CGImageRef _image;
};

MTLSharedEventListener *sharedEventListener() {
  static MTLSharedEventListener *listener = [[MTLSharedEventListener alloc]
      initWithDispatchQueue:dispatch_queue_create("RNSkia presented images",
                                                  DISPATCH_QUEUE_SERIAL)];
  return listener;
}

// Done once every fence's MTLSharedEvent reaches its value.
class ApplePresentedDrawing : public PresentedDrawing {
public:
  static std::unique_ptr<ApplePresentedDrawing>
  of(const std::vector<wgpu::SharedFence> &fences,
     const std::vector<uint64_t> &signaledValues) {
    std::unique_ptr<ApplePresentedDrawing> drawing(new ApplePresentedDrawing());
    for (size_t i = 0; i < fences.size(); i++) {
      wgpu::SharedFenceMTLSharedEventExportInfo sharedEvent{};
      wgpu::SharedFenceExportInfo info{};
      info.nextInChain = &sharedEvent;
      fences[i].ExportInfo(&info);
      if (info.type != wgpu::SharedFenceType::MTLSharedEvent ||
          sharedEvent.sharedEvent == nullptr) {
        return nullptr;
      }
      id<MTLSharedEvent> event =
          (__bridge id<MTLSharedEvent>)sharedEvent.sharedEvent;
      const uint64_t value = i < signaledValues.size() ? signaledValues[i] : 0;
      if (event.signaledValue >= value) {
        continue;
      }
      dispatch_semaphore_t signaled = drawing->_signaled;
      [event notifyListener:sharedEventListener()
                    atValue:value
                      block:^(id<MTLSharedEvent>, uint64_t) {
                        dispatch_semaphore_signal(signaled);
                      }];
      drawing->_pending++;
    }
    return drawing;
  }

  bool waitFor(std::chrono::milliseconds slice) override {
    const auto deadline = dispatch_time(
        DISPATCH_TIME_NOW,
        std::chrono::duration_cast<std::chrono::nanoseconds>(slice).count());
    while (_pending > 0) {
      if (dispatch_semaphore_wait(_signaled, deadline) != 0) {
        return false;
      }
      _pending--;
    }
    return true;
  }

private:
  ApplePresentedDrawing() = default;

  dispatch_semaphore_t _signaled = dispatch_semaphore_create(0);
  size_t _pending = 0;
};

// Shown as a CGImage over the surface's memory, locked while the image lives.
class ApplePresentedBuffer : public PresentedBuffer {
public:
  // Takes ownership of `surface`.
  ApplePresentedBuffer(const SkImageInfo &info, IOSurfaceRef surface)
      : PresentedBuffer(info), _surface(surface) {}

  ~ApplePresentedBuffer() override { CFRelease(_surface); }

  ApplePresentedBuffer(const ApplePresentedBuffer &) = delete;
  ApplePresentedBuffer &operator=(const ApplePresentedBuffer &) = delete;

  wgpu::SharedTextureMemory import(const wgpu::Device &device) override {
    wgpu::SharedTextureMemoryIOSurfaceDescriptor ioSurface{};
    ioSurface.ioSurface = _surface;
    ioSurface.allowStorageBinding = false;
    wgpu::SharedTextureMemoryDescriptor descriptor{};
    descriptor.nextInChain = &ioSurface;
    return device.ImportSharedTextureMemory(&descriptor);
  }

  std::unique_ptr<PresentedDrawing>
  drawingOf(const std::vector<wgpu::SharedFence> &fences,
            const std::vector<uint64_t> &signaledValues) override {
    return ApplePresentedDrawing::of(fences, signaledValues);
  }

  std::shared_ptr<PresentedBitmap> finish() override {
    if (IOSurfaceLock(_surface, kIOSurfaceLockReadOnly, nullptr) !=
        KERN_SUCCESS) {
      return nullptr;
    }
    CFRetain(_surface);
    CGDataProviderRef provider = CGDataProviderCreateWithData(
        _surface, IOSurfaceGetBaseAddress(_surface),
        IOSurfaceGetAllocSize(_surface),
        [](void *surface, const void *, size_t) {
          auto *locked = static_cast<IOSurfaceRef>(surface);
          IOSurfaceUnlock(locked, kIOSurfaceLockReadOnly, nullptr);
          CFRelease(locked);
        });
    if (provider == nullptr) {
      IOSurfaceUnlock(_surface, kIOSurfaceLockReadOnly, nullptr);
      CFRelease(_surface);
      return nullptr;
    }
    const auto *drawnIn = getInfo().colorSpace();
    CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(
        drawnIn != nullptr && !drawnIn->isSRGB() ? kCGColorSpaceDisplayP3
                                                 : kCGColorSpaceSRGB);
    CGImageRef image = CGImageCreate(
        IOSurfaceGetWidth(_surface), IOSurfaceGetHeight(_surface), 8, 32,
        IOSurfaceGetBytesPerRow(_surface), colorSpace,
        static_cast<CGBitmapInfo>(kCGImageAlphaPremultipliedFirst) |
            kCGBitmapByteOrder32Little,
        provider, nullptr, false, kCGRenderingIntentDefault);
    CGColorSpaceRelease(colorSpace);
    CGDataProviderRelease(provider);
    if (image == nullptr) {
      return nullptr;
    }
    return std::make_shared<ApplePresentedBitmap>(image);
  }

private:
  IOSurfaceRef _surface;
};

} // namespace

std::optional<PresentedTarget>
RNSkApplePlatformContext::makePresentedTarget(const SkImageInfo &info) {
  NSDictionary *properties = @{
    (id)kIOSurfaceWidth : @(info.width()),
    (id)kIOSurfaceHeight : @(info.height()),
    (id)kIOSurfaceBytesPerElement : @4,
    (id)kIOSurfacePixelFormat : @(kCVPixelFormatType_32BGRA),
  };
  IOSurfaceRef surface = IOSurfaceCreate((__bridge CFDictionaryRef)properties);
  if (surface == nullptr) {
    return std::nullopt;
  }
  return PresentedTarget(
      Owned<PresentedBuffer>::make<ApplePresentedBuffer>(info, surface));
}

void RNSkApplePlatformContext::discardPresentedBitmap(uint32_t id) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [SkiaPresentedImages discardImageForId:id];
  });
}

void RNSkApplePlatformContext::presentFailure(uint32_t id) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [SkiaPresentedImages failImageForId:id];
  });
}

} // namespace RNSkia
