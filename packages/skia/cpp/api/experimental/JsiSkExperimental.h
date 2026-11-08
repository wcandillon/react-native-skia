#pragma once

/**
 * globalThis.__RNSkiaExperimental: the JS surface of the allocation free
 * drawing path the recorder benchmark evaluates (see CommandBuffer.h and
 * apps/docs/docs/_recorder-benchmark.md). Not part of the public API. Every
 * method takes and returns numbers, except the ones that set a path up
 * (registering a shader, binding a canvas, making a command buffer): no JS
 * object is created or read per draw call.
 *
 * The object is a native object, so a worklet that captures it gets the
 * same native instance on the UI runtime, and the paint and shader tables
 * are shared by every runtime and by the render thread.
 */

#include <cstdint>
#include <memory>
#include <stdexcept>
#include <utility>

#include <jsi/jsi.h>

#include "api/JsiSkCanvas.h"
#include "api/JsiSkNativeObjects.h"
#include "api/JsiSkShader.h"
#include "rnskia/RNSkJsiViewApi.h"
#include "rnskia/RNSkView.h"

#include "CommandBuffer.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * A command buffer handed to JS. getBuffer() wraps the native memory for the
 * calling runtime; commit(count) publishes the first `count` floats and asks
 * the view the buffer is the content of for a frame.
 */
class JsiSkCommandBuffer
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkCommandBuffer,
                                                CommandBuffer> {
public:
  static constexpr const char *CLASS_NAME = "CommandBuffer";

  JsiSkCommandBuffer(std::shared_ptr<RNSkPlatformContext> context,
                     std::shared_ptr<CommandBuffer> buffer)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkCommandBuffer, CommandBuffer>(
            std::move(context), std::move(buffer)) {}

  /**
   * An ArrayBuffer over the buffer's memory, for the calling runtime. Each
   * runtime gets a wrapper of its own over the same bytes: react-native-
   * worklets copies an ArrayBuffer it serializes, so the wrapper is never
   * passed between runtimes, the command buffer object is.
   */
  JSI_HOST_FUNCTION(getBuffer) {
    return jsi::ArrayBuffer(runtime, getObject()->memory());
  }

  void commit(int count) {
    getObject()->commit(static_cast<size_t>(std::max(count, 0)));
    if (_nativeId >= 0) {
      if (auto view = ViewRegistry::getInstance().getView(_nativeId)) {
        view->requestFrame();
      }
    }
  }

  int getCapacity() { return static_cast<int>(getObject()->capacity()); }

  /** The address of the memory, to check that every runtime sees the same. */
  double getDataAddress() {
    return static_cast<double>(
        reinterpret_cast<uintptr_t>(getObject()->data()));
  }

  /** A float read by native code, to check a write made from a runtime. */
  double readFloat(int index) {
    auto buffer = getObject();
    if (index < 0 || static_cast<size_t>(index) >= buffer->capacity()) {
      return 0;
    }
    return buffer->data()[index];
  }

  /** Interprets the committed commands on a canvas, on the calling thread. */
  void replay(std::shared_ptr<JsiSkCanvas> canvas) {
    getObject()->play(canvas->getCanvas());
  }

  /** The view this buffer is the content of (see setViewContent). */
  void setNativeId(int nativeId) { _nativeId = nativeId; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installHostMethod(runtime, prototype, "getBuffer",
                      &JsiSkCommandBuffer::getBuffer);
    installMethod(runtime, prototype, "commit", &JsiSkCommandBuffer::commit);
    installMethod(runtime, prototype, "getCapacity",
                  &JsiSkCommandBuffer::getCapacity);
    installMethod(runtime, prototype, "getDataAddress",
                  &JsiSkCommandBuffer::getDataAddress);
    installMethod(runtime, prototype, "readFloat",
                  &JsiSkCommandBuffer::readFloat);
    installMethod(runtime, prototype, "replay", &JsiSkCommandBuffer::replay);
  }

  size_t getMemoryPressure() override {
    return getObjectUnchecked()
               ? getObjectUnchecked()->capacity() * sizeof(float)
               : kMinMemoryPressure;
  }

private:
  int _nativeId = -1;
};

class JsiSkExperimental : public JsiSkNativeObject<JsiSkExperimental> {
public:
  static constexpr const char *CLASS_NAME = "Experimental";

  explicit JsiSkExperimental(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkExperimental>(std::move(context)),
        _paints(std::make_shared<PaintTable>()) {}

  // Paint table --------------------------------------------------------------

  int createPaint() { return _paints->createPaint(); }

  /** Registers a shader made through the regular API; returns its handle. */
  int registerShader(sk_sp<SkShader> shader) {
    return _paints->registerShader(std::move(shader));
  }

  void setColor(int paint, double argb) {
    _paints->setColor(paint, static_cast<uint32_t>(argb));
  }

  void setAlpha(int paint, double alpha) {
    _paints->setAlpha(paint, static_cast<float>(alpha));
  }

  void setStrokeWidth(int paint, double width) {
    _paints->setStrokeWidth(paint, static_cast<float>(width));
  }

  void setStyle(int paint, int style) { _paints->setStyle(paint, style); }

  void setShader(int paint, int shader) { _paints->setShader(paint, shader); }

  // Scalar only canvas calls -------------------------------------------------

  /**
   * The canvas the calls below draw on: the one of a Graphite context or a
   * picture recorder, bound for a frame by the thread that records it.
   */
  void bindCanvas(std::shared_ptr<JsiSkCanvas> canvas) {
    _canvas = std::move(canvas);
  }

  void unbindCanvas() { _canvas = nullptr; }

  void save() { canvas()->save(); }

  void restore() { canvas()->restore(); }

  void concat(double a, double b, double c, double d, double e, double f) {
    canvas()->concat(SkMatrix::MakeAll(a, c, e, b, d, f, 0, 0, 1));
  }

  void clipRect(double left, double top, double right, double bottom) {
    canvas()->clipRect(SkRect::MakeLTRB(left, top, right, bottom));
  }

  void clear(double argb) { canvas()->clear(static_cast<uint32_t>(argb)); }

  void drawCircle(double cx, double cy, double r, int paint) {
    std::lock_guard<std::mutex> lock(_paints->mutex());
    if (auto *p = _paints->paintLocked(paint)) {
      canvas()->drawCircle(cx, cy, r, *p);
    }
  }

  void drawRect(double left, double top, double right, double bottom,
                int paint) {
    std::lock_guard<std::mutex> lock(_paints->mutex());
    if (auto *p = _paints->paintLocked(paint)) {
      canvas()->drawRect(SkRect::MakeLTRB(left, top, right, bottom), *p);
    }
  }

  // Command buffers ----------------------------------------------------------

  std::shared_ptr<JsiSkCommandBuffer> makeCommandBuffer(int capacity) {
    return std::make_shared<JsiSkCommandBuffer>(
        getContext(), std::make_shared<CommandBuffer>(
                          static_cast<size_t>(std::max(capacity, 1)), _paints));
  }

  /**
   * Makes the buffer the content of a view, replayed by the render thread
   * pool like a recorder is: interpreted on the deferred canvas of its
   * target, or through a picture made again when the buffer is committed.
   * Returns false when the view has not registered yet.
   */
  bool setViewContent(int nativeId, std::shared_ptr<JsiSkCommandBuffer> buffer,
                      bool asPicture) {
    auto view = ViewRegistry::getInstance().getView(nativeId);
    if (view == nullptr) {
      return false;
    }
    buffer->setNativeId(nativeId);
    view->setCommandBuffer(buffer->getObject(), asPicture);
    return true;
  }

  bool clearViewContent(int nativeId) {
    auto view = ViewRegistry::getInstance().getView(nativeId);
    if (view == nullptr) {
      return false;
    }
    view->setCommandBuffer(nullptr, false);
    return true;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "createPaint",
                  &JsiSkExperimental::createPaint);
    installMethod(runtime, prototype, "registerShader",
                  &JsiSkExperimental::registerShader);
    installMethod(runtime, prototype, "setColor", &JsiSkExperimental::setColor);
    installMethod(runtime, prototype, "setAlpha", &JsiSkExperimental::setAlpha);
    installMethod(runtime, prototype, "setStrokeWidth",
                  &JsiSkExperimental::setStrokeWidth);
    installMethod(runtime, prototype, "setStyle", &JsiSkExperimental::setStyle);
    installMethod(runtime, prototype, "setShader",
                  &JsiSkExperimental::setShader);
    installMethod(runtime, prototype, "bindCanvas",
                  &JsiSkExperimental::bindCanvas);
    installMethod(runtime, prototype, "unbindCanvas",
                  &JsiSkExperimental::unbindCanvas);
    installMethod(runtime, prototype, "save", &JsiSkExperimental::save);
    installMethod(runtime, prototype, "restore", &JsiSkExperimental::restore);
    installMethod(runtime, prototype, "concat", &JsiSkExperimental::concat);
    installMethod(runtime, prototype, "clipRect", &JsiSkExperimental::clipRect);
    installMethod(runtime, prototype, "clear", &JsiSkExperimental::clear);
    installMethod(runtime, prototype, "drawCircle",
                  &JsiSkExperimental::drawCircle);
    installMethod(runtime, prototype, "drawRect", &JsiSkExperimental::drawRect);
    installMethod(runtime, prototype, "makeCommandBuffer",
                  &JsiSkExperimental::makeCommandBuffer);
    installMethod(runtime, prototype, "setViewContent",
                  &JsiSkExperimental::setViewContent);
    installMethod(runtime, prototype, "clearViewContent",
                  &JsiSkExperimental::clearViewContent);
  }

private:
  SkCanvas *canvas() {
    if (_canvas == nullptr) {
      throw std::runtime_error(
          "__RNSkiaExperimental: no canvas is bound, call bindCanvas() first.");
    }
    return _canvas->getCanvas();
  }

  std::shared_ptr<PaintTable> _paints;
  std::shared_ptr<JsiSkCanvas> _canvas;
};

} // namespace RNSkia
