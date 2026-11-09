#include "JniPlatformContext.h"

#include <fcntl.h>

#include <cerrno>
#include <exception>
#include <system_error>
#include <thread>
#include <utility>

#include "RNSkMainThreadTasks.h"

#include "include/core/SkData.h"
#include "include/core/SkRefCnt.h"
#include "include/core/SkStream.h"
#include "include/core/SkTypes.h"

#include "RNDawnContext.h"
#include "RNSkJsiViewApi.h"
#include "RNSkView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

using TSelf = jni::local_ref<JniPlatformContext::jhybriddata>;

void JniPlatformContext::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", JniPlatformContext::initHybrid),
      makeNativeMethod("duplicateMainThreadWakeup",
                       JniPlatformContext::duplicateMainThreadWakeup),
      makeNativeMethod("runMainThreadTasks",
                       JniPlatformContext::runMainThreadTasks),
      makeNativeMethod("setForegroundNative",
                       JniPlatformContext::setForegroundNative),
      makeNativeMethod("setCacheDirectoryNative",
                       JniPlatformContext::setCacheDirectoryNative),
      makeNativeMethod("setPixelDensityNative",
                       JniPlatformContext::setPixelDensity),
  });
}

void JniPlatformContext::setForegroundNative(jni::alias_ref<jclass>,
                                             jboolean foreground) {
  DawnContext::setForeground(foreground == JNI_TRUE);
}

void JniPlatformContext::setCacheDirectoryNative(
    jni::alias_ref<jclass>, jni::alias_ref<jni::JString> directory) {
  if (directory) {
    DawnContext::setCacheDirectory(directory->toStdString());
  }
}

TSelf JniPlatformContext::initHybrid(jni::alias_ref<jhybridobject> jThis,
                                     float pixelDensity) {
  return makeCxxInstance(jThis, pixelDensity);
}

void JniPlatformContext::setPixelDensity(float pixelDensity) {
  std::shared_ptr<RNSkPlatformContext> context;
  {
    std::lock_guard<std::mutex> lock(_platformContextMutex);
    if (_pixelDensity.exchange(pixelDensity) == pixelDensity) {
      return;
    }
    context = _platformContext.lock();
    if (context != nullptr) {
      context->setPixelDensity(pixelDensity);
    }
  }
  if (context == nullptr) {
    return;
  }
  // The surfaces may keep their size in pixels: the views record their
  // content again at the new scale.
  for (const auto &view : ViewRegistry::getInstance().getViews()) {
    view->requestRedraw();
  }
}

void JniPlatformContext::setPlatformContext(
    const std::shared_ptr<RNSkPlatformContext> &context) {
  std::lock_guard<std::mutex> lock(_platformContextMutex);
  _platformContext = context;
  // The density may have changed since the context was made.
  context->setPixelDensity(_pixelDensity.load());
}

void JniPlatformContext::performStreamOperation(
    const std::string &sourceUri,
    const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) {
  static auto method = javaPart_->getClass()->getMethod<jbyteArray(jstring)>(
      "getJniStreamFromSource");

  auto loader = [=, this]() -> void {
    jni::ThreadScope ts;
    jstring jstr =
        (*jni::Environment::current()).NewStringUTF(sourceUri.c_str());

    // Get the array with data from input stream from Java
    auto array = method(javaPart_.get(), jstr);

    if (array == nullptr) {
      // Nothing at the uri: the caller is told rather than left waiting.
      op(nullptr);
      return;
    }

    // Allocate buffer for java byte array
    jsize num_bytes = jni::Environment::current()->GetArrayLength(array.get());
    char *buffer = reinterpret_cast<char *>(malloc(num_bytes + 1));

    if (!buffer) {
      op(nullptr);
      return;
    }

    jbyte *elements =
        jni::Environment::current()->GetByteArrayElements(array.get(), nullptr);
    if (!elements) {
      free(buffer);
      op(nullptr);
      return;
    }

    // Copy data from java array to buffer
    memcpy(buffer, elements, num_bytes);
    buffer[num_bytes] = 0;

    jni::Environment::current()->ReleaseByteArrayElements(array.get(), elements,
                                                          JNI_ABORT);

    // Copy malloced data and give ownership to SkData
    auto data = SkData::MakeFromMalloc(buffer, num_bytes);
    auto skStream = SkMemoryStream::Make(data);

    // Perform operation
    op(std::move(skStream));
  };

  // Fire and forget the thread - will be resolved on completion
  std::thread(loader).detach();
}

void JniPlatformContext::runTaskOnMainThread(std::function<void()> task) {
  MainThreadTasks::getInstance().post(std::move(task));
}

int JniPlatformContext::duplicateMainThreadWakeup(jni::alias_ref<jclass>) {
  int duplicate =
      fcntl(MainThreadTasks::getInstance().wakeup(), F_DUPFD_CLOEXEC, 0);
  if (duplicate == -1) {
    throw std::system_error(errno, std::generic_category(), "dup");
  }
  return duplicate;
}

void JniPlatformContext::runMainThreadTasks(jni::alias_ref<jclass>) {
  MainThreadTasks::getInstance().run();
}

void JniPlatformContext::raiseError(const std::exception &err) {
  jni::ThreadScope ts;
  static auto method =
      javaPart_->getClass()->getMethod<void(std::string)>("raise");
  method(javaPart_.get(), std::string(err.what()));
}

} // namespace RNSkia
