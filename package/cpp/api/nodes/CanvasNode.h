#pragma once

#include "Node.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"


#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class NodeCanvas: public Node {
    public:
        NodeCanvas(jsi::Runtime &runtime, jsi::Object &props): Node(runtime, props) {}

        std::string name() {
            return "CanvasNode";
        }

    };

} // namespace RNSkia
