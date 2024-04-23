import _ from "lodash";
import { Arg, MemberTag, Method, WGPUObject } from "./model";
import { objectName } from './common';

// Special builtin: char, uint64_t, check if uint64_t is big it on Web

const isAtomicType = (type: string) => type === "bool" || type === "uint32_t";

const generateArg = (index: number, arg: Arg) => {
  const name = _.camelCase(arg.name);
  let unwrap = '';
  if (arg.type === "bool") {
    unwrap = `${name}.asBool()`;
  } else if (arg.type === "uint32_t") {
    unwrap = `${name}.asNumber()`;
  } else {
    const name = objectName(arg.name);
    const className = `JsiWGPU${name}`;
    unwrap = `${className}::fromValue(runtime, arguments[${index}])`;
  }
  return `auto ${name} = ${unwrap};`;
};

export const wrapReturnValue = (returns: string | undefined) => {
  if (returns === undefined) {
    return "jsi::Value::undefined()";
  } else if (isAtomicType(returns)) {
    return "jsi::Value(ret)";
  } else {
    const name = objectName(returns);
    const className = `JsiWGPU${name}`;
    return `jsi::Object::createFromHostObject(runtime, std::make_shared<${className}>(getContext(), ret)`
  }
};

const generatorMethod = (method: Method) => {
  const args = method.args ?? [];
  const returns = method.returns;
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}
    ${returns ? 'auto ret = ' : ''}getObject()->${_.camelCase(method.name)}(${args.map(arg => arg.name).join(", ")});
    return ${wrapReturnValue(returns)};
  }
`;
};

const generatorAsyncMethod = (method: Method) => {
  const a = method.args ?? [];
  const args = a.slice(0, -1) ?? [];
  const cb = a[a.length - 1];
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}

    return RNJsi::JsiPromises::createPromiseAsJSIValue(
      runtime,
      [context = std::move(context)](
          jsi::Runtime &runtime,
          std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
            getObject()->${_.camelCase(method.name)}(${args.map(arg => arg.name).join(", ")}, [](${_.camelCase(cb.type)} result) -> {
              promise->resolve(jsi::Object::createFromHostObject(
                runtime, std::make_shared<${objectName(cb.type)}>(std::move(context),
                                                     std::move(result))));
              });
            });
      });
  }
`;
};

export const generateObject = (name: string, object: WGPUObject) => {
  const className = object.jsiName ? object.jsiName : `JsiGPU${name}`;
  const objectName = `wgpu::${name}`;
  const methods = object.methods.filter(method => !(method.tags ?? []).includes(MemberTag.Emscripten));
  return `#pragma once

#include <jsi/jsi.h>

#include "webgpu.hpp"

#include "JsiHostObject.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class ${className} : public JsiSkWrappingSharedPtrHostObject<${objectName}> {
public:
${className}(std::shared_ptr<RNSkPlatformContext> context, ${objectName} m)
      : JsiSkWrappingSharedPtrHostObject<${objectName}>(
            context, std::make_shared<${objectName}>(std::move(m))) {}

  ${methods.filter(method => !method.async).map(method => generatorMethod(method)).join("\n  ")}
  ${methods.filter(method => method.async).map(method => generatorAsyncMethod(method)).join("\n  ")}

  EXPORT_JSI_API_BRANDNAME(${className}, WGPU${name})

  JSI_EXPORT_FUNCTIONS(
    ${methods.map(method => `JSI_EXPORT_FUNC(${className}, ${_.camelCase(method.name)})`).join(",\n    ")}
  )

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<${objectName}> fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<${className}>(runtime)->getObject();
  }
};
} // namespace RNSkia
`;
};