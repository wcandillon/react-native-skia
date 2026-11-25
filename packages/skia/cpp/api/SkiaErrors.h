#pragma once

#include <cstdlib>
#include <string>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "jsi/NamedError.h"
#include "utils/SkSLErrorText.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 The errors the public API throws and rejects with (see
 src/skia/types/Errors.ts): `throw SkiaErrors::decode("...", "image")`.
 Thrown anywhere, they reach JS as the error of their name.
 */
namespace SkiaErrors {

using RNJsi::NamedError;
using SkSLErrorText::CompilationMessage;
using SkSLErrorText::parseCompilationMessages;

/**
 Bytes or text that cannot be decoded. `format` is one of SkiaDecodeFormat:
 "image", "animated-image", "svg", "typeface", "skottie", "picture", "path".
 */
inline NamedError decode(const std::string &message, std::string format) {
  return NamedError("SkiaDecodeError", message, "format",
                    [format = std::move(format)](jsi::Runtime &runtime) {
                      return jsi::Value(runtime, jsi::String::createFromUtf8(
                                                     runtime, format));
                    });
}

/** SkSL that fails to compile, with the diagnostics of its error text. */
inline NamedError compilation(const std::string &errorText) {
  auto messages = parseCompilationMessages(errorText);
  // The message reads like the error text without its summary line.
  std::string summary;
  for (const auto &m : messages) {
    if (!summary.empty()) {
      summary += "\n";
    }
    summary += m.lineNum > 0 ? std::to_string(m.lineNum) + ": " + m.message
                             : m.message;
  }
  return NamedError(
      "SkSLCompilationError", "SkSL compilation failed:\n" + summary,
      "messages", [messages = std::move(messages)](jsi::Runtime &runtime) {
        auto array = jsi::Array(runtime, messages.size());
        for (size_t i = 0; i < messages.size(); i++) {
          const auto &m = messages[i];
          jsi::Object object(runtime);
          object.setProperty(runtime, "type",
                             jsi::String::createFromUtf8(runtime, m.type));
          object.setProperty(runtime, "message",
                             jsi::String::createFromUtf8(runtime, m.message));
          object.setProperty(runtime, "lineNum", m.lineNum);
          object.setProperty(runtime, "linePos", m.linePos);
          array.setValueAtIndex(runtime, i, std::move(object));
        }
        return jsi::Value(runtime, array);
      });
}

/** A call that is invalid in a way its types cannot say. */
inline NamedError validation(const std::string &message) {
  return NamedError("SkiaValidationError", message);
}

/** An allocation that failed. */
inline NamedError outOfMemory(const std::string &message) {
  return NamedError("SkiaOutOfMemoryError", message);
}

/** No GPU Skia can render with; the message is Skia.gpu.error. */
inline NamedError gpuUnavailable(const std::string &message) {
  return NamedError("SkiaGPUUnavailableError", message);
}

/** Skia or the driver failing on its own. */
inline NamedError internal(const std::string &message) {
  return NamedError("SkiaInternalError", message);
}

/** An API this platform does not have. */
inline NamedError notSupported(const std::string &message) {
  return NamedError("NotSupportedError", message);
}

/** Work interrupted before it could finish (a lost GPU device). */
inline NamedError abort(const std::string &message) {
  return NamedError("AbortError", message);
}

/** A resource that does not exist (a missing local file). */
inline NamedError notFound(const std::string &message) {
  return NamedError("NotFoundError", message);
}

/** An argument of the wrong type or shape. */
inline NamedError typeError(const std::string &message) {
  return NamedError("TypeError", message);
}

} // namespace SkiaErrors

} // namespace RNSkia
