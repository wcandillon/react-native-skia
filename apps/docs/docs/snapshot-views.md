---
id: snapshotviews
title: Snapshot Views
sidebar_label: Snapshot Views
slug: /snapshotviews
displayed_sidebar: tutorialSidebar
---

`makeImageFromView()` was removed in React Native Skia v3.
View snapshots are taken by [React Native WebGPU](https://wcandillon.github.io/react-native-webgpu/api/draw-element-image-to-texture), which draws any React Native view into a texture with `queue.drawElementImageToTexture()`; `Skia.Image.MakeImageFromGPUTexture()` then wraps that texture into a Skia image, without any copy.

See [View snapshots](/docs/webgpu#view-snapshots) for a complete example, and the [migration guide](/docs/getting-started/migration#4-replace-the-removed-apis) for the other APIs that moved to React Native WebGPU.
