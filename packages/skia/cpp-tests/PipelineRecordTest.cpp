// Host-side check of RNSkia::RNSkPipelineRecord (see run.sh): a key is
// kept once, the oldest goes past the bound, the file comes back as
// written, or empty when it is not a record, and a key is portable unless
// its paint uses a runtime effect.

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <unistd.h>
#include <vector>

#include "rnskia/RNSkPipelineRecord.h"

namespace {

using RNSkia::RNSkPipelineRecord;
using Key = RNSkPipelineRecord::Key;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

Key key(const std::string &text) { return {text.begin(), text.end()}; }

Key numbered(size_t i) { return key("key-" + std::to_string(i)); }

// A key as Graphite serializes it (see RNSkPipelineRecord::isPortable):
// the paint key's words between the render step and a render pass.
Key graphiteKey(const std::vector<int32_t> &words, uint32_t version = 3) {
  Key key = {'s', 'k', 'i', 'a', 'p', 'i', 'p', 'e'};
  const auto append = [&key](uint32_t value) {
    const auto *bytes = reinterpret_cast<const uint8_t *>(&value);
    key.insert(key.end(), bytes, bytes + sizeof(value));
  };
  append(version);
  append(/* renderStepID= */ 6);
  append(static_cast<uint32_t>(words.size()));
  for (const int32_t word : words) {
    append(static_cast<uint32_t>(word));
  }
  // The render pass: three attachment tags, the swizzle, the sample count,
  // the end tag, as a Pixel 8 wrote them.
  const uint8_t renderPass[] = {0x01, 0x00, 0x01, 0x13, 0x01, 0x00, 0x00,
                                0x00, 0x01, 0x01, 0x01, 0x30, 0x10, 0x32,
                                0x01, 0x20, 0x64, 0x6e, 0x65};
  key.insert(key.end(), renderPass, renderPass + sizeof(renderPass));
  return key;
}

} // namespace

int main() {
  {
    RNSkPipelineRecord record;
    expect(record.add(key("a")), "a new key is added");
    expect(!record.add(key("a")), "a key is kept once");
    expect(!record.add(Key()), "an empty key is not a key");
    expect(record.add(key("b")), "a second key is added");
    expect(record.size() == 2, "two keys");
    expect(record.keys()[0] == key("a") && record.keys()[1] == key("b"),
           "in the order they came");
  }
  {
    RNSkPipelineRecord record;
    for (size_t i = 0; i < RNSkPipelineRecord::kMaxKeys + 3; i++) {
      record.add(numbered(i));
    }
    expect(record.size() == RNSkPipelineRecord::kMaxKeys,
           "bounded at kMaxKeys");
    expect(record.keys().front() == numbered(3), "the oldest went");
    expect(record.add(numbered(0)), "a key that went can come back");
  }
  {
    const std::string path =
        std::string(std::getenv("TMPDIR") ? std::getenv("TMPDIR") : "/tmp") +
        "/rnskia-pipeline-record-" + std::to_string(std::rand());
    expect(RNSkPipelineRecord::load(path).empty(), "no file: no keys");

    RNSkPipelineRecord record;
    record.add(key("first"));
    record.add(key("second"));
    record.add(Key(300, 0x7f));
    expect(RNSkPipelineRecord::write(path, record.keys()), "written");
    const auto loaded = RNSkPipelineRecord::load(path);
    expect(loaded == record.keys(), "read back as written");

    // Another format at the same path: not a record.
    std::FILE *file = std::fopen(path.c_str(), "wb");
    std::fputs("RNSKBLOB....", file);
    std::fclose(file);
    expect(RNSkPipelineRecord::load(path).empty(), "another format: no keys");

    // A truncated write: the keys before the cut.
    RNSkPipelineRecord::write(path, record.keys());
    file = std::fopen(path.c_str(), "rb");
    std::fseek(file, 0, SEEK_END);
    const long size = std::ftell(file);
    std::fclose(file);
    expect(truncate(path.c_str(), size - 100) == 0, "truncated");
    const auto cut = RNSkPipelineRecord::load(path);
    expect(cut.size() == 2 && cut[0] == key("first") && cut[1] == key("second"),
           "a truncated record keeps the keys before the cut");

    std::remove(path.c_str());
  }
  {
    // A solid color, then an image through a local matrix: built-in
    // snippets only.
    expect(RNSkPipelineRecord::isPortable(graphiteKey({-1, 2, -2, 59})),
           "a solid color is portable");
    expect(RNSkPipelineRecord::isPortable(
               graphiteKey({-1, 21, 54, 32, 26, -1, 41, -2, 61})),
           "an image is portable");
    expect(RNSkPipelineRecord::isPortable(graphiteKey({})),
           "a paint without a key is portable");
    // The key a Pixel 8 recorded for an image composed with the luma color
    // filter (Skia's known runtime effect 527), which crashed the warmup of
    // the next context (#4398), and a blur (504).
    const Key luma = {
        0x73, 0x6b, 0x69, 0x61, 0x70, 0x69, 0x70, 0x65, 0x03, 0x00, 0x00, 0x00,
        0x06, 0x00, 0x00, 0x00, 0x0b, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff,
        0x36, 0x00, 0x00, 0x00, 0x15, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00,
        0x20, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff,
        0x29, 0x00, 0x00, 0x00, 0x0f, 0x02, 0x00, 0x00, 0xfe, 0xff, 0xff, 0xff,
        0x40, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x13, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x01, 0x01, 0x30, 0x10, 0x32, 0x01, 0x20, 0x64, 0x6e, 0x65};
    expect(!RNSkPipelineRecord::isPortable(luma),
           "the luma color filter is not portable");
    expect(!RNSkPipelineRecord::isPortable(
               graphiteKey({-1, 504, 21, 54, 24, -1, 1, -2, 59})),
           "a blur is not portable");
    expect(!RNSkPipelineRecord::isPortable(graphiteKey({-1, 1100, -2, 59})),
           "a user runtime effect is not portable");
    // Another layout: another version of the format, another magic, a key
    // cut short of its words.
    expect(!RNSkPipelineRecord::isPortable(graphiteKey({-1, 2, -2, 59}, 4)),
           "another version is not portable");
    expect(!RNSkPipelineRecord::isPortable(key("RNSKPIPE and more bytes")),
           "another format is not portable");
    Key cut = graphiteKey({-1, 2, -2, 59});
    cut.resize(24);
    expect(!RNSkPipelineRecord::isPortable(cut), "a cut key is not portable");
    expect(!RNSkPipelineRecord::isPortable(Key()), "an empty key is not");
  }
  if (failures == 0) {
    std::printf("PipelineRecordTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "PipelineRecordTest: %d failure(s)\n", failures);
  return 1;
}
