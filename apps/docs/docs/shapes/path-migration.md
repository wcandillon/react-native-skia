---
id: path-migration
title: Path API Migration Guide
sidebar_label: Migration Guide
slug: /shapes/path-migration
---

This guide helps you migrate from the mutable Path API to the new immutable Path API with `PathBuilder`.

## Why the Change?

The new API aligns with Skia's native direction toward immutable paths:
- **Immutable `SkPath`**: Paths are now immutable with query methods only
- **Mutable `SkPathBuilder`**: Use `PathBuilder` for path construction, then call `.build()` to get an immutable path
- **Static factories**: Common shapes can be created directly via `Skia.Path.Circle()`, `Skia.Path.Rect()`, etc.
- **Static operations**: Path operations like `Stroke()`, `Trim()`, `Simplify()` are now static methods on `Skia.Path`

## Basic Migration

### Before (Mutable API)

```tsx
// Building a path
const path = Skia.Path.Make();
path.moveTo(0, 0);
path.lineTo(100, 100);
path.close();

// Adding shapes
const circle = Skia.Path.Make();
circle.addCircle(50, 50, 25);

// Transforming (mutated in place)
path.transform(matrix);

// Operations (mutated in place)
path.stroke({ width: 2 });
path.simplify();
```

### After (Immutable API)

```tsx
// Building a path with PathBuilder
const path = Skia.PathBuilder.Make()
  .moveTo(0, 0)
  .lineTo(100, 100)
  .close()
  .build();

// Adding shapes - use static factories
const circle = Skia.Path.Circle(50, 50, 25);

// Transforming - returns new path
const transformed = path.transform(matrix);

// Operations - use static methods
const stroked = Skia.Path.Stroke(path, { width: 2 });
const simplified = Skia.Path.Simplify(path);
```

## Static Factory Methods

Instead of creating an empty path and calling `add*` methods, use static factories:

| Old API | New API |
|---------|---------|
| `path.addCircle(x, y, r)` | `Skia.Path.Circle(x, y, r)` |
| `path.addRect(rect)` | `Skia.Path.Rect(rect)` |
| `path.addOval(rect)` | `Skia.Path.Oval(rect)` |
| `path.addRRect(rrect)` | `Skia.Path.RRect(rrect)` |
| `path.moveTo()/lineTo()` | `Skia.Path.Line(p1, p2)` |
| Multiple `path.lineTo()` | `Skia.Path.Polygon(points, close)` |

## Static Path Operations

Operations that previously mutated the path are now static methods returning new paths:

| Old API | New API |
|---------|---------|
| `path.stroke(opts)` | `Skia.Path.Stroke(path, opts)` |
| `path.trim(start, end)` | `Skia.Path.Trim(path, start, end, false)` |
| `path.simplify()` | `Skia.Path.Simplify(path)` |
| `path.dash(on, off, phase)` | `Skia.Path.Dash(path, on, off, phase)` |
| `path.makeAsWinding()` | `Skia.Path.AsWinding(path)` |
| `path1.interpolate(path2, t)` | `Skia.Path.Interpolate(path1, path2, t)` |

Note: Static operations may return `null` if the operation fails. Handle this appropriately:

```tsx
const stroked = Skia.Path.Stroke(path, { width: 2 });
if (stroked) {
  // use stroked path
}
// Or with fallback
const result = Skia.Path.Stroke(path, { width: 2 }) ?? path;
```

## Transform and Offset

These methods now return new paths instead of mutating:

```tsx
// Before
path.transform(matrix);  // mutated path
path.offset(dx, dy);     // mutated path

// After
const transformed = path.transform(matrix);  // new path
const offsetPath = path.offset(dx, dy);      // new path
```

## Using PathBuilder

When you need to build complex paths programmatically:

```tsx
const builder = Skia.PathBuilder.Make();
builder.moveTo(0, 0);
builder.lineTo(100, 0);
builder.quadTo(150, 50, 100, 100);
builder.cubicTo(50, 150, 0, 100, 0, 50);
builder.close();

// Get the immutable path
const path = builder.build();
```

`PathBuilder` supports method chaining:

```tsx
const path = Skia.PathBuilder.Make()
  .moveTo(0, 0)
  .lineTo(100, 100)
  .arcTo(50, 50, 0, true, true, 100, 0)
  .close()
  .build();
```

## Combining Paths

To combine an existing path with new elements:

```tsx
const basePath = Skia.Path.MakeFromSVGString("M10 10 L90 90");
const combined = Skia.PathBuilder.MakeFromPath(basePath)
  .lineTo(90, 10)
  .close()
  .build();
```

## Animations with usePathValue

The `usePathValue` hook now takes an optional transform function:

```tsx
// Before
const clip = usePathValue((path) => {
  "worklet";
  path.transform(matrix.value);
}, initialPath);

// After
const clip = usePathValue(
  () => {
    "worklet";
    // Build operations go here
  },
  initialPath,
  (path) => {
    "worklet";
    // Post-build transform
    return path.transform(matrix.value);
  }
);
```

## Dynamic Path Building in Worklets

When building paths dynamically in worklets (e.g., gesture handlers), use `PathBuilder` as a shared value:

```tsx
const pathBuilder = useSharedValue(Skia.PathBuilder.Make());

const gesture = Gesture.Pan()
  .onStart((e) => {
    pathBuilder.value.reset();
    pathBuilder.value.moveTo(e.x, e.y);
  })
  .onChange((e) => {
    pathBuilder.value.lineTo(e.x, e.y);
  });

// Convert to path for rendering
const path = useDerivedValue(() => {
  return pathBuilder.value.build();
});
```

## Quick Reference

### PathBuilder Methods

Construction:
- `moveTo(x, y)`, `lineTo(x, y)`, `quadTo(...)`, `cubicTo(...)`, `conicTo(...)`
- `rMoveTo(...)`, `rLineTo(...)`, `rQuadTo(...)`, `rCubicTo(...)`, `rConicTo(...)`
- `arcTo(...)`, `arcToOval(...)`, `arcToRotated(...)`
- `addRect(...)`, `addOval(...)`, `addCircle(...)`, `addRRect(...)`, `addArc(...)`, `addPath(...)`
- `close()`, `reset()`
- `setFillType(...)`, `setIsVolatile(...)`
- `build()` → returns immutable `SkPath`

### SkPath Static Methods

Factories:
- `Skia.Path.Circle(x, y, r)`
- `Skia.Path.Rect(rect)`
- `Skia.Path.Oval(rect)`
- `Skia.Path.RRect(rrect)`
- `Skia.Path.Line(p1, p2)`
- `Skia.Path.Polygon(points, close)`

Operations:
- `Skia.Path.Stroke(path, opts)` → `SkPath | null`
- `Skia.Path.Trim(path, start, end, complement)` → `SkPath | null`
- `Skia.Path.Simplify(path)` → `SkPath | null`
- `Skia.Path.Dash(path, on, off, phase)` → `SkPath | null`
- `Skia.Path.AsWinding(path)` → `SkPath | null`
- `Skia.Path.Interpolate(start, end, weight)` → `SkPath | null`

### SkPath Instance Methods (Immutable)

Query:
- `getBounds()`, `computeTightBounds()`, `contains(x, y)`
- `getFillType()`, `isVolatile()`, `isEmpty()`
- `countPoints()`, `getPoint(index)`, `getLastPt()`
- `toSVGString()`, `toCmds()`, `equals(other)`, `copy()`
- `isInterpolatable(other)`

Transform (returns new path):
- `transform(matrix)` → `SkPath`
- `offset(dx, dy)` → `SkPath`
