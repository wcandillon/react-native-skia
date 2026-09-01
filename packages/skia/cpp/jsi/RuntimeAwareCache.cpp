#include "RuntimeAwareCache.h"

namespace RNJsi {

std::atomic<jsi::Runtime *> BaseRuntimeAwareCache::_mainRuntime{nullptr};
std::atomic<uint64_t> BaseRuntimeAwareCache::_mainRuntimeGeneration{0};

} // namespace RNJsi
