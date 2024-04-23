import _ from "lodash";
import { Arg, Member, Method, Obj } from "./model";
import { computeDependencies, isAtomicType, objectName } from './common';

// Special builtin: char, uint64_t, check if uint64_t is big it on Web

const generateArg = (index: number, arg: Arg) => {
  const name = _.camelCase(arg.name);
  let unwrap = '';
  if (arg.type === "bool") {
    unwrap = `${name}.asBool()`;
  } else if (arg.type === "uint32_t") {
    unwrap = `${name}.asNumber()`;
  } else {
    const name = objectName(arg.type);
    const className = `Jsi${name}`;
    unwrap = `${className}::fromValue(runtime, arguments[${index}])`;
  }
  if (arg.optional) {
    return `auto ${name} = count > ${index} ? ${unwrap} : default${_(name).upperFirst()};`;
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
    const className = `Jsi${name}`;
    return `jsi::Object::createFromHostObject(runtime, std::make_shared<${className}>(getContext(), ret))`
  }
};

const argList = (args: Arg[]) => args.map(arg => `*${arg.name}.get()`).join(", ");

const generatorMethod = (method: Method) => {
  const args = (method.args ?? []);
  const returns = method.returns;
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}
    ${returns ? 'auto ret = ' : ''}getObject()->${_.camelCase(method.name)}(${argList(args)});
    return ${wrapReturnValue(returns)};
  }
`;
};

export const generateObject = (name: string, object: Obj | Member) => {
  const className = `Jsi${name}`;
  const objectName = `wgpu::${name}`;
  const methods: Method[] = (object as any).methods ?? [];
  return `#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

${computeDependencies(object)}

namespace RNSkia {

namespace jsi = facebook::jsi;

class ${className} : public JsiSkWrappingSharedPtrHostObject<${objectName}> {
public:
${className}(std::shared_ptr<RNSkPlatformContext> context, ${objectName} m)
      : JsiSkWrappingSharedPtrHostObject<${objectName}>(
            context, std::make_shared<${objectName}>(std::move(m))) {}

  ${methods.map(method => generatorMethod(method)).join("\n  ")}

  EXPORT_JSI_API_TYPENAME(${className}, ${name})

  ${methods.length > 0 ? `JSI_EXPORT_FUNCTIONS(
    ${methods.map(method => `JSI_EXPORT_FUNC(${className}, ${_.camelCase(method.name)})`).join(",\n    ")}
  )` : ''}

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