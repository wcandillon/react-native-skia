// Host-side check of RNSkia::beginFrame, how a job of the producer begins the
// frame it records (see run.sh). The context and the canvas are stand-ins:
// the checks cover what the job does with each way beginning can end.

#include <cstdio>
#include <stdexcept>
#include <string>
#include <vector>

#include "rnskia/RNSkFrameStart.h"

namespace {

struct Context {};

} // namespace

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

int main() {
  using RNSkia::beginFrame;
  Context context;
  int surface = 0;
  auto *canvas = reinterpret_cast<SkCanvas *>(&surface);
  std::vector<std::string> logged;
  auto log = [&logged](const char *failure) { logged.emplace_back(failure); };
  int begins = 0;
  auto opens = [&](Context &) {
    begins++;
    return canvas;
  };
  // Without a GPU there is no frame, and nothing to say: Skia.gpu says why.
  if (beginFrame<Context>(nullptr, opens, log) != nullptr || begins != 0 ||
      !logged.empty()) {
    return fail("a frame begins, or a failure is told, without a GPU");
  }
  // A view without a size waits for one, quietly.
  auto sizeless = [&](Context &) -> SkCanvas * {
    begins++;
    return nullptr;
  };
  if (beginFrame(&context, sizeless, log) != nullptr || begins != 1 ||
      !logged.empty()) {
    return fail("a view without a size is told as a failure");
  }
  // A recording that cannot begin otherwise says what failed.
  auto refused = [&](Context &) -> SkCanvas * {
    begins++;
    throw std::runtime_error("a recording is already open");
  };
  if (beginFrame(&context, refused, log) != nullptr || begins != 2) {
    return fail("a recording that cannot begin returns a canvas");
  }
  if (logged.size() != 1 || logged[0] != "a recording is already open") {
    return fail("a recording that cannot begin is dropped without a word");
  }
  // A frame that begins is recorded into the canvas the context opened.
  Context *opened = nullptr;
  auto records = [&](Context &on) {
    opened = &on;
    return canvas;
  };
  if (beginFrame(&context, records, log) != canvas || opened != &context ||
      logged.size() != 1) {
    return fail("a frame that begins is not recorded into its canvas");
  }
  std::printf("FrameStartTest: passed\n");
  return 0;
}
