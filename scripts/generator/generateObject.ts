import _ from "lodash";
import { Arg, JSIObject, Method, Property } from "./model";
import { computeDependencies, isAtomicType, isNumberType, objectName, unWrapType } from './common';
import { isEnum } from "./enums";

const makeSingular = (name: string) => {
  if (name === "entries") {
    return "entry";
  }
  return name.substring(0, name.length - 1);
};

const generateArg = (index: number, arg: Arg) => {
  const isArray = arg.type.endsWith("[]");
  const name = _.camelCase(arg.name);
  if (isArray) {
    const baseType = arg.type.substring(0, arg.type.length - 2);
    return `std::vector<${arg.ctype ? `WGPU${baseType}` : `wgpu::${baseType}`}> ${name};
auto jsiArray = arguments[${index}].asObject(runtime).asArray(runtime);
auto jsiArraySize = static_cast<int>(jsiArray.size(runtime));
for (int i = 0; i < jsiArraySize; i++) {
  auto val = jsiArray.getValueAtIndex(runtime, i);
  ${name}.push_back(${unWrapType("val", baseType, false)});
}`;
  }
  let unwrap = '';
  if (arg.type === "bool") {
    unwrap = `${name}.asBool()`;
  } else if (isNumberType(arg.type)) {
    unwrap = unWrapType(`arguments[${index}]`, arg.type, false);
  } else if (isEnum(arg.type)) {
    unwrap = `get${arg.type}(arguments[${index}].asString().utf8(runtime).c_str())`;
  } else {
    const name = objectName(arg.type);
    const className = `Jsi${name}`;
    unwrap = `${className}::fromValue(runtime, arguments[${index}])`;
  }
  if (arg.optional) {
    let result = ''
    if (arg.defaultValue) {
      result += `auto default${_.upperFirst(name)} = new wgpu::${arg.type}();
      `;
    } else if (arg.defaultAtomicValue) {
      result += `${arg.type} default${_.upperFirst(name)} = ${arg.defaultAtomicValue};
      `;
    }
    result += `auto ${name} = count > ${index} ? ${unwrap} : default${_(name).upperFirst()};`;
    return result;
  }
  return `auto ${name} = ${unwrap};`;
};

const unwrapArrayMember = (propName: string, arg: Property, index: number) => {
  const type = arg.type.substring(0, arg.type.length - 2);
  const name = `array${index}`;
  const jsiName = `jsi${_.upperFirst(name)}`;
  return `auto ${jsiName} = ${propName}.asObject(runtime).asArray(runtime);
auto ${jsiName}Size = static_cast<int>(${jsiName}.size(runtime));
auto ${name} = new std::vector<wgpu::${type}>();
${name}->reserve(${jsiName}Size);
for (int i = 0; i < ${jsiName}Size; i++) {
  auto element = Jsi${type}::fromValue(
    runtime,
    ${jsiName}.getValueAtIndex(runtime, i)
  );
  ${name}->push_back(*element); 
}

`;
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

const argList = (args: Arg[]) => args.map(arg => arg.baseType ? `base${_.upperFirst(arg.name)}`:  (isAtomicType(arg.type) || arg.type.endsWith("[]")) ? `${arg.name}` : `*${arg.name}`).join(", ");

const baseType = (arg: Arg) => {
  return `
auto ${arg.name}Next = *moduleDescriptor;
wgpu::${arg.baseType} base${_.upperFirst(arg.name)};
base${_.upperFirst(arg.name)}.nextInChain = &${arg.name}Next.chain;`
};

const generatorMethod = (method: Method) => {
  const args = method.args;
  const returns = method.returns;
  if (method.implementation) {
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${method.implementation}
  }
`;
  }
  const decl = method.member ? `JSI_PROPERTY_GET(${_.camelCase(method.member)})` : `JSI_HOST_FUNCTION(${_.camelCase(method.name)})`;
  return `${decl} {
    ${args.map((arg, index) => {
      return generateArg(index, arg);
    }).join("\n    ")}
    ${
      args.filter(arg => arg.baseType).map(arg => baseType(arg))
    }
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

const unpackProperties = (name: string, properties: Property[], defaultProperties: string) => {
  return `auto object = new wgpu::${name}();
object->setDefault();
${defaultProperties}
${properties.map((property, index) => {
  const propName = _.camelCase(property.name);
  const isArray = property.type.endsWith("[]");
  return `if(obj.hasProperty(runtime, "${property.name}")) {
    auto ${propName} = obj.getProperty(runtime, "${property.name}");
  ${isArray ? unwrapArrayMember(propName, property, index) : ''}
  ${isArray ? `object->${makeSingular(propName)}Count = jsiArray${index}Size;` : ``}
  object->${propName} = ${isArray ? `array${index}->data()` : unWrapType(propName, property.type, !!property.pointer)};
}${property.optional ? `` : ` else { throw jsi::JSError(runtime, "Missing mandatory prop ${property.name} in ${name}"); }`}`;
}).join(`
`)}
return object;`;
}

const unpackArray = (name: string, size: number) => {
  return `if (obj.isArray(runtime)) {
auto jsiArray = obj.asArray(runtime);
std::vector<double> array;
for (int i = 0; i < jsiArray.size(runtime); i++) {
  array.push_back(jsiArray.getValueAtIndex(runtime, i).asNumber());
}
auto data = array.data();
auto object = new wgpu::${name}(wgpu::${name}{${new Array(size).fill(0).map((_, i) => `data[${i}]`)}});
return object;
  }`;
};

export const generateObject = (object: JSIObject) => {
  const className = `Jsi${object.name}`;
  const objectName = `wgpu::${object.host ? object.host : object.name}`;
  const methods = object.methods ?? [];
  const memberMethods = methods.filter(m => !!m.member);
  const nonMemberMethods = methods.filter(m => !m.member)
  return `#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "RNSkLog.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"
#include "JsiEnums.h"
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

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  ${memberMethods.length === 0 ? `EXPORT_JSI_API_BRANDNAME(${className}, ${object.name})` : ""}
  
  ${memberMethods.length > 0 ? `  JSI_EXPORT_PROPERTY_GETTERS(${memberMethods.map(m => `JSI_EXPORT_PROP_GET(${className}, ${m.member})`)})` : ""}

  ${nonMemberMethods.length > 0 ? `JSI_EXPORT_FUNCTIONS(
    ${nonMemberMethods.filter(m => !m.member).map(method => `JSI_EXPORT_FUNC(${className}, ${_.camelCase(method.name)})`).join(",\n    ")}
  )` : ''}

  /**
   * Returns the underlying object from a host object of this type
   */
  static ${objectName}* fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<${className}>(runtime)->getObject().get();
    } else {
    ${object.properties ? `${object.iterable ? unpackArray(object.name, parseInt(object.iterable, 10)) : ''}${unpackProperties(object.name, object.properties, object.defaultProperties ?? "")}` : `throw jsi::JSError(
      runtime,
      "Expected a ${className} object, but got a " + raw.toString(runtime).utf8(runtime));`}
    }
  }
};
} // namespace RNSkia
`;
};