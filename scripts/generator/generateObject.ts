import _ from "lodash";
import { Arg, JSIObject, Method, Property } from "./model";
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
    let result = ''
    if (arg.defaultValue) {
      result += `auto default${_.upperFirst(name)} = std::make_shared<wgpu::${arg.type}>();
      `;
    }
    result += `auto ${name} = count > ${index} ? ${unwrap} : default${_(name).upperFirst()};`;
    return result;
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
  const args = method.args;
  const returns = method.returns;
  if (method.implementation) {
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${method.implementation}
  }
`;
  }
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}
    ${returns ? 'auto ret = ' : ''}getObject()->${_.camelCase(method.name)}(${argList(args)});
    return ${wrapReturnValue(returns)};
  }
`;
};

const generatorAsyncMethod = (method: Method) => {
  const args = method.args;
  const depList = `,${args.map(arg => `${arg.name} = std::move(${arg.name})`).join(", ")}`;
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}
    auto context = getContext();
    auto object = getObject();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [context = std::move(context), object = std::move(object) ${depList}](
            jsi::Runtime &runtime,
            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
          auto ret = object->${method.name}(${argList(args)});
          if (ret == nullptr) {
            promise->resolve(jsi::Value::null());
          } else {
            promise->resolve(jsi::Object::createFromHostObject(
                runtime, std::make_shared<Jsi${method.returns}>(std::move(context),
                                                      std::move(ret))));
          }
        });
  }
`;
};

const unpackProperties = (name: string, properties: Property[]) => {
  return `wgpu::${name} object;
  const auto &o = obj.asObject(runtime);
${properties.map(property => {
  const name = _.camelCase(property.name);
  return `auto ${name} = o.getProperty(runtime, "${property.name}");
  object.${name} = ${name};`;
}).join(`
`)}`;
}

export const generateObject = (object: JSIObject) => {
  const className = `Jsi${object.name}`;
  const objectName = `wgpu::${object.host ? object.host : object.name}`;
  const methods = object.methods ?? [];
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

  ${methods.filter(method => !method.async).map(method => generatorMethod(method)).join("\n  ")}
  ${methods.filter(method => method.async).map(method => generatorAsyncMethod(method)).join("\n  ")}

  EXPORT_JSI_API_BRANDNAME(${className}, ${object.name})

  ${methods.length > 0 ? `JSI_EXPORT_FUNCTIONS(
    ${methods.map(method => `JSI_EXPORT_FUNC(${className}, ${_.camelCase(method.name)})`).join(",\n    ")}
  )` : ''}

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<${objectName}> fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &obj) {
    if (obj.isHostObject(runtime)) {
      return obj.asObject(runtime).asHostObject<${className}>(runtime)->getObject();
    } else {
    ${object.properties ? unpackProperties(object.name, object.properties) : `throw jsi::JSError(
      runtime,
      "Expected a ${className} object, but got a " + obj.toString(runtime).utf8(runtime));`}
    }
  }
};
} // namespace RNSkia
`;
};