// Host-side check of RNSkia::SkSLErrorText, which reads the diagnostics of
// an SkSL compilation (the messages of an SkSLCompilationError) from the
// error text Skia gives (see SkSL::Compiler::handleError).

#include <cstdio>
#include <string>

#include "utils/SkSLErrorText.h"

using RNSkia::SkSLErrorText::parseCompilationMessages;

static int failures = 0;

static void check(bool condition, const char *message) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", message);
    failures++;
  }
}

int main() {
  {
    // A message per error, with the line, the echoed source and the carets
    // under the culprit; the summary line is left out.
    auto messages =
        parseCompilationMessages("error: 2: unknown identifier 'foo'\n"
                                 "  return foo;\n"
                                 "         ^^^\n"
                                 "error: 5: expected ';', but found '}'\n"
                                 "}\n"
                                 "^\n"
                                 "2 errors\n");
    check(messages.size() == 2, "two messages");
    check(messages[0].type == "error", "type");
    check(messages[0].lineNum == 2, "line of the first message");
    check(messages[0].linePos == 10, "position from the carets");
    check(messages[0].message == "unknown identifier 'foo'", "message text");
    check(messages[1].lineNum == 5 && messages[1].linePos == 1,
          "location of the second message");
  }
  {
    // A message without a location.
    auto messages =
        parseCompilationMessages("error: main must return half4\n1 error\n");
    check(messages.size() == 1, "one message");
    check(messages[0].lineNum == 0 && messages[0].linePos == 0, "no location");
    check(messages[0].message == "main must return half4", "message text");
  }
  {
    // A truncated source line ("...") gives no position.
    auto messages = parseCompilationMessages("error: 7: too long\n"
                                             "...x = y;\n"
                                             "   ^\n");
    check(messages.size() == 1 && messages[0].lineNum == 7, "line");
    check(messages[0].linePos == 0, "no position in a truncated line");
  }
  {
    // Warnings keep their type.
    auto messages =
        parseCompilationMessages("warning: 2: unused\nerror: 4: bad\n");
    check(messages.size() == 2, "two messages");
    check(messages[0].type == "warning" && messages[1].type == "error",
          "types");
  }
  {
    // Text in no known form is one message.
    auto messages = parseCompilationMessages("something odd");
    check(messages.size() == 1 && messages[0].message == "something odd",
          "the text as a message");
    check(parseCompilationMessages("").empty(), "nothing for no text");
  }
  if (failures > 0) {
    std::fprintf(stderr, "SkSLErrorTextTest: %d failure(s)\n", failures);
    return 1;
  }
  std::printf("SkSLErrorTextTest: ok\n");
  return 0;
}
