#pragma once

#include <string>

#include <pthread.h>
#include <sys/resource.h>
#if defined(__ANDROID__)
#include <unistd.h>
#endif

namespace RNSkia {

/**
 * Scheduling priority of the calling thread: "high" for a thread that
 * produces frames (QoS user-interactive on Apple, display priority on
 * Android), "normal" or "low". Threads start at normal priority, which on
 * big.LITTLE devices means the little cores.
 */
struct RNSkThreadPriority {
  static void set(const std::string &level) {
#if defined(__APPLE__)
    qos_class_t qos = QOS_CLASS_DEFAULT;
    if (level == "high") {
      qos = QOS_CLASS_USER_INTERACTIVE;
    } else if (level == "low") {
      qos = QOS_CLASS_BACKGROUND;
    }
    pthread_set_qos_class_self_np(qos, 0);
#elif defined(__ANDROID__)
    // Same values as android.os.Process.THREAD_PRIORITY_*.
    int nice = 0;
    if (level == "high") {
      nice = -4; // THREAD_PRIORITY_DISPLAY
    } else if (level == "low") {
      nice = 10; // THREAD_PRIORITY_BACKGROUND
    }
    setpriority(PRIO_PROCESS, gettid(), nice);
#else
    (void)level;
#endif
  }
};

} // namespace RNSkia
