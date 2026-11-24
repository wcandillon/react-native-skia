# React Native Skia

[![CI](https://github.com/wcandillon/react-native-skia/actions/workflows/ci.yml/badge.svg)](https://github.com/wcandillon/react-native-skia/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-native-skia.svg?style=flat)](https://www.npmjs.com/package/react-native-skia)

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://firebasestorage.googleapis.com/v0/b/start-react-native.appspot.com/o/skia.png?alt=media&token=875765bb-4898-4ffc-a8db-b6b777657373">
    <img alt="React Native Skia Logo" src="https://firebasestorage.googleapis.com/v0/b/start-react-native.appspot.com/o/skia.png?alt=media&token=875765bb-4898-4ffc-a8db-b6b777657373" width="450">
  </picture>
</div>

React Native Skia bring Skia, the rendering engine behind Google Chrome to React Native to React Native.

We use Graphite, Skia’s new GPU backend built on WebGPU (Dawn). It plugs directly into [React Native WebGPU](https://wcandillon.dev/article/hello-graphite-webgpu), so 2D drawings, 3D scenes, and machine learning models share the same GPU device and the same canvas, at zero cost. The result is a unified GPU runtime for React Native.  See [Documentation](https://wcandillon.github.io/react-native-skia/).

React Native Skia has been downloaded more than 60 millions times on NPM. And today, it powers the user-experiences of some of the top apps on the App Store and Google Play, including several that have won awards from Apple, Google, and Expo.

## Platinum Sponsors

<div align="center">
  <a href="https://expo.dev/" target="_blank" rel="sponsored">
    <img width="80" height="80" alt="Expo" src="https://firebasestorage.googleapis.com/v0/b/start-react-native.appspot.com/o/expo.png?alt=media&token=6e688636-6a41-4d6a-b3ad-ec8ae1308b00" />
  </a>
</div>

## Getting Started

```sh
yarn add react-native-skia
```

[Installation instructions](https://wcandillon.github.io/react-native-skia/docs/getting-started/installation/)

## v3 and v2

React Native Skia v3 renders with [Graphite](https://skia.org/docs/user/graphite/), Skia's new GPU backend. It runs on Metal on Apple platforms and on Vulkan on Android.

| | v3 | v2 |
|:--|:--|:--|
| npm | `react-native-skia` | `react-native-skia@2` |
| Skia backend | Graphite (Vulkan/Metal) | Ganesh (OpenGL/Metal) |
| Architecture | multi-threaded | single-threaded |
| Platforms | iOS, Android, macOS, Mac Catalyst, tvOS, Web | iOS, Android, macOS, Mac Catalyst, tvOS, Android TV, Web |
| Branch | [`main`](https://github.com/wcandillon/react-native-skia/tree/main) | [`2.x`](https://github.com/wcandillon/react-native-skia/tree/2.x) |
| Documentation | [wcandillon.github.io/react-native-skia](https://wcandillon.github.io/react-native-skia/) | [wcandillon.github.io/react-native-skia/v2](https://wcandillon.github.io/react-native-skia/v2/) |

v2 is still maintained. To upgrade from v2 or from `@shopify/react-native-skia`, follow the [migration guide](https://wcandillon.github.io/react-native-skia/docs/getting-started/migration).

## WebGPU

Graphite runs on Dawn, Google's WebGPU implementation.
With [React Native WebGPU](https://github.com/wcandillon/react-native-webgpu) installed alongside it, Skia and WebGPU share the same GPU device and can exchange textures without any copy. This also works with three.js.
See the [WebGPU documentation](https://wcandillon.github.io/react-native-skia/docs/webgpu).

## Contributing

For detailed information on library development, building, testing, and contributing guidelines, please see [CONTRIBUTING.md](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md).
