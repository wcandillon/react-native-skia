#include "RNSkPipelineStorage.h"

#include <dirent.h>
#include <errno.h>
#include <ftw.h>
#include <sys/stat.h>
#include <unistd.h>

#include <algorithm>
#include <array>
#include <cstdio>
#include <cstring>
#include <functional>
#include <thread>
#include <utility>

#include "utils/RNSkLog.h"

namespace RNSkia {

namespace {

constexpr std::array<uint8_t, 4> kBlobMagic = {'R', 'N', 'S', 'B'};
constexpr uint32_t kBlobFormatVersion = 1;
constexpr size_t kBlobHeaderSize =
    kBlobMagic.size() + sizeof(uint32_t) + sizeof(uint64_t);

constexpr const char *kStorageDirectoryName = "react-native-skia";
constexpr const char *kPipelineCacheDirectoryName = "pipeline-cache";
constexpr const char *kBlobDirectoryName = "dawn";
constexpr const char *kPipelineDirectoryName = "graphite";
constexpr const char *kPipelineKeyExtension = ".key";
constexpr const char *kRejectedPipelineKeyExtension = ".rejected";
constexpr const char *kBlobExtension = ".blob";

uint64_t fnv1a(const uint8_t *bytes, size_t size, uint64_t basis) {
  uint64_t hash = basis;
  for (size_t i = 0; i < size; ++i) {
    hash ^= bytes[i];
    hash *= 0x100000001b3ULL;
  }
  return hash;
}

void appendLittleEndian(std::vector<uint8_t> &out, uint64_t value,
                        size_t byteCount) {
  for (size_t i = 0; i < byteCount; ++i) {
    out.push_back(static_cast<uint8_t>(value >> (8 * i)));
  }
}

uint64_t readLittleEndian(const uint8_t *bytes, size_t byteCount) {
  uint64_t value = 0;
  for (size_t i = 0; i < byteCount; ++i) {
    value |= static_cast<uint64_t>(bytes[i]) << (8 * i);
  }
  return value;
}

std::string join(const std::string &directory, const std::string &name) {
  return directory + "/" + name;
}

bool endsWith(const std::string &text, const char *suffix) {
  const size_t length = std::strlen(suffix);
  return text.size() >= length &&
         text.compare(text.size() - length, length, suffix) == 0;
}

bool exists(const std::string &path) {
  struct stat info;
  return stat(path.c_str(), &info) == 0;
}

bool makeDirectory(const std::string &path) {
  if (mkdir(path.c_str(), 0700) == 0) {
    return true;
  }
  struct stat info;
  return errno == EEXIST && stat(path.c_str(), &info) == 0 &&
         S_ISDIR(info.st_mode);
}

bool makeDirectories(const std::string &path) {
  for (size_t slash = path.find('/', 1); slash != std::string::npos;
       slash = path.find('/', slash + 1)) {
    if (!makeDirectory(path.substr(0, slash))) {
      return false;
    }
  }
  return makeDirectory(path);
}

int removeEntry(const char *path, const struct stat *, int, struct FTW *) {
  return remove(path);
}

bool removeTree(const std::string &path) {
  return nftw(path.c_str(), removeEntry, 16, FTW_DEPTH | FTW_PHYS) == 0;
}

bool listDirectory(const std::string &path, std::vector<std::string> *names) {
  DIR *directory = opendir(path.c_str());
  if (directory == nullptr) {
    return false;
  }
  while (struct dirent *entry = readdir(directory)) {
    const std::string name = entry->d_name;
    if (name != "." && name != "..") {
      names->push_back(name);
    }
  }
  closedir(directory);
  return true;
}

bool readFile(const std::string &path, std::vector<uint8_t> *contents) {
  FILE *file = fopen(path.c_str(), "rb");
  if (file == nullptr) {
    return false;
  }
  contents->clear();
  uint8_t buffer[16384];
  size_t read = 0;
  while ((read = fread(buffer, 1, sizeof(buffer), file)) > 0) {
    contents->insert(contents->end(), buffer, buffer + read);
  }
  const bool failed = ferror(file) != 0;
  fclose(file);
  return !failed;
}

bool writeFile(const std::string &path, const std::vector<uint8_t> &contents) {
  FILE *file = fopen(path.c_str(), "wb");
  if (file == nullptr) {
    return false;
  }
  const bool written =
      contents.empty() ||
      fwrite(contents.data(), 1, contents.size(), file) == contents.size();
  return fclose(file) == 0 && written;
}

} // namespace

namespace RNSkPipelineStorageFormat {

std::string HashName(const uint8_t *bytes, size_t size) {
  static constexpr char kHex[] = "0123456789abcdef";
  const std::array<uint64_t, 2> halves = {
      fnv1a(bytes, size, 0xcbf29ce484222325ULL),
      fnv1a(bytes, size, 0x84222325cbf29ce4ULL)};
  std::string name;
  name.reserve(32);
  for (uint64_t half : halves) {
    for (int shift = 60; shift >= 0; shift -= 4) {
      name.push_back(kHex[(half >> shift) & 0xf]);
    }
  }
  return name;
}

std::vector<uint8_t> EncodeBlob(const uint8_t *key, size_t keySize,
                                const uint8_t *value, size_t valueSize) {
  std::vector<uint8_t> contents;
  contents.reserve(kBlobHeaderSize + keySize + valueSize);
  contents.insert(contents.end(), kBlobMagic.begin(), kBlobMagic.end());
  appendLittleEndian(contents, kBlobFormatVersion, sizeof(uint32_t));
  appendLittleEndian(contents, keySize, sizeof(uint64_t));
  contents.insert(contents.end(), key, key + keySize);
  contents.insert(contents.end(), value, value + valueSize);
  return contents;
}

bool DecodeBlob(const std::vector<uint8_t> &contents, const uint8_t *key,
                size_t keySize, size_t *valueOffset, size_t *valueSize) {
  if (contents.size() < kBlobHeaderSize) {
    return false;
  }
  if (!std::equal(kBlobMagic.begin(), kBlobMagic.end(), contents.begin())) {
    return false;
  }
  const uint8_t *cursor = contents.data() + kBlobMagic.size();
  if (readLittleEndian(cursor, sizeof(uint32_t)) != kBlobFormatVersion) {
    return false;
  }
  cursor += sizeof(uint32_t);
  const uint64_t storedKeySize = readLittleEndian(cursor, sizeof(uint64_t));
  if (storedKeySize != keySize ||
      contents.size() - kBlobHeaderSize < storedKeySize) {
    return false;
  }
  const uint8_t *storedKey = contents.data() + kBlobHeaderSize;
  if (keySize > 0 && std::memcmp(storedKey, key, keySize) != 0) {
    return false;
  }
  *valueOffset = kBlobHeaderSize + keySize;
  *valueSize = contents.size() - *valueOffset;
  return *valueSize > 0;
}

} // namespace RNSkPipelineStorageFormat

std::unique_ptr<RNSkPipelineStorage>
RNSkPipelineStorage::Open(const std::string &cacheDirectory,
                          const std::string &version) {
  if (cacheDirectory.empty() || version.empty()) {
    return nullptr;
  }
  const std::string parent = join(join(cacheDirectory, kStorageDirectoryName),
                                  kPipelineCacheDirectoryName);
  const std::string root = join(parent, version);
  const std::string blobDirectory = join(root, kBlobDirectoryName);
  const std::string pipelineDirectory = join(root, kPipelineDirectoryName);

  if (!makeDirectories(blobDirectory) || !makeDirectories(pipelineDirectory)) {
    RNSkLogger::logToConsole(
        "The pipeline cache could not create %s: %s. Pipelines will not be "
        "cached on disk.",
        root.c_str(), std::strerror(errno));
    return nullptr;
  }

  std::vector<std::string> versions;
  listDirectory(parent, &versions);
  for (const auto &name : versions) {
    if (name == version) {
      continue;
    }
    if (!removeTree(join(parent, name))) {
      RNSkLogger::logToConsole(
          "The pipeline cache could not remove the stale directory %s: %s.",
          join(parent, name).c_str(), std::strerror(errno));
    }
  }

  return std::unique_ptr<RNSkPipelineStorage>(
      new RNSkPipelineStorage(root, blobDirectory, pipelineDirectory));
}

RNSkPipelineStorage::RNSkPipelineStorage(std::string root,
                                         std::string blobDirectory,
                                         std::string pipelineDirectory)
    : _root(std::move(root)), _blobDirectory(std::move(blobDirectory)),
      _pipelineDirectory(std::move(pipelineDirectory)) {}

std::string RNSkPipelineStorage::blobPath(const uint8_t *key,
                                          size_t keySize) const {
  return join(_blobDirectory,
              RNSkPipelineStorageFormat::HashName(key, keySize) +
                  kBlobExtension);
}

std::string RNSkPipelineStorage::pipelinePath(const SkData &pipelineKey,
                                              const char *extension) const {
  return join(_pipelineDirectory, RNSkPipelineStorageFormat::HashName(
                                      pipelineKey.bytes(), pipelineKey.size()) +
                                      extension);
}

bool RNSkPipelineStorage::writeAtomically(
    const std::string &path, const std::vector<uint8_t> &contents) const {
  const std::string temporary =
      path + ".tmp-" +
      std::to_string(std::hash<std::thread::id>{}(std::this_thread::get_id())) +
      "-" + std::to_string(_nextTemporaryId.fetch_add(1));
  if (!writeFile(temporary, contents)) {
    RNSkLogger::logToConsole("The pipeline cache could not write %s: %s.",
                             temporary.c_str(), std::strerror(errno));
    unlink(temporary.c_str());
    return false;
  }
  if (rename(temporary.c_str(), path.c_str()) != 0) {
    RNSkLogger::logToConsole(
        "The pipeline cache could not move %s into place: %s.", path.c_str(),
        std::strerror(errno));
    unlink(temporary.c_str());
    return false;
  }
  return true;
}

size_t RNSkPipelineStorage::loadBlob(const uint8_t *key, size_t keySize,
                                     uint8_t *value, size_t valueSize) const {
  std::vector<uint8_t> contents;
  if (!readFile(blobPath(key, keySize), &contents)) {
    return 0;
  }
  size_t storedOffset = 0;
  size_t storedSize = 0;
  if (!RNSkPipelineStorageFormat::DecodeBlob(contents, key, keySize,
                                             &storedOffset, &storedSize)) {
    return 0;
  }
  if (value == nullptr || valueSize == 0) {
    return storedSize;
  }
  if (valueSize != storedSize) {
    return 0;
  }
  std::memcpy(value, contents.data() + storedOffset, storedSize);
  return storedSize;
}

void RNSkPipelineStorage::storeBlob(const uint8_t *key, size_t keySize,
                                    const uint8_t *value,
                                    size_t valueSize) const {
  if (key == nullptr || keySize == 0 || value == nullptr || valueSize == 0) {
    return;
  }
  writeAtomically(blobPath(key, keySize), RNSkPipelineStorageFormat::EncodeBlob(
                                              key, keySize, value, valueSize));
}

void RNSkPipelineStorage::storePipelineKey(const SkData &pipelineKey) const {
  if (pipelineKey.empty()) {
    return;
  }
  const std::string path = pipelinePath(pipelineKey, kPipelineKeyExtension);
  if (exists(path) ||
      exists(pipelinePath(pipelineKey, kRejectedPipelineKeyExtension))) {
    return;
  }
  writeAtomically(
      path, std::vector<uint8_t>(pipelineKey.bytes(),
                                 pipelineKey.bytes() + pipelineKey.size()));
}

std::vector<sk_sp<SkData>> RNSkPipelineStorage::loadPipelineKeys() const {
  std::vector<sk_sp<SkData>> keys;
  std::vector<std::string> names;
  if (!listDirectory(_pipelineDirectory, &names)) {
    RNSkLogger::logToConsole("The pipeline cache could not list %s: %s.",
                             _pipelineDirectory.c_str(), std::strerror(errno));
    return keys;
  }
  for (const auto &name : names) {
    if (!endsWith(name, kPipelineKeyExtension)) {
      continue;
    }
    std::vector<uint8_t> contents;
    if (!readFile(join(_pipelineDirectory, name), &contents) ||
        contents.empty()) {
      continue;
    }
    keys.push_back(SkData::MakeWithCopy(contents.data(), contents.size()));
  }
  return keys;
}

void RNSkPipelineStorage::rejectPipelineKey(const SkData &pipelineKey) const {
  if (rename(
          pipelinePath(pipelineKey, kPipelineKeyExtension).c_str(),
          pipelinePath(pipelineKey, kRejectedPipelineKeyExtension).c_str()) !=
          0 &&
      errno != ENOENT) {
    RNSkLogger::logToConsole("The pipeline cache could not set aside a "
                             "pipeline key that cannot be precompiled: %s.",
                             std::strerror(errno));
  }
}

} // namespace RNSkia
