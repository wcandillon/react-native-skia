#pragma once

#include <exception>
#include <functional>
#include <memory>
#include <string>

#include "RNDawnContext.h"

#include "JniPlatformContext.h"
#include "RNSkLooperTasks.h"
#include "RNSkPlatformContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/ports/SkFontMgr_android.h"
#include "include/ports/SkFontScanner_FreeType.h"

#pragma clang diagnostic pop

namespace RNSkia {

class RNSkAndroidPlatformContext : public RNSkPlatformContext {
public:
  RNSkAndroidPlatformContext(
      JniPlatformContext *jniPlatformContext,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
      : RNSkPlatformContext(std::move(jsCallInvoker),
                            jniPlatformContext->getPixelDensity()),
        _jniPlatformContext(jniPlatformContext) {}

  ~RNSkAndroidPlatformContext() override = default;

  void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) override {
    _jniPlatformContext->performStreamOperation(sourceUri, op);
  }

  void raiseError(const std::exception &err) override {
    _jniPlatformContext->raiseError(err);
  }

  sk_sp<SkSurface> makeOffscreenSurface(int width, int height,
                                        bool useP3ColorSpace = false) override {
    return DawnContext::getInstance().MakeOffscreen(width, height,
                                                    useP3ColorSpace);
  }

  sk_sp<SkFontMgr> createFontMgr() override {
    return SkFontMgr_New_Android(nullptr, SkFontScanner_Make_FreeType());
  }

  void runOnMainThread(std::function<void()> task) override {
    _jniPlatformContext->runTaskOnMainThread(std::move(task));
  }

  // The CallInvoker wakes an idle JS thread through Java
  // (JMessageQueueThread::runOnQueue), which attaches the posting thread and
  // so can end the process when Java's heap is full. The JS thread is a
  // looper thread: it is woken through an eventfd, as the main thread is.
  Dispatcher::Scheduler makeJavascriptThreadScheduler() override {
    auto tasks = LooperTasks::forCurrentThread();
    if (tasks == nullptr) {
      return RNSkPlatformContext::makeJavascriptThreadScheduler();
    }
    return [tasks](Dispatcher::Operation operation) {
      tasks->post(std::move(operation));
    };
  }

private:
  JniPlatformContext *_jniPlatformContext;
};

} // namespace RNSkia
