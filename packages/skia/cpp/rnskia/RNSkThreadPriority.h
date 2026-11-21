#pragma once

#include <string>

#if defined(__APPLE__)
#include <pthread.h>
#include <pthread/qos.h>
#elif defined(__ANDROID__)
#include <pthread.h>
#include <sys/resource.h>
#endif

namespace RNSkia {

/** How soon the work of one of the library's threads is needed. */
enum class RNSkThreadPriority {
  // Frames, presented on the next vsync: the class the UI uses.
  kDisplay,
  // Housekeeping that nothing waits for.
  kBackground,
};

#if defined(__APPLE__)
inline qos_class_t qosClassOf(RNSkThreadPriority priority) {
  switch (priority) {
  case RNSkThreadPriority::kDisplay:
    return QOS_CLASS_USER_INTERACTIVE;
  case RNSkThreadPriority::kBackground:
    return QOS_CLASS_UTILITY;
  }
  __builtin_unreachable();
}
#elif defined(__ANDROID__)
// ANDROID_PRIORITY_DISPLAY and ANDROID_PRIORITY_BACKGROUND.
inline int niceValueOf(RNSkThreadPriority priority) {
  switch (priority) {
  case RNSkThreadPriority::kDisplay:
    return -4;
  case RNSkThreadPriority::kBackground:
    return 10;
  }
  __builtin_unreachable();
}
#endif

/** Names the calling thread, as traces show it, and gives it `priority`. */
inline void configureCurrentThread(const std::string &name,
                                   RNSkThreadPriority priority) {
#if defined(__APPLE__)
  pthread_setname_np(name.c_str());
  pthread_set_qos_class_self_np(qosClassOf(priority), 0);
#elif defined(__ANDROID__)
  pthread_setname_np(pthread_self(), name.c_str());
  // With PRIO_PROCESS and who = 0, Linux applies the nice value to the
  // calling thread only.
  setpriority(PRIO_PROCESS, 0, niceValueOf(priority));
#else
  (void)name;
  (void)priority;
#endif
}

} // namespace RNSkia
