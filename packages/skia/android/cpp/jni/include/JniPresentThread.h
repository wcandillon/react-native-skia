#pragma once

#include <utility>

#include <fbjni/fbjni.h>

#include "JsiSkDispatcher.h"
#include "RNSkLog.h"
#include "RNSkLooperTasks.h"

namespace RNSkia {
namespace jni = facebook::jni;

/**
 * The JNI side of PresentThread, the thread every canvas presents on: the
 * thread runs its dispatcher's queue from its looper (see
 * Dispatcher::bindCurrentThread), so that it trims what it records once idle
 * (see RNSkThreadTrims). PresentThread binds it as the thread's first task,
 * where the looper can watch an eventfd.
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
  // On the present thread itself. What is posted to it wakes its looper
  // through an eventfd, as the main thread's tasks do, so the posting thread
  // calls no Java. Without one the thread runs no surface call that would run
  // its queue, so it never trims.
  static void bindDispatcher(jni::alias_ref<jclass>) {
    auto scheduler = LooperTasks::schedulerForCurrentThread();
    if (!scheduler) {
      RNSkLogger::logToConsole("The present thread could not watch an eventfd: "
                               "its recorders are not trimmed");
      return;
    }
    Dispatcher::bindCurrentThread(std::move(scheduler));
  }
};

} // namespace RNSkia
