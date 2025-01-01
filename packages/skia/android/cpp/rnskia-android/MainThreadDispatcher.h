#pragma once

#include <android/looper.h>
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
    std::lock_guard<std::mutex> lock(queueMutex);
    while (!taskQueue.empty()) {
      auto task = taskQueue.front();
      taskQueue.pop();
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
    // TODO: this is disabled for now but we can clean this up
    // if (ALooper_forThread() == mainLooper) {
    //     task();
    // } else {
    {
      std::lock_guard<std::mutex> lock(queueMutex);
      taskQueue.push(std::move(task));
    }
    char wake = 1;
    write(messagePipe[1], &wake, 1);
    // }
  }

  ~MainThreadDispatcher() {
    close(messagePipe[0]);
    close(messagePipe[1]);
  }

private:
  MainThreadDispatcher() {
    mainLooper = ALooper_forThread();
    if (!mainLooper) {
      mainLooper = ALooper_prepare(ALOOPER_PREPARE_ALLOW_NON_CALLBACKS);
    }

    pipe(messagePipe);

    ALooper_addFd(
        mainLooper, messagePipe[0], LOOPER_ID_MAIN, ALOOPER_EVENT_INPUT,
        [](int fd, int events, void *data) -> int {
          char buf[1];
          read(fd, buf, 1);
          auto dispatcher = static_cast<MainThreadDispatcher *>(data);
          dispatcher->processMessages();
          return 1;
        },
        this);
  }
};