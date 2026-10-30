#pragma once

#include <exception>
#include <string>
#include <utility>

#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>

#include "JsiSkDispatcher.h"
#include "RNSkLog.h"

namespace RNSkia {
namespace jni = facebook::jni;

/**
 * The JNI side of PresentThread, the thread every canvas presents on: the
 * thread runs its dispatcher's queue from its looper (see
 * Dispatcher::bindCurrentThread), so that it trims what it records once idle
 * (see RNSkThreadTrims). PresentThread binds it as the thread's first task.
 */
class JniPresentThread : public jni::JavaClass<JniPresentThread> {
public:
  static auto constexpr kJavaDescriptor =
      "Lcom/reactnative/skia/PresentThread;";

  static void registerNatives() {
    javaClassStatic()->registerNatives(
        {makeNativeMethod("bindDispatcher", JniPresentThread::bindDispatcher)});
  }

private:
  // On the present thread itself, which bindCurrentThread binds. A Scheduler
  // must not throw and says whether it posted (see Dispatcher), and a call
  // into Java throws what Java threw; the std::string overload of
  // logToConsole shares no buffer across the threads that post here.
  static void bindDispatcher(jni::alias_ref<jclass>) {
    static const auto post =
        javaClassStatic()
            ->getStaticMethod<void(jni::alias_ref<jni::JRunnable::javaobject>)>(
                "post");
    Dispatcher::bindCurrentThread([](Dispatcher::Operation operation) {
      try {
        jni::ThreadScope threadScope;
        post(javaClassStatic(),
             jni::JNativeRunnable::newObjectCxxArgs(std::move(operation)));
        return true;
      } catch (const std::exception &error) {
        RNSkLogger::logToConsole(
            std::string("Could not post to the present thread: ") +
            error.what());
        return false;
      }
    });
  }
};

} // namespace RNSkia
