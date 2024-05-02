#pragma once

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

struct MutableJSIBuffer : jsi::MutableBuffer {
  MutableJSIBuffer(void *data, size_t size) : _data(data), _size(size) {}

  size_t size() const override { return _size; }

  uint8_t *data() override { return reinterpret_cast<uint8_t *>(_data); }

  void *_data;
  size_t _size;
};

} // namespace RNSkia