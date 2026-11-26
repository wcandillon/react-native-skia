#pragma once

#include <cstdlib>
#include <string>
#include <utility>
#include <vector>

namespace RNSkia {

/**
 The diagnostics of an SkSL compilation, read from the error text Skia
 gives (SkRuntimeEffect::Result::errorText). Free of JSI, for the host-side
 tests (cpp-tests/SkSLErrorTextTest.cpp).
 */
namespace SkSLErrorText {

/** One diagnostic of an SkSL compilation (SkSLCompilationMessage). */
struct CompilationMessage {
  std::string type;
  std::string message;
  int lineNum = 0;
  int linePos = 0;
};

/**
 The diagnostics of SkSL error text (SkSL::Compiler::handleError): one per
 "error: 12: message" line, the line number optional, each followed by the
 source line and a line of carets under the culprit, which gives the
 position. The "1 error" summary line is left out. Text in no such form is
 one message without a location.
 */
inline std::vector<CompilationMessage>
parseCompilationMessages(const std::string &errorText) {
  std::vector<CompilationMessage> messages;
  // The source line echoed after the last message: a truncated one starts
  // with "...", and its carets give no position in the line.
  bool echoed = false;
  bool truncated = false;
  size_t start = 0;
  while (start < errorText.size()) {
    auto end = errorText.find('\n', start);
    if (end == std::string::npos) {
      end = errorText.size();
    }
    auto line = errorText.substr(start, end - start);
    start = end + 1;
    bool isMessage = false;
    for (const char *type : {"error", "warning"}) {
      std::string prefix = std::string(type) + ": ";
      if (line.rfind(prefix, 0) != 0) {
        continue;
      }
      isMessage = true;
      auto rest = line.substr(prefix.size());
      CompilationMessage message;
      message.type = type;
      // "12: message" carries the line; "message" alone does not.
      auto colon = rest.find(": ");
      char *parsed = nullptr;
      long lineNum = std::strtol(rest.c_str(), &parsed, 10);
      if (colon != std::string::npos && parsed == rest.c_str() + colon) {
        message.lineNum = static_cast<int>(lineNum);
        message.message = rest.substr(colon + 2);
      } else {
        message.message = rest;
      }
      messages.push_back(std::move(message));
      echoed = false;
      break;
    }
    if (isMessage || messages.empty()) {
      continue;
    }
    if (!echoed) {
      echoed = true;
      truncated = line.rfind("...", 0) == 0;
      continue;
    }
    auto caret = line.find('^');
    bool caretLine = caret != std::string::npos &&
                     line.find_first_not_of(" ^.") == std::string::npos;
    if (caretLine && !truncated && messages.back().linePos == 0) {
      messages.back().linePos = static_cast<int>(caret) + 1;
    }
  }
  if (messages.empty() && !errorText.empty()) {
    messages.push_back({"error", errorText, 0, 0});
  }
  return messages;
}

} // namespace SkSLErrorText

} // namespace RNSkia
