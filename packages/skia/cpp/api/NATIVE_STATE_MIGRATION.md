# Migrating JSI bindings from `HostObject` to `NativeState`

This document describes the repeatable pattern for migrating the Skia C++
bindings in `cpp/api` from the deprecated `jsi::HostObject` API (`JsiHostObject`
/ `JsiSkWrapping*HostObject`) to the JSI **NativeState** pattern already used by
the WebGPU bindings in `cpp/rnwgpu`.

The proof-of-concept migration covers **`JsiSkContourMeasure`** and
**`JsiSkContourMeasureIter`** (`cpp/api/JsiSkContourMeasure.h`,
`cpp/api/JsiSkContourMeasureIter.h`). They were chosen because the pair is fully
self-contained: zero external `::fromValue()` call sites, not consumed by the
native view, and not shared across runtimes — so it exercises the whole pattern
(factory → object, methods, getters, `dispose`, memory pressure, typed
conversion) without rippling into the rest of the codebase.

> Design decision: we **reuse `rnwgpu::NativeObject<T>` and `rnwgpu::JSIConverter`
> as-is** (no new Skia-specific base class), extending `JSIConverter` with Skia
> type support only where a migrated method's signature needs it.

---

## The two patterns side by side

### Before — `HostObject`

```cpp
class JsiSkFoo : public JsiSkWrappingSkPtrHostObject<SkFoo> {
public:
  JsiSkFoo(std::shared_ptr<RNSkPlatformContext> ctx, sk_sp<SkFoo> o)
      : JsiSkWrappingSkPtrHostObject(std::move(ctx), std::move(o)) {}

  JSI_HOST_FUNCTION(bar) { /* uses getObject(), getContext() */ }

  EXPORT_JSI_API_TYPENAME(JsiSkFoo, Foo)                 // -> __typename__
  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkFoo, bar),
                       JSI_EXPORT_FUNC(JsiSkFoo, dispose))
  size_t getMemoryPressure() const override { ... }
  std::string getObjectType() const override { return "JsiSkFoo"; }
};

// creation site
return JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(rt, instance, ctx);
```

### After — `NativeState`

```cpp
#include "jsi2/NativeObject.h"

class JsiSkFoo : public rnwgpu::NativeObject<JsiSkFoo> {
public:
  static constexpr const char *CLASS_NAME = "Foo"; // toStringTag / ctor name

  JsiSkFoo(std::shared_ptr<RNSkPlatformContext> ctx, sk_sp<SkFoo> o)
      : rnwgpu::NativeObject<JsiSkFoo>(CLASS_NAME),
        _context(std::move(ctx)), _object(std::move(o)) {}

  JSI_HOST_FUNCTION(bar) { /* unchanged body, uses getObject()/getContext() */ }

  std::string getTypename() { return CLASS_NAME; }       // -> __typename__
  size_t getMemoryPressure() override { ... }            // note: NOT const

  static void definePrototype(jsi::Runtime &rt, jsi::Object &proto) {
    installGetter(rt, proto, "__typename__", &JsiSkFoo::getTypename);
    installMethod(rt, proto, "bar", &JsiSkFoo::bar);
    // dispose installed as a raw host function (needs `thisValue`) — see below
  }

protected:
  sk_sp<SkFoo> getObject() const { /* throw if disposed */ return _object; }
  std::shared_ptr<RNSkPlatformContext> getContext() const { return _context; }

private:
  std::shared_ptr<RNSkPlatformContext> _context;
  sk_sp<SkFoo> _object;
  std::atomic<bool> _disposed = {false};
};

// creation site
return JsiSkFoo::create(rt, instance);   // installs prototype + native state
```

---

## Step-by-step recipe

1. **Include + base class.** Add `#include "jsi2/NativeObject.h"` and change the
   base to `rnwgpu::NativeObject<JsiSkX>`. Add
   `static constexpr const char *CLASS_NAME = "<JsTypeName>";`.

2. **Hold the wrapped data yourself.** The `JsiSkWrapping*` base classes are
   gone, so store `_context`, the wrapped object (`sk_sp<>` /
   `std::shared_ptr<>`), and a `std::atomic<bool> _disposed`. Re-add the small
   `getObject()` (throws if disposed) / `getContext()` accessors the method
   bodies rely on, so **method bodies do not need to change**.

3. **Keep method bodies, install them on the prototype.** Replace
   `JSI_EXPORT_FUNCTIONS(...)` with a `static void definePrototype(jsi::Runtime&,
   jsi::Object&)` that calls `installMethod(rt, proto, "name", &JsiSkX::name)`
   for each method.
   - A method returning `jsi::Value` (i.e. anything declared with
     `JSI_HOST_FUNCTION`) keeps **full control** of its arguments. `NativeObject`
     forwards `arguments`/`count` and passes an **undefined `thisValue`**.
   - Prefer **typed methods** where practical (e.g. `double length()` instead of
     a `jsi::Value` host function). Arguments and the return value are then
     converted automatically by `JSIConverter`. Returning a
     `std::shared_ptr<JsiSkY>` (another migrated type) auto-wraps it via
     `JsiSkY::create()`; wrap nullable results in `std::optional<...>`.

4. **`__typename__`.** Replace `EXPORT_JSI_API_TYPENAME` with a
   `std::string getTypename() { return CLASS_NAME; }` getter installed via
   `installGetter(rt, proto, "__typename__", ...)`. The JS-side `SkJSIInstance<T>`
   type guards (`obj.__typename__ === "X"`) depend on this exact string.

5. **`dispose()`.** The old base provided `dispose`. Install it as a **raw host
   function** (not `installMethod`) because it needs `thisValue` to lower the
   reported memory pressure:

   ```cpp
   proto.setProperty(rt, "dispose",
     jsi::Function::createFromHostFunction(rt,
       jsi::PropNameID::forUtf8(rt, "dispose"), 0,
       [](jsi::Runtime &rt, const jsi::Value &thisValue,
          const jsi::Value *, size_t) -> jsi::Value {
         auto self = JsiSkX::fromValue(rt, thisValue);
         self->release();                              // your dispose impl
         if (thisValue.isObject())
           thisValue.getObject(rt).setExternalMemoryPressure(
               rt, rnwgpu::kMinMemoryPressure);
         return jsi::Value::undefined();
       }));
   ```

6. **Memory pressure.** Override `size_t getMemoryPressure()` — **drop the
   `const`**, the base virtual is non-const. Remove `getObjectType()` (no longer
   part of the contract).

7. **Creation sites.** Replace every
   `JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(rt, instance, ctx)` for this type
   with `JsiSkX::create(rt, instance)`. `create()` lazily installs the prototype
   per-runtime, attaches the native state, sets the prototype chain and the
   memory-pressure hint. Factory `createCtor(...)` helpers keep the same
   `jsi::HostFunctionType` signature, so `JsiSkApi` wiring is unchanged.

8. **Consumers / `::fromValue()`.** `NativeObject::fromValue(rt, value)` returns
   `std::shared_ptr<JsiSkX>` (the wrapper), **not** the underlying `sk_sp<SkX>`
   that the old `JsiSkWrapping*::fromValue` returned. Update call sites to
   `JsiSkX::fromValue(rt, v)->getObject()`. (None existed for the PoC pair.)

---

## Extending `JSIConverter` with Skia types

`JSIConverter` already handles any `std::shared_ptr<T>` where `T` derives from
`jsi::NativeState` (every `NativeObject` does): `toJSI` calls `T::create()` and
`fromJSI` reads the native state. So **a migrated wrapper passed by
`shared_ptr` needs no new converter** — this is what makes
`JsiSkContourMeasureIter::next()` able to simply
`return std::make_shared<JsiSkContourMeasure>(...)`.

When a *typed* method needs to accept/return a raw Skia smart pointer
(`sk_sp<SkX>`) rather than the wrapper, add a converter that bridges the two.
Keep these Skia-specific specializations out of `cpp/jsi2` (which must stay
WebGPU/Graphite-neutral) — declare them in a Skia header included before use:

```cpp
namespace rnwgpu {
template <> struct JSIConverter<sk_sp<SkX>> {
  static sk_sp<SkX> fromJSI(jsi::Runtime &rt, const jsi::Value &v, bool) {
    return RNSkia::JsiSkX::fromValue(rt, v)->getObject();
  }
  static jsi::Value toJSI(jsi::Runtime &rt, sk_sp<SkX> o) {
    return RNSkia::JsiSkX::create(
        rt, std::make_shared<RNSkia::JsiSkX>(/* context */, std::move(o)));
  }
};
} // namespace rnwgpu
```

(`toJSI` needs a platform context; in practice expose the wrapper
`shared_ptr<JsiSkX>` from the method instead, which already works.)

---

## Build / packaging notes (verify on a real build)

- `cpp/jsi2` and `cpp/rnwgpu` are compiled **only under `SK_GRAPHITE`**, but the
  headers are **always reachable**: `../cpp/jsi2` is on the include path
  unconditionally on Android (`android/CMakeLists.txt`) and iOS
  (`HEADER_SEARCH_PATHS` in `react-native-skia.podspec` points at the source
  tree). `EnumMapper.h` and `Promise.h` are dependency-free (`<jsi/jsi.h>` + std)
  and the only `Promise` *symbol* usage in `JSIConverter.h` is guarded by
  `#ifdef SK_GRAPHITE`, so including `NativeObject.h` from always-compiled core
  code does not pull in any Graphite/WebGPU symbol or require linking
  `Promise.cpp`.
- On iOS non-Graphite builds the podspec lists `cpp/jsi2/**` in
  `exclude_files`. That stops those files from being *compiled on their own*; it
  does **not** remove them from disk, and `#include` still resolves through
  `HEADER_SEARCH_PATHS`. **This is the main thing to confirm on a real iOS
  non-Graphite build.**

## Caveats to plan for in the wider rollout

- **Reanimated / Worklets.** `NativeState` objects are *not* directly shareable
  across runtimes the way `HostObject`s are. Types that are read inside worklets
  (e.g. `SkPicture`, `SkImage`, `SkPaint`, shaders) need the box/unbox bridge
  (`BoxedWebGPUObject` in `cpp/jsi2/NativeObject.h`) before migration. The PoC
  pair is never shared to a worklet, so it sidesteps this.
- **Native view consumption.** Code that pulls the wrapped object out of a JS
  value via `dynamic_pointer_cast<JsiSkX>(asHostObject(...))` (e.g.
  `cpp/jsi/ViewProperty.h` for `JsiSkPicture`) must switch to
  `value.getObject(rt).getNativeState<JsiSkX>(rt)`.
- **In-place updates.** Places that mutate the wrapped object via `setObject()`
  (e.g. the recorder's `play()` reusing a `JsiSkPicture`) must keep a setter on
  the migrated class and mutate the member behind the native state.

## Suggested migration order

1. Leaf value/result objects with no `fromValue` consumers (like this PoC).
2. Leaf objects with a few consumers (`JsiSkData`, `JsiSkRSXform`, …) — update
   their `::fromValue()` call sites to `->getObject()`.
3. Objects shared to worklets / consumed by the view (`JsiSkPicture`,
   `JsiSkImage`, `JsiSkPaint`, shaders, filters) — add box/unbox and update
   `ViewProperty` / recorder first.
4. High-fan-out value types (`JsiSkRect` 60 callers, `JsiSkPoint`, `JsiSkColor`)
   last, since every consumer changes.
