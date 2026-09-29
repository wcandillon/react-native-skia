#pragma once

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cstdint>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include "RNSkFrameScheduler.h"
#include "RNSkJsiViewApi.h"
#include "RNSkPictureView.h"
#include "RNSkPlatformContext.h"
#include "RNSkThreadPriority.h"
#include "RNSkView.h"

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#include "RNSkDeferredTarget.h"
#include "RNSkRecordingView.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPicture.h"
#include "include/core/SkPictureRecorder.h"
#include "include/core/SkRect.h"
#include "include/core/SkStream.h"
#include "modules/svg/include/SkSVGDOM.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Benchmark helper: native producer threads for the "multiple views"
 * benchmark, so the measurement contains no JS, no worklet runtime and no
 * shared values. Each thread owns every `threads`-th view and produces one
 * frame per view per vsync (a batch), like the JS producer:
 *
 * - recording: the field is drawn into a deferred canvas on the thread's own
 *   Graphite Recorder and the snapped Recording is handed to the
 *   SkiaRecordingView, which only presents it.
 * - picture: a small SkPicture referencing the field is recorded and handed
 *   to the SkiaPictureView, which replays it on the main thread.
 *
 * Pacing comes from the platform vsync through RNSkFrameScheduler: the
 * callback (on the main thread) only bumps a tick and wakes the threads, and
 * re-arms itself while the producer runs. A thread that is still busy when
 * the next vsync arrives skips it: never more than one batch in flight.
 */
class RNSkBenchmarkProducer
    : public std::enable_shared_from_this<RNSkBenchmarkProducer> {
public:
  struct Options {
    bool recording = false;
    int threads = 1;
    // Native view ids, in slot order; a negative id is an empty slot.
    std::vector<long> ids;
    // One picture per slot (slot i uses fields[i % size]); a single entry
    // is shared by every view.
    std::vector<sk_sp<SkPicture>> fields;
    SkColor background = SK_ColorWHITE;
    // With a corner radius (points), the frame is `page` outside a rounded
    // rect of `background`: an opaque view is not clipped by its parent.
    SkColor page = SK_ColorTRANSPARENT;
    float cornerRadius = 0;
    // Kaleidoscope: the picture holds one 60 degree wedge and is drawn six
    // times, mirrored every other time (six-fold mirror symmetry).
    bool kaleidoscope = false;
    // Direct mode: instead of replaying `field`, the producer draws the same
    // circle layout itself (regenerated from `circles` and `radius`, in
    // points), to measure picture playback against direct draw calls.
    bool direct = false;
    int circles = 0;
    float radius = 0;
    // SVG mode: the field as SVG text; every thread parses its own SkSVGDOM
    // (the DOM is not meant to be rendered concurrently) and renders it each
    // frame, so the draws come from the SVG module.
    std::string svg;
    // Chart scene (the animated list): `bars` bars and a `bars`-point line,
    // all animated, 2 * bars draws per frame; nothing pre-recorded.
    bool chart = false;
    int bars = 0;
    SkColor line = SK_ColorBLACK;
    float pixelDensity = 1;
    // Present recordings from the producer thread itself instead of handing
    // them to the view for the main thread to present at the next vsync.
    bool presentOnProducer = false;
  };

  struct Stats {
    // The slowest thread's last batch.
    double batchMs = 0;
    // Batches produced by thread 0.
    uint64_t batches = 0;
    int threads = 0;
  };

  RNSkBenchmarkProducer(std::shared_ptr<RNSkPlatformContext> context,
                        Options options)
      : _context(std::move(context)), _options(std::move(options)) {
    if (_options.threads < 1) {
      _options.threads = 1;
    }
    if (_options.direct) {
      buildCircles();
    }
    _doms.resize(_options.threads);
    _enabled = std::make_unique<std::atomic<bool>[]>(_options.ids.size());
    for (size_t i = 0; i < _options.ids.size(); i++) {
      _enabled[i] = true;
    }
    _threadMs = std::make_unique<std::atomic<int>[]>(_options.threads);
    for (int k = 0; k < _options.threads; k++) {
      _threadMs[k] = 0;
    }
  }

  ~RNSkBenchmarkProducer() { stop(); }

  void start() {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_running) {
        return;
      }
      _running = true;
    }
    std::weak_ptr<RNSkBenchmarkProducer> weakThis = weak_from_this();
    auto scheduler = _context->makeFrameScheduler([weakThis]() {
      if (auto self = weakThis.lock()) {
        self->onVsync();
      }
    });
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _scheduler = scheduler;
    }
    for (int k = 0; k < _options.threads; k++) {
      _threads.emplace_back([this, k]() { run(k); });
    }
    scheduler->requestFrame();
  }

  void stop() {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (!_running) {
        return;
      }
      _running = false;
    }
    _cv.notify_all();
    for (auto &thread : _threads) {
      if (thread.joinable()) {
        thread.join();
      }
    }
    _threads.clear();
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _scheduler.reset();
    }
  }

  /** Slots to draw (all by default): e.g. the list items on screen. */
  void setEnabled(const std::vector<bool> &enabled) {
    for (size_t i = 0; i < _options.ids.size(); i++) {
      _enabled[i] = i < enabled.size() ? enabled[i] : true;
    }
  }

  Stats getStats() {
    Stats stats;
    stats.threads = _options.threads;
    stats.batches = _batches.load();
    for (int k = 0; k < _options.threads; k++) {
      stats.batchMs = std::max(stats.batchMs,
                               static_cast<double>(_threadMs[k].load()));
    }
    return stats;
  }

private:
  void onVsync() {
    std::shared_ptr<RNSkFrameScheduler> scheduler;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _tick++;
      if (_running) {
        scheduler = _scheduler;
      }
    }
    _cv.notify_all();
    if (scheduler) {
      scheduler->requestFrame();
    }
  }

  void run(int thread) {
    RNSkThreadPriority::set("high");
    auto attached = _context->attachThread();
    if (!_options.svg.empty()) {
      SkMemoryStream stream(_options.svg.data(), _options.svg.size(), false);
      _doms[thread] = SkSVGDOM::Builder().make(stream);
      if (_doms[thread]) {
        _doms[thread]->setContainerSize(
            SkSize::Make(2 * _options.radius, 2 * _options.radius));
      }
    }
    uint64_t lastTick = 0;
    while (true) {
      {
        std::unique_lock<std::mutex> lock(_mutex);
        _cv.wait(lock, [&]() { return !_running || _tick != lastTick; });
        if (!_running) {
          return;
        }
        lastTick = _tick;
      }
      auto start = std::chrono::steady_clock::now();
      produce(thread);
      auto elapsed = std::chrono::steady_clock::now() - start;
      _threadMs[thread] = static_cast<int>(
          std::chrono::duration_cast<std::chrono::milliseconds>(elapsed)
              .count());
      if (thread == 0) {
        _batches++;
      }
    }
  }

  void produce(int thread) {
    // Milliseconds since the epoch, like Date.now() in the JS producer.
    double t = static_cast<double>(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch())
            .count());
    auto &registry = ViewRegistry::getInstance();
#if defined(SK_GRAPHITE)
    // Views this thread inserted; they share one submit and are then
    // presented together.
    std::vector<std::shared_ptr<RNSkRecordingView>> inserted;
#endif
    for (size_t i = 0; i < _options.ids.size(); i++) {
      if (static_cast<int>(i % _options.threads) != thread ||
          _options.ids[i] < 0 || !_enabled[i]) {
        continue;
      }
      auto view = registry.getView(static_cast<size_t>(_options.ids[i]));
      if (!view) {
        continue;
      }
      if (!_options.recording) {
        producePicture(view, static_cast<int>(i), t, thread);
        continue;
      }
#if defined(SK_GRAPHITE)
      auto recordingView = std::dynamic_pointer_cast<RNSkRecordingView>(view);
      if (!recordingView) {
        continue;
      }
      auto deferred =
          snapField(recordingView, static_cast<int>(i), t, thread);
      if (!deferred) {
        continue;
      }
      if (!_options.presentOnProducer) {
        std::static_pointer_cast<RNSkRecordingRenderer>(
            recordingView->getRenderer())
            ->setRecording(std::move(deferred));
        recordingView->requestRedraw();
      } else if (recordingView->insertNow(deferred)) {
        inserted.push_back(std::move(recordingView));
      } else {
        // The provider cannot split the present (or the target changed).
        recordingView->presentNow(std::move(deferred));
      }
#endif
    }
#if defined(SK_GRAPHITE)
    if (!inserted.empty()) {
      DawnContext::getInstance().submit();
      for (auto &view : inserted) {
        view->presentInsertedNow();
      }
    }
#endif
  }

  struct Circle {
    float x;
    float y;
    float r;
    SkColor color;
    bool stroked;
  };

  /** Same layout as buildField() in scenes.ts: golden-angle spiral. */
  void buildCircles() {
    static const SkColor palette[] = {0xffff6b6b, 0xfffeca57, 0xff48dbfb,
                                      0xff1dd1a1, 0xff5f27cd, 0xffff9ff3,
                                      0xff54a0ff, 0xff00d2d3};
    const double wedge = M_PI / 3;
    int n = _options.kaleidoscope
                ? static_cast<int>(std::ceil(_options.circles / 6.0))
                : _options.circles;
    _circles.reserve(n);
    for (int i = 0; i < n; i++) {
      double spiral = i * 2.399963;
      double a = _options.kaleidoscope ? std::fmod(spiral, wedge) : spiral;
      double d = _options.radius * std::sqrt((i + 0.5) / n);
      SkColor color = palette[i % 8];
      if (_options.kaleidoscope) {
        color = SkColorSetA(color, 204); // 0.8
      }
      _circles.push_back({static_cast<float>(std::cos(a) * d),
                          static_cast<float>(std::sin(a) * d),
                          static_cast<float>(1.5 + (i % 4)), color,
                          i % 3 == 0});
    }
  }

  /** One copy of the field: the picture, the SVG DOM, or direct circles. */
  void drawCopy(SkCanvas *canvas, int thread, int index) {
    if (!_options.svg.empty()) {
      if (_doms[thread]) {
        // The viewBox is centered on the origin; the DOM renders at (0, 0).
        canvas->save();
        canvas->translate(-_options.radius, -_options.radius);
        _doms[thread]->render(canvas);
        canvas->restore();
      }
      return;
    }
    if (!_options.direct) {
      if (!_options.fields.empty()) {
        canvas->drawPicture(_options.fields[index % _options.fields.size()]);
      }
      return;
    }
    SkPaint fill;
    SkPaint stroke;
    stroke.setStyle(SkPaint::kStroke_Style);
    stroke.setStrokeWidth(1.5f);
    for (const auto &c : _circles) {
      if (c.stroked) {
        stroke.setColor(c.color);
        canvas->drawCircle(c.x, c.y, c.r + 1, stroke);
      } else {
        fill.setColor(c.color);
        canvas->drawCircle(c.x, c.y, c.r, fill);
      }
    }
  }

  /** The chart: `bars` bars and a line, all moving (same as scenes.ts). */
  void drawChart(SkCanvas *canvas, float width, float height, double t,
                 int index) {
    static const SkColor palette[] = {0xffff6b6b, 0xfffeca57, 0xff48dbfb,
                                      0xff1dd1a1, 0xff5f27cd, 0xffff9ff3,
                                      0xff54a0ff, 0xff00d2d3};
    const int count = std::max(1, _options.bars);
    const float barWidth = width / count;
    const double phase = index * 0.9;
    SkPaint fill;
    for (int i = 0; i < count; i++) {
      double v = 0.5 + 0.25 * std::sin(t * 0.002 + i * 0.35 + phase) +
                 0.2 * std::sin(t * 0.0007 + i * 0.11);
      auto h = static_cast<float>(v * (height - 8));
      fill.setColor(palette[(i + index) % 8]);
      canvas->drawRect(SkRect::MakeXYWH(i * barWidth, height - h,
                                        std::max(1.0f, barWidth - 1), h),
                       fill);
    }
    SkPaint line;
    line.setStyle(SkPaint::kStroke_Style);
    line.setStrokeWidth(2);
    line.setAntiAlias(true);
    line.setColor(_options.line);
    float prevX = 0;
    auto prevY = static_cast<float>(
        height / 2 + std::sin(t * 0.003 + phase) * (height / 4));
    for (int i = 1; i < count; i++) {
      float x = (static_cast<float>(i) / (count - 1)) * width;
      auto y = static_cast<float>(
          height / 2 + std::sin(t * 0.003 + i * 0.25 + phase) * (height / 4) +
          std::cos(t * 0.0011 + i * 0.05) * (height / 8));
      canvas->drawLine(prevX, prevY, x, y, line);
      prevX = x;
      prevY = y;
    }
  }

  /** The field, rotating and breathing, in points (same as scenes.ts). */
  void drawField(SkCanvas *canvas, float width, float height, double t,
                 int index, int thread) {
    SkPaint fill;
    if (_options.cornerRadius > 0) {
      fill.setColor(_options.page);
      canvas->drawRect(SkRect::MakeWH(width, height), fill);
      fill.setAntiAlias(true);
      fill.setColor(_options.background);
      canvas->drawRoundRect(SkRect::MakeWH(width, height),
                            _options.cornerRadius, _options.cornerRadius,
                            fill);
    } else {
      fill.setColor(_options.background);
      canvas->drawRect(SkRect::MakeWH(width, height), fill);
    }
    if (_options.chart) {
      drawChart(canvas, width, height, t, index);
      return;
    }
    canvas->save();
    canvas->translate(width / 2, height / 2);
    canvas->rotate(static_cast<float>(std::fmod(t * 0.03 + index * 60, 360)));
    auto s = static_cast<float>(0.85 + 0.15 * std::sin(t * 0.002 + index));
    canvas->scale(s, s);
    if (_options.kaleidoscope) {
      for (int k = 0; k < 6; k++) {
        canvas->save();
        if (k % 2 == 0) {
          canvas->rotate(static_cast<float>(k * 60));
        } else {
          // Reflect the wedge into its slot: angle a maps to (k+1)*60 - a.
          canvas->rotate(static_cast<float>((k + 1) * 60));
          canvas->scale(1, -1);
        }
        drawCopy(canvas, thread, index);
        canvas->restore();
      }
    } else {
      drawCopy(canvas, thread, index);
    }
    canvas->restore();
  }

#if defined(SK_GRAPHITE)
  /** Draws the field for `index` on this thread's Recorder and snaps it. */
  std::shared_ptr<RNSkDeferredRecording>
  snapField(const std::shared_ptr<RNSkRecordingView> &recordingView,
            int index, double t, int thread) {
    auto target = recordingView->getTarget();
    if (!target) {
      return nullptr;
    }
    auto *recorder = DawnContext::getInstance().getRecorder();
    auto *canvas =
        recorder->makeDeferredCanvas(target->imageInfo, target->textureInfo);
    if (canvas == nullptr) {
      return nullptr;
    }
    auto pd = _options.pixelDensity;
    canvas->save();
    canvas->scale(pd, pd);
    drawField(canvas, target->width() / pd, target->height() / pd, t, index,
              thread);
    canvas->restore();
    auto recording = recorder->snap();
    if (!recording) {
      return nullptr;
    }
    auto deferred = std::make_shared<RNSkDeferredRecording>();
    deferred->recording = std::move(recording);
    deferred->target = target;
    return deferred;
  }
#endif

  void producePicture(const std::shared_ptr<RNSkView> &view, int index,
                      double t, int thread) {
    auto pictureView = std::dynamic_pointer_cast<RNSkPictureView>(view);
    if (!pictureView) {
      return;
    }
    auto pd = _options.pixelDensity;
    float width = pictureView->getScaledWidth() / pd;
    float height = pictureView->getScaledHeight() / pd;
    if (width <= 0 || height <= 0) {
      return;
    }
    SkPictureRecorder recorder;
    auto *canvas = recorder.beginRecording(SkRect::MakeWH(width, height));
    drawField(canvas, width, height, t, index, thread);
    auto picture = recorder.finishRecordingAsPicture();
    // setPicture requests the redraw itself.
    std::static_pointer_cast<RNSkPictureRenderer>(pictureView->getRenderer())
        ->setPicture(std::move(picture));
  }

  std::shared_ptr<RNSkPlatformContext> _context;
  Options _options;
  std::vector<Circle> _circles;
  std::vector<sk_sp<SkSVGDOM>> _doms;
  std::unique_ptr<std::atomic<bool>[]> _enabled;
  std::shared_ptr<RNSkFrameScheduler> _scheduler;
  std::vector<std::thread> _threads;
  std::mutex _mutex;
  std::condition_variable _cv;
  bool _running = false;
  uint64_t _tick = 0;
  std::unique_ptr<std::atomic<int>[]> _threadMs;
  std::atomic<uint64_t> _batches{0};
};

} // namespace RNSkia
