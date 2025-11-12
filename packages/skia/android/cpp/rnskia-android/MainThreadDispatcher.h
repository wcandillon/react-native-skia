#pragma once

#include <android/looper.h>
#include <cassert>
#include <functional>
#include <mutex>
#include <queue>
#include <unistd.h>

class MainThreadDispatcher {
private:
  ALooper *mainLooper = nullptr;
  int messagePipe[2] = {-1, -1};
  std::queue<std::function<void()>> taskQueue;
  std::mutex queueMutex;

  static constexpr int LOOPER_ID_MAIN = 1;

  void processMessages() {
    for (;;) {
      std::function<void()> task;
      {
        std::lock_guard<std::mutex> lock(queueMutex);
        if (taskQueue.empty()) {
          break;
        }
        task = std::move(taskQueue.front());
        taskQueue.pop();
      }
      task();
    }
  }

public:
  static MainThreadDispatcher &getInstance() {
    static MainThreadDispatcher instance;
    return instance;
  }

  bool isOnMainThread() { return ALooper_forThread() == mainLooper; }

  void post(std::function<void()> task) {
    if (ALooper_forThread() == mainLooper) {
        task();
    } else {
    {
      std::lock_guard<std::mutex> lock(queueMutex);
      taskQueue.push(std::move(task));
    }
    char wake = 1;
    write(messagePipe[1], &wake, 1);
    }
  }

  ~MainThreadDispatcher() {
    if (mainLooper != nullptr && messagePipe[0] != -1) {
      ALooper_removeFd(mainLooper, messagePipe[0]);
    }
    if (messagePipe[0] != -1) {
      close(messagePipe[0]);
      messagePipe[0] = -1;
    }
    if (messagePipe[1] != -1) {
      close(messagePipe[1]);
      messagePipe[1] = -1;
    }
  }

private:
  MainThreadDispatcher() {
    ALooper *currentLooper = ALooper_forThread();
    mainLooper = currentLooper;
    if (!mainLooper) {
      mainLooper = ALooper_prepare(ALOOPER_PREPARE_ALLOW_NON_CALLBACKS);
    }
    assert(mainLooper != nullptr && "Failed to acquire main looper");

    int pipeResult = pipe(messagePipe);
    assert(pipeResult == 0 && "Failed to create dispatcher pipe");

    int addResult = ALooper_addFd(
        mainLooper, messagePipe[0], LOOPER_ID_MAIN, ALOOPER_EVENT_INPUT,
        [](int fd, int events, void *data) -> int {
          char buf[1];
          read(fd, buf, 1);
          auto dispatcher = static_cast<MainThreadDispatcher *>(data);
          dispatcher->processMessages();
          return 1;
        },
        this);
    assert(addResult == 1 && "Failed to register dispatcher pipe");
  }
};
