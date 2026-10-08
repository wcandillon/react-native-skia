// The recorder headers depend on the include order established by
// JsiSkApi.h, so the probe lives here rather than in ViewProperty.h (which
// every platform view includes on its own).
#include "api/JsiSkApi.h"

#include "jsi/ViewProperty.h"

#include "api/JsiSkPicture.h"
#include "api/recorder/JsiRecorder.h"

namespace RNJsi {

ViewProperty::ViewProperty(jsi::Runtime &runtime, const jsi::Value &value) {
  if (auto picture =
          RNSkia::tryGetJsiObject<RNSkia::JsiSkPicture>(runtime, value)) {
    _value = picture->getObject();
  } else if (auto recorder =
                 RNSkia::tryGetJsiObject<RNSkia::JsiRecorder>(runtime, value)) {
    _value = recorder->getObject();
  }
}

} // namespace RNJsi
