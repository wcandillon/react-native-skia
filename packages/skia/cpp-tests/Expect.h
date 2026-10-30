#pragma once

// The assertions of the host-side tests that need more than one check (see
// run.sh): a failed EXPECT reports its expression and line and the test goes
// on, a failed REQUIRE ends the test, and main() returns 1 once any failed.

#include <cstdio>
#include <vector>

namespace expect {

struct TestCase {
  const char *name;
  void (*body)();
};

inline std::vector<TestCase> &testCases() {
  static std::vector<TestCase> cases;
  return cases;
}

inline bool &currentTestFailed() {
  static bool failed = false;
  return failed;
}

/** Whether the running test has failed an expectation so far. */
inline bool hasFailure() { return currentTestFailed(); }

inline bool check(bool passed, const char *expression, const char *file,
                  int line) {
  if (!passed) {
    std::fprintf(stderr, "%s:%d: FAIL: %s\n", file, line, expression);
    currentTestFailed() = true;
  }
  return passed;
}

struct Registration {
  Registration(const char *name, void (*body)()) {
    testCases().push_back({name, body});
  }
};

/** Thrown by a failed REQUIRE, in the test or in a helper it calls. */
struct RequirementFailed {};

/** Runs every test case of the file; 0 when all passed, else 1. */
inline int runTestCases(const char *suite) {
  int failed = 0;
  for (const auto &testCase : testCases()) {
    currentTestFailed() = false;
    try {
      testCase.body();
    } catch (const RequirementFailed &) {
    }
    if (currentTestFailed()) {
      std::fprintf(stderr, "%s.%s: failed\n", suite, testCase.name);
      failed++;
    }
  }
  std::printf("%s: %zu passed, %d failed\n", suite,
              testCases().size() - static_cast<size_t>(failed), failed);
  return failed == 0 ? 0 : 1;
}

} // namespace expect

#define TEST_CASE(name)                                                        \
  static void name();                                                          \
  static const expect::Registration name##Registration(#name, name);           \
  static void name()

#define EXPECT(...)                                                            \
  expect::check(static_cast<bool>(__VA_ARGS__), #__VA_ARGS__, __FILE__,        \
                __LINE__)

#define REQUIRE(...)                                                           \
  do {                                                                         \
    if (!EXPECT(__VA_ARGS__)) {                                                \
      throw expect::RequirementFailed{};                                       \
    }                                                                          \
  } while (false)
