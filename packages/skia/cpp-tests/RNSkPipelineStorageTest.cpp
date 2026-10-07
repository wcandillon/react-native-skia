#include "RNSkPipelineStorage.h"

#include <algorithm>
#include <atomic>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iterator>
#include <string>
#include <thread>
#include <vector>

namespace fs = std::filesystem;
using RNSkia::RNSkPipelineStorage;
namespace Format = RNSkia::RNSkPipelineStorageFormat;

namespace {

int gFailures = 0;
int gChecks = 0;

void check(bool condition, const char *expression, const char *file, int line) {
  ++gChecks;
  if (!condition) {
    ++gFailures;
    std::fprintf(stderr, "FAILED: %s (%s:%d)\n", expression, file, line);
  }
}

#define CHECK(expression) check((expression), #expression, __FILE__, __LINE__)

struct TestCase {
  const char *name;
  std::function<void(const fs::path &)> body;
};

std::vector<uint8_t> bytes(const std::string &text) {
  return std::vector<uint8_t>(text.begin(), text.end());
}

std::vector<uint8_t> readAll(const fs::path &path) {
  std::ifstream file(path, std::ios::binary);
  return std::vector<uint8_t>(std::istreambuf_iterator<char>(file),
                              std::istreambuf_iterator<char>());
}

void writeAll(const fs::path &path, const std::vector<uint8_t> &contents) {
  std::ofstream file(path, std::ios::binary | std::ios::trunc);
  file.write(reinterpret_cast<const char *>(contents.data()),
             static_cast<std::streamsize>(contents.size()));
}

std::vector<uint8_t> load(const RNSkPipelineStorage &storage,
                          const std::vector<uint8_t> &key) {
  const size_t size = storage.loadBlob(key.data(), key.size(), nullptr, 0);
  if (size == 0) {
    return {};
  }
  std::vector<uint8_t> value(size);
  const size_t loaded =
      storage.loadBlob(key.data(), key.size(), value.data(), value.size());
  if (loaded != size) {
    return {};
  }
  return value;
}

fs::path blobFile(const RNSkPipelineStorage &storage,
                  const std::vector<uint8_t> &key) {
  return fs::path(storage.root()) / "dawn" /
         (Format::HashName(key.data(), key.size()) + ".blob");
}

sk_sp<SkData> data(const std::string &text) {
  return SkData::MakeWithCopy(text.data(), text.size());
}

std::vector<std::string> keyTexts(const RNSkPipelineStorage &storage) {
  std::vector<std::string> texts;
  for (const auto &key : storage.loadPipelineKeys()) {
    texts.emplace_back(static_cast<const char *>(key->data()), key->size());
  }
  std::sort(texts.begin(), texts.end());
  return texts;
}

size_t countFiles(const fs::path &directory, const std::string &extension) {
  size_t count = 0;
  for (const auto &entry : fs::directory_iterator(directory)) {
    if (entry.path().extension() == extension) {
      ++count;
    }
  }
  return count;
}

const std::vector<TestCase> kTests = {
    {"Open refuses an empty cache directory or version.",
     [](const fs::path &dir) {
       CHECK(RNSkPipelineStorage::Open("", "m154") == nullptr);
       CHECK(RNSkPipelineStorage::Open(dir.string(), "") == nullptr);
     }},
    {"Open creates the versioned directories.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       CHECK(storage != nullptr);
       const fs::path root =
           dir / "react-native-skia" / "pipeline-cache" / "m154";
       CHECK(fs::path(storage->root()) == root);
       CHECK(fs::is_directory(root / "dawn"));
       CHECK(fs::is_directory(root / "graphite"));
     }},
    {"Open removes the directories of other versions and keeps its own.",
     [](const fs::path &dir) {
       const fs::path parent = dir / "react-native-skia" / "pipeline-cache";
       fs::create_directories(parent / "m153" / "dawn");
       writeAll(parent / "m153" / "dawn" / "old.blob", bytes("old"));
       fs::create_directories(parent / "m154" / "graphite");
       writeAll(parent / "m154" / "graphite" / "kept.key", bytes("kept"));
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       CHECK(storage != nullptr);
       CHECK(!fs::exists(parent / "m153"));
       CHECK(fs::exists(parent / "m154" / "graphite" / "kept.key"));
     }},
    {"Open fails when its directory cannot be created.",
     [](const fs::path &dir) {
       fs::create_directories(dir / "react-native-skia");
       writeAll(dir / "react-native-skia" / "pipeline-cache", bytes("file"));
       CHECK(RNSkPipelineStorage::Open(dir.string(), "m154") == nullptr);
     }},
    {"A stored blob loads back in two calls, size first.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("pipeline key");
       const auto value = bytes("compiled pipeline bytes");
       storage->storeBlob(key.data(), key.size(), value.data(), value.size());
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) ==
             value.size());
       CHECK(load(*storage, key) == value);
     }},
    {"A blob that was never stored misses.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("missing");
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);
     }},
    {"A load into a buffer of the wrong size misses.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("key");
       const auto value = bytes("value");
       storage->storeBlob(key.data(), key.size(), value.data(), value.size());
       std::vector<uint8_t> small(value.size() - 1);
       CHECK(storage->loadBlob(key.data(), key.size(), small.data(),
                               small.size()) == 0);
       std::vector<uint8_t> large(value.size() + 1);
       CHECK(storage->loadBlob(key.data(), key.size(), large.data(),
                               large.size()) == 0);
     }},
    {"A blob stored again replaces the previous value.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("key");
       const auto first = bytes("first");
       const auto second = bytes("the second value");
       storage->storeBlob(key.data(), key.size(), first.data(), first.size());
       storage->storeBlob(key.data(), key.size(), second.data(), second.size());
       CHECK(load(*storage, key) == second);
     }},
    {"A blob survives reopening the storage.",
     [](const fs::path &dir) {
       const auto key = bytes("key");
       const auto value = bytes("value");
       {
         auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
         storage->storeBlob(key.data(), key.size(), value.data(), value.size());
       }
       auto reopened = RNSkPipelineStorage::Open(dir.string(), "m154");
       CHECK(load(*reopened, key) == value);
     }},
    {"Empty keys and values are not stored.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("key");
       const auto value = bytes("value");
       storage->storeBlob(key.data(), 0, value.data(), value.size());
       storage->storeBlob(key.data(), key.size(), value.data(), 0);
       storage->storeBlob(nullptr, key.size(), value.data(), value.size());
       storage->storeBlob(key.data(), key.size(), nullptr, value.size());
       CHECK(countFiles(fs::path(storage->root()) / "dawn", ".blob") == 0);
     }},
    {"A file holding another key's blob misses rather than returning it.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("key A");
       const auto other = bytes("key B");
       const auto value = bytes("value of B");
       writeAll(blobFile(*storage, key),
                Format::EncodeBlob(other.data(), other.size(), value.data(),
                                   value.size()));
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);
     }},
    {"A corrupted blob file misses.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("key");
       const auto value = bytes("value");
       storage->storeBlob(key.data(), key.size(), value.data(), value.size());
       const fs::path path = blobFile(*storage, key);
       const auto good = readAll(path);

       auto badMagic = good;
       badMagic[0] = 'X';
       writeAll(path, badMagic);
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);

       auto badVersion = good;
       badVersion[4] = 9;
       writeAll(path, badVersion);
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);

       writeAll(path, std::vector<uint8_t>(good.begin(), good.begin() + 10));
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);

       writeAll(path,
                std::vector<uint8_t>(good.begin(), good.end() - value.size()));
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);

       writeAll(path, {});
       CHECK(storage->loadBlob(key.data(), key.size(), nullptr, 0) == 0);
     }},
    {"Concurrent stores of one key leave one readable blob and no "
     "temporary files.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       const auto key = bytes("shared key");
       std::vector<std::vector<uint8_t>> values;
       for (int i = 0; i < 8; ++i) {
         values.push_back(bytes("value from writer " + std::to_string(i)));
       }
       std::vector<std::thread> writers;
       for (int i = 0; i < 8; ++i) {
         writers.emplace_back([&, i] {
           for (int round = 0; round < 50; ++round) {
             storage->storeBlob(key.data(), key.size(), values[i].data(),
                                values[i].size());
           }
         });
       }
       for (auto &writer : writers) {
         writer.join();
       }
       const auto loaded = load(*storage, key);
       CHECK(std::find(values.begin(), values.end(), loaded) != values.end());
       size_t entries = 0;
       for (const auto &entry :
            fs::directory_iterator(fs::path(storage->root()) / "dawn")) {
         (void)entry;
         ++entries;
       }
       CHECK(entries == 1);
     }},
    {"Pipeline keys load back once each.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       storage->storePipelineKey(*data("alpha"));
       storage->storePipelineKey(*data("beta"));
       storage->storePipelineKey(*data("alpha"));
       CHECK(keyTexts(*storage) == std::vector<std::string>({"alpha", "beta"}));
     }},
    {"An empty pipeline key is not stored.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       storage->storePipelineKey(*SkData::MakeEmpty());
       CHECK(storage->loadPipelineKeys().empty());
     }},
    {"Loading pipeline keys skips files that are not keys.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       storage->storePipelineKey(*data("alpha"));
       const fs::path graphite = fs::path(storage->root()) / "graphite";
       writeAll(graphite / "partial.key.tmp-1-2", bytes("partial"));
       writeAll(graphite / "notes.txt", bytes("notes"));
       writeAll(graphite / "empty.key", {});
       CHECK(keyTexts(*storage) == std::vector<std::string>({"alpha"}));
     }},
    {"A rejected pipeline key is no longer loaded or stored again.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       storage->storePipelineKey(*data("alpha"));
       storage->storePipelineKey(*data("beta"));
       storage->rejectPipelineKey(*data("beta"));
       CHECK(keyTexts(*storage) == std::vector<std::string>({"alpha"}));
       storage->storePipelineKey(*data("beta"));
       CHECK(keyTexts(*storage) == std::vector<std::string>({"alpha"}));
       CHECK(countFiles(fs::path(storage->root()) / "graphite", ".rejected") ==
             1);
     }},
    {"Rejecting a key that was never stored changes nothing.",
     [](const fs::path &dir) {
       auto storage = RNSkPipelineStorage::Open(dir.string(), "m154");
       storage->storePipelineKey(*data("alpha"));
       storage->rejectPipelineKey(*data("gamma"));
       CHECK(keyTexts(*storage) == std::vector<std::string>({"alpha"}));
       CHECK(countFiles(fs::path(storage->root()) / "graphite", ".rejected") ==
             0);
     }},
    {"The blob format round-trips and checks its key.",
     [](const fs::path &) {
       const auto key = bytes("key");
       const auto value = bytes("value");
       const auto encoded = Format::EncodeBlob(key.data(), key.size(),
                                               value.data(), value.size());
       size_t offset = 0;
       size_t size = 0;
       CHECK(
           Format::DecodeBlob(encoded, key.data(), key.size(), &offset, &size));
       CHECK(size == value.size());
       CHECK(std::equal(value.begin(), value.end(), encoded.begin() + offset));
       const auto other = bytes("kez");
       CHECK(!Format::DecodeBlob(encoded, other.data(), other.size(), &offset,
                                 &size));
       const auto longer = bytes("key!");
       CHECK(!Format::DecodeBlob(encoded, longer.data(), longer.size(), &offset,
                                 &size));
       const auto noValue =
           Format::EncodeBlob(key.data(), key.size(), value.data(), 0);
       CHECK(!Format::DecodeBlob(noValue, key.data(), key.size(), &offset,
                                 &size));
     }},
    {"Hash names are 32 lowercase hex digits and tell inputs apart.",
     [](const fs::path &) {
       const auto a = bytes("pipeline a");
       const auto b = bytes("pipeline b");
       const std::string nameA = Format::HashName(a.data(), a.size());
       CHECK(nameA.size() == 32);
       CHECK(std::all_of(nameA.begin(), nameA.end(), [](char c) {
         return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
       }));
       CHECK(nameA == Format::HashName(a.data(), a.size()));
       CHECK(nameA != Format::HashName(b.data(), b.size()));
       CHECK(Format::HashName(nullptr, 0).size() == 32);
     }},
};

} // namespace

int main() {
  const fs::path base =
      fs::temp_directory_path() / ("rnskia-pipeline-storage-test-" +
                                   std::to_string(std::hash<std::thread::id>{}(
                                       std::this_thread::get_id())));
  fs::remove_all(base);
  int index = 0;
  for (const auto &test : kTests) {
    const int failuresBefore = gFailures;
    const fs::path dir = base / std::to_string(index++);
    fs::create_directories(dir);
    test.body(dir);
    std::printf("%s %s\n", gFailures == failuresBefore ? "PASS" : "FAIL",
                test.name);
  }
  fs::remove_all(base);
  std::printf("%zu tests, %d checks, %d failures\n", kTests.size(), gChecks,
              gFailures);
  return gFailures == 0 ? 0 : 1;
}
