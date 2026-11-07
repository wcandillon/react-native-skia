// Host-side check of RNSkia::RNSkPipelineRecord (see run.sh): a key is
// kept once, the oldest goes past the bound, and the file comes back as
// written, or empty when it is not a record.

#include <cstdio>
#include <cstdlib>
#include <string>
#include <unistd.h>

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
  if (failures == 0) {
    std::printf("PipelineRecordTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "PipelineRecordTest: %d failure(s)\n", failures);
  return 1;
}
