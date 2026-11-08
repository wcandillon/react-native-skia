#pragma once

/**
 * Experimental, for the recorder benchmark (see
 * apps/docs/docs/_recorder-benchmark.md): the allocation free drawing path
 * the benchmark compares the native recorder against. Not part of the public
 * API; JS reaches it through globalThis.__RNSkiaExperimental
 * (JsiSkExperimental.h).
 *
 * Two pieces live here:
 * - PaintTable: paints and shaders addressed by integer handle. JS sets up
 *   a paint once (color, stroke, style, shader) and refers to it by handle
 *   from then on, so a draw call carries numbers only.
 * - CommandBuffer: drawing operations encoded as opcodes and float operands
 *   in native memory that JS writes through a Float32Array. The memory is a
 *   jsi::MutableBuffer: every runtime (React Native, Reanimated UI) wraps
 *   the same bytes in an ArrayBuffer of its own, and the render thread
 *   interprets them in place, so an animated value goes from a worklet to
 *   the canvas without a copy or an allocation.
 */

#include <cstdint>
#include <cstring>
#include <memory>
#include <mutex>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "api/recorder/RecorderStats.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPicture.h"
#include "include/core/SkPictureRecorder.h"
#include "include/core/SkShader.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class PaintTable {
public:
  int createPaint() {
    std::lock_guard<std::mutex> lock(_mutex);
    SkPaint paint;
    paint.setAntiAlias(true);
    _paints.push_back(paint);
    return static_cast<int>(_paints.size()) - 1;
  }

  int registerShader(sk_sp<SkShader> shader) {
    std::lock_guard<std::mutex> lock(_mutex);
    _shaders.push_back(std::move(shader));
    return static_cast<int>(_shaders.size()) - 1;
  }

  void setColor(int handle, uint32_t argb) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (auto *paint = paintLocked(handle)) {
      paint->setColor(argb);
    }
  }

  void setAlpha(int handle, float alpha) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (auto *paint = paintLocked(handle)) {
      paint->setAlphaf(alpha);
    }
  }

  void setStrokeWidth(int handle, float width) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (auto *paint = paintLocked(handle)) {
      paint->setStrokeWidth(width);
    }
  }

  /** 0 fills, 1 strokes (SkPaint::Style). */
  void setStyle(int handle, int style) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (auto *paint = paintLocked(handle)) {
      paint->setStyle(style == 1 ? SkPaint::kStroke_Style
                                 : SkPaint::kFill_Style);
    }
  }

  /** A shader handle, or -1 for none. */
  void setShader(int handle, int shader) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (auto *paint = paintLocked(handle)) {
      paint->setShader(shader >= 0 && shader < static_cast<int>(_shaders.size())
                           ? _shaders[shader]
                           : nullptr);
    }
  }

  /**
   * The paint of a handle, or nullptr. Under the table's mutex, which the
   * caller holds for as long as it uses the paint (see mutex()).
   */
  SkPaint *paintLocked(int handle) {
    if (handle < 0 || handle >= static_cast<int>(_paints.size())) {
      return nullptr;
    }
    return &_paints[handle];
  }

  /**
   * Taken by whoever replays with these paints, for the whole replay: the
   * setters (JS thread, at commit time) wait for it. Uncontended while an
   * animation runs, which only writes into command buffers.
   */
  std::mutex &mutex() { return _mutex; }

private:
  std::mutex _mutex;
  std::vector<SkPaint> _paints;
  std::vector<sk_sp<SkShader>> _shaders;
};

/**
 * The opcodes of a command buffer, each followed by its operands. The paint
 * operands are PaintTable handles.
 */
enum class CommandOp : int {
  /** Ends the buffer early (a zero filled buffer plays nothing). */
  End = 0,
  Save = 1,
  Restore = 2,
  /** a b c d e f: the affine matrix [a c e; b d f; 0 0 1] (canvas 2D). */
  Concat = 3,
  /** left top right bottom. */
  ClipRect = 4,
  /** cx cy r paint. */
  DrawCircle = 5,
  /** left top right bottom paint. */
  DrawRect = 6,
  /** paint alpha: the alpha of the paint, for an inherited opacity. */
  SetAlpha = 7,
  /** paint r g b a. */
  SetColor = 8,
  /** paint. */
  DrawPaint = 9,
};

class CommandBuffer {
public:
  CommandBuffer(size_t capacity, std::shared_ptr<PaintTable> paints)
      : _memory(std::make_shared<Memory>(capacity)),
        _paints(std::move(paints)) {}

  /** The memory JS writes, to wrap in an ArrayBuffer of the calling runtime. */
  std::shared_ptr<jsi::MutableBuffer> memory() { return _memory; }

  float *data() { return _memory->floats.data(); }
  size_t capacity() const { return _memory->floats.size(); }

  /**
   * The first `count` floats hold the commands to play from now on. The
   * picture made of them is stale.
   */
  void commit(size_t count) {
    std::lock_guard<std::mutex> lock(_mutex);
    _count = std::min(count, capacity());
    _dirty = true;
  }

  size_t count() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _count;
  }

  /**
   * Interprets the committed commands on the canvas. The paints are locked
   * for the whole replay. The floats are read as JS may be writing the
   * next frame's values into them (a torn frame draws one value of the
   * previous frame, never garbage, since every float is written whole): a
   * production design would double buffer.
   */
  void play(SkCanvas *canvas) { play(canvas, count()); }

  void play(SkCanvas *canvas, size_t count) {
    std::lock_guard<std::mutex> lock(_paints->mutex());
    const float *f = data();
    const size_t n = std::min(count, capacity());
    size_t i = 0;
    while (i < n) {
      const auto op = static_cast<CommandOp>(static_cast<int>(f[i]));
      switch (op) {
      case CommandOp::Save:
        canvas->save();
        i += 1;
        break;
      case CommandOp::Restore:
        canvas->restore();
        i += 1;
        break;
      case CommandOp::Concat: {
        if (i + 7 > n) {
          return;
        }
        canvas->concat(SkMatrix::MakeAll(f[i + 1], f[i + 3], f[i + 5], f[i + 2],
                                         f[i + 4], f[i + 6], 0, 0, 1));
        i += 7;
        break;
      }
      case CommandOp::ClipRect:
        if (i + 5 > n) {
          return;
        }
        canvas->clipRect(
            SkRect::MakeLTRB(f[i + 1], f[i + 2], f[i + 3], f[i + 4]));
        i += 5;
        break;
      case CommandOp::DrawCircle: {
        if (i + 5 > n) {
          return;
        }
        if (auto *paint = _paints->paintLocked(static_cast<int>(f[i + 4]))) {
          canvas->drawCircle(f[i + 1], f[i + 2], f[i + 3], *paint);
        }
        i += 5;
        break;
      }
      case CommandOp::DrawRect: {
        if (i + 6 > n) {
          return;
        }
        if (auto *paint = _paints->paintLocked(static_cast<int>(f[i + 5]))) {
          canvas->drawRect(
              SkRect::MakeLTRB(f[i + 1], f[i + 2], f[i + 3], f[i + 4]), *paint);
        }
        i += 6;
        break;
      }
      case CommandOp::SetAlpha: {
        if (i + 3 > n) {
          return;
        }
        if (auto *paint = _paints->paintLocked(static_cast<int>(f[i + 1]))) {
          paint->setAlphaf(f[i + 2]);
        }
        i += 3;
        break;
      }
      case CommandOp::SetColor: {
        if (i + 6 > n) {
          return;
        }
        if (auto *paint = _paints->paintLocked(static_cast<int>(f[i + 1]))) {
          paint->setColor4f({f[i + 2], f[i + 3], f[i + 4], f[i + 5]});
        }
        i += 6;
        break;
      }
      case CommandOp::DrawPaint: {
        if (i + 2 > n) {
          return;
        }
        if (auto *paint = _paints->paintLocked(static_cast<int>(f[i + 1]))) {
          canvas->drawPaint(*paint);
        }
        i += 2;
        break;
      }
      case CommandOp::End:
      default:
        return;
      }
    }
  }

  /** The committed commands played into a picture. */
  sk_sp<SkPicture> makePicture() {
    SkPictureRecorder recorder;
    auto *canvas =
        recorder.beginRecording(SkRect::MakeWH(2'000'000, 2'000'000), nullptr);
    play(canvas);
    return recorder.finishRecordingAsPicture();
  }

  /**
   * Draws the committed commands for a frame of a view: interpreted on the
   * canvas, or as a picture made again only when the buffer was committed
   * since the last one.
   */
  void draw(SkCanvas *canvas, bool asPicture) {
#ifdef RNSKIA_RECORDER_STATS
    RecorderStats::beginFrame();
    const auto start = RecorderStats::Clock::now();
#endif
    if (asPicture) {
      sk_sp<SkPicture> picture;
      {
        std::lock_guard<std::mutex> lock(_mutex);
        if (_dirty || _picture == nullptr) {
          RNSKIA_STAT_SCOPE(CommandBufferRebuild);
          _picture = makePictureLocked();
          _dirty = false;
        }
        picture = _picture;
      }
      canvas->drawPicture(picture);
#ifdef RNSKIA_RECORDER_STATS
      RecorderStats::get().endFrame(RecorderStats::CommandBufferPicture,
                                    RecorderStats::micros(start));
#endif
      return;
    }
    play(canvas);
#ifdef RNSKIA_RECORDER_STATS
    RecorderStats::get().endFrame(RecorderStats::CommandBufferPlay,
                                  RecorderStats::micros(start));
#endif
  }

private:
  struct Memory : jsi::MutableBuffer {
    explicit Memory(size_t capacity) : floats(capacity, 0.0f) {}
    size_t size() const override { return floats.size() * sizeof(float); }
    uint8_t *data() override {
      return reinterpret_cast<uint8_t *>(floats.data());
    }
    std::vector<float> floats;
  };

  sk_sp<SkPicture> makePictureLocked() {
    SkPictureRecorder recorder;
    auto *canvas =
        recorder.beginRecording(SkRect::MakeWH(2'000'000, 2'000'000), nullptr);
    play(canvas, _count);
    return recorder.finishRecordingAsPicture();
  }

  std::shared_ptr<Memory> _memory;
  std::shared_ptr<PaintTable> _paints;
  std::mutex _mutex;
  size_t _count = 0;
  bool _dirty = true;
  sk_sp<SkPicture> _picture;
};

} // namespace RNSkia
