#import "RNSkApplePlatformContext.h"

#import <React/RCTUtils.h>
#include <set>
#include <thread>
#include <utility>

#include "RNDawnContext.h"

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

    auto bytes = [data bytes];
    auto skData = SkData::MakeWithCopy(bytes, [data length]);
    auto stream = SkMemoryStream::Make(skData);

    op(std::move(stream));
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

std::string RNSkApplePlatformContext::getCacheDirectory() {
  NSArray<NSString *> *paths = NSSearchPathForDirectoriesInDomains(
      NSCachesDirectory, NSUserDomainMask, YES);
  NSString *directory = paths.firstObject;
  if (directory == nil) {
    RNSkLogger::logToConsole("The app has no caches directory. Pipelines will "
                             "not be cached on disk.");
    return "";
  }
  return std::string([directory UTF8String]);
}

void RNSkApplePlatformContext::runOnMainThread(std::function<void()> func) {
  dispatch_async(dispatch_get_main_queue(), ^{
    func();
  });
}

sk_sp<SkImage>
RNSkApplePlatformContext::takeScreenshotFromViewTag(size_t viewTag) {
  return [_screenshotService
      screenshotOfViewWithTag:[NSNumber numberWithLong:viewTag]];
}

} // namespace RNSkia
