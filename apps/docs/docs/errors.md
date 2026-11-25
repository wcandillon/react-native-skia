---
id: errors
title: Errors
sidebar_label: Errors
slug: /errors
---

React Native Skia reports failures the way WebGPU does: a call that fails throws an error with a name, a promise that fails rejects with one, and `null` is only ever a result, never a failure.

## The rules

| Situation | Outcome |
| --- | --- |
| A wrong argument type, a missing argument | Throws a `TypeError` |
| Data that cannot be decoded, parsed or compiled | Throws a `SkiaDecodeError` or an `SkSLCompilationError` |
| A GPU or CPU allocation that fails | Throws a `SkiaOutOfMemoryError` or a `SkiaValidationError` |
| No GPU on the device | Throws a `SkiaGPUUnavailableError` (see [`Skia.gpu`](/docs/webgpu#the-gpu-device)) |
| A valid call without a result (a path operation with an empty outcome, the end of an iteration) | Returns `null` |
| Asynchronous work that fails | Rejects with a named error |
| An API the platform does not have | Throws an error named `NotSupportedError` |

## Error classes

Every error React Native Skia raises extends `SkiaError`, which extends `Error`.

| Class | Raised when | Extra field |
| --- | --- | --- |
| `SkiaDecodeError` | Bytes or text cannot be decoded: an image, an SVG, a font, a Lottie file, a picture, an SVG path string. | `format`: what was being decoded. |
| `SkSLCompilationError` | A shader fails to compile. | `messages`: the diagnostics, each with `type`, `message`, `lineNum` and `linePos`, like WebGPU's `GPUCompilationMessage`. |
| `SkiaValidationError` | A call is invalid in a way the types cannot catch: a surface of size zero, pixel data shorter than its image info. | |
| `SkiaOutOfMemoryError` | An allocation fails. | |
| `SkiaGPUUnavailableError` | The device has no GPU Skia can render with. The message is `Skia.gpu.error`. | |
| `SkiaInternalError` | Skia or the graphics driver fails on its own. | |

Three more names follow the `DOMException` names WebGPU uses, as plain `SkiaError`s: `NotSupportedError`, `AbortError` and `NotFoundError`.

## Handling errors

```tsx
import { Skia, SkSLCompilationError } from "react-native-skia";

try {
  const effect = Skia.RuntimeEffect.Make(source);
} catch (e) {
  if (e instanceof SkSLCompilationError) {
    for (const { lineNum, linePos, message } of e.messages) {
      console.log(`${lineNum}:${linePos} ${message}`);
    }
  }
}
```

`instanceof` holds on the React Native runtime (and on the web). A worklet runtime receives errors that keep their `name`, message and extra field, but not their class. In code that may run in a worklet, check the name, or use `isSkiaError`:

```tsx
import { isSkiaError } from "react-native-skia";

const onError = (e: unknown) => {
  "worklet";
  if (isSkiaError(e, "AbortError")) {
    // The GPU device was lost while the work was pending.
  }
};
```
