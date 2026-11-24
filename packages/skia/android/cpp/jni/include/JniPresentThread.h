#pragma once

#include <fbjni/fbjni.h>
#include <jni.h>

#include <utility>

namespace RNSkia {

/**
 * Hands a Java exception to the uncaught exception handler of the calling
 * thread, as the runtime does for a thread of its own: the app's crash
 * reporting gets the Java stack, and the default handler ends the process.
 */
inline void reportUncaughtJavaException(JNIEnv *env, jthrowable throwable) {
  jclass threadClass = env->FindClass("java/lang/Thread");
  jmethodID currentThread = env->GetStaticMethodID(threadClass, "currentThread",
                                                   "()Ljava/lang/Thread;");
  jobject thread = env->CallStaticObjectMethod(threadClass, currentThread);
  jmethodID getHandler =
      env->GetMethodID(threadClass, "getUncaughtExceptionHandler",
                       "()Ljava/lang/Thread$UncaughtExceptionHandler;");
  jobject handler = env->CallObjectMethod(thread, getHandler);
  jclass handlerClass =
      env->FindClass("java/lang/Thread$UncaughtExceptionHandler");
  jmethodID uncaughtException =
      env->GetMethodID(handlerClass, "uncaughtException",
                       "(Ljava/lang/Thread;Ljava/lang/Throwable;)V");
  env->CallVoidMethod(handler, uncaughtException, thread, throwable);
  // A handler that returns, or throws itself, leaves the thread running.
  env->ExceptionClear();
  env->DeleteLocalRef(handlerClass);
  env->DeleteLocalRef(handler);
  env->DeleteLocalRef(thread);
  env->DeleteLocalRef(threadClass);
}

/**
 * Runs a call into Java made from the present thread, which is the native
 * side's (see rnsurface::RenderThread): no Java frame is below it to take
 * an exception the call throws, which fbjni turns into a C++ one. Left to
 * unwind through the looper, that ends in std::terminate, a native abort
 * with no Java stack; a Java thread would have reported it as uncaught,
 * which is what happens here.
 */
template <typename Call> void callJavaFromPresentThread(Call &&call) {
  try {
    std::forward<Call>(call)();
  } catch (const facebook::jni::JniException &exception) {
    auto throwable = exception.getThrowable();
    reportUncaughtJavaException(facebook::jni::Environment::current(),
                                throwable.get());
  }
}

} // namespace RNSkia
