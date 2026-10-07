#pragma once

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "include/core/SkData.h"
#include "include/core/SkRefCnt.h"

namespace RNSkia {

class RNSkPipelineStorage {
public:
  static std::unique_ptr<RNSkPipelineStorage>
  Open(const std::string &cacheDirectory, const std::string &version);

  size_t loadBlob(const uint8_t *key, size_t keySize, uint8_t *value,
                  size_t valueSize) const;
  void storeBlob(const uint8_t *key, size_t keySize, const uint8_t *value,
                 size_t valueSize) const;

  void storePipelineKey(const SkData &pipelineKey) const;
  std::vector<sk_sp<SkData>> loadPipelineKeys() const;
  void rejectPipelineKey(const SkData &pipelineKey) const;

  const std::string &root() const { return _root; }

private:
  RNSkPipelineStorage(std::string root, std::string blobDirectory,
                      std::string pipelineDirectory);

  std::string blobPath(const uint8_t *key, size_t keySize) const;
  std::string pipelinePath(const SkData &pipelineKey,
                           const char *extension) const;
  bool writeAtomically(const std::string &path,
                       const std::vector<uint8_t> &contents) const;

  std::string _root;
  std::string _blobDirectory;
  std::string _pipelineDirectory;
  mutable std::atomic<uint64_t> _nextTemporaryId{0};
};

namespace RNSkPipelineStorageFormat {

std::string HashName(const uint8_t *bytes, size_t size);

std::vector<uint8_t> EncodeBlob(const uint8_t *key, size_t keySize,
                                const uint8_t *value, size_t valueSize);

bool DecodeBlob(const std::vector<uint8_t> &contents, const uint8_t *key,
                size_t keySize, size_t *valueOffset, size_t *valueSize);

} // namespace RNSkPipelineStorageFormat

} // namespace RNSkia
