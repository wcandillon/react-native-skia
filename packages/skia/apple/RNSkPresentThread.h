#pragma once

#import <Foundation/Foundation.h>

#include <functional>

/**
 * The thread every canvas presents on, as on Android (see PresentThread.java):
 * one for the process, started on first use and never stopped. A present
 * replays the view's recordings on the GPU context, and the first replay of a
 * draw waits for the pipelines it uses to compile (hundreds of milliseconds
 * after a fresh install, when no cache has them yet): on the main thread that
 * wait froze every animation of the app
 * (https://github.com/wcandillon/react-native-skia/issues/4384). The thread
 * has a run loop, which the display links of the views tick on, and runs the
 * tasks posted to it in order: a view's display link is only touched here.
 * CAMetalLayer takes drawables and presents from any thread. A view attaches
 * and detaches its window here too, in order with the presents: a present
 * holds the thread for as long as its pipelines take to compile, and the main
 * thread, which only resizes the window (which never waits), never waits for
 * one. The window needs no mutex of its own: everything that touches it runs
 * here, one task after the other. The thread's dispatcher runs its queue
 * from the run loop too (see Dispatcher::bindCurrentThread), so that the
 * thread trims what it records once idle (see RNSkThreadTrims).
 */
@interface RNSkPresentThread : NSObject

/** Runs a task on the present thread, after those posted before it. Any
 * thread. */
+ (void)post:(dispatch_block_t)task;

@end

namespace RNSkia {

/**
 * Runs a C++ task on the present thread, after those posted before it: the
 * thread of every view's presents (see RNSkView::setPresentThread) and of its
 * own dispatcher's queue. Any thread.
 */
void runOnPresentThread(std::function<void()> task);

} // namespace RNSkia
