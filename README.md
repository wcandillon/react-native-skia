# React Native Skia

High-performance 2d Graphics for React Native using Skia

[![CI](https://github.com/wcandillon/react-native-skia/actions/workflows/ci.yml/badge.svg)](https://github.com/wcandillon/react-native-skia/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-native-skia.svg?style=flat)](https://www.npmjs.com/package/react-native-skia)
[![issues](https://img.shields.io/github/issues/wcandillon/react-native-skia.svg?style=flat)](https://github.com/wcandillon/react-native-skia/issues)

<img width="400" alt="skia" src="https://user-images.githubusercontent.com/306134/146549218-b7959ad9-0107-4c1c-b439-b96c780f5230.png">

Checkout the full documentation [here](https://wcandillon.github.io/react-native-skia).

React Native Skia brings the Skia Graphics Library to React Native. Skia serves as the graphics engine for Google Chrome and Chrome OS, Android, Flutter, Mozilla Firefox and Firefox OS, and many other products.

## Getting Started

```sh
yarn add react-native-skia
```

[Installation instructions](https://wcandillon.github.io/react-native-skia/docs/getting-started/installation/)

## v3 and v2

React Native Skia v3 renders with [Graphite](https://skia.org/docs/user/graphite/), Skia's new GPU backend. It runs on Metal on Apple platforms and on Vulkan on Android.

| | v3 | v2 |
|:--|:--|:--|
| npm | `react-native-skia` | `react-native-skia@2` (`@shopify/react-native-skia` up to 2.14) |
| Skia backend | Graphite | Ganesh |
| Platforms | iOS, Android (API level 26 and above), macOS, Web | iOS, Android, macOS, Mac Catalyst, tvOS, Android TV, Web |
| Branch | [`main`](https://github.com/wcandillon/react-native-skia/tree/main) | [`2.x`](https://github.com/wcandillon/react-native-skia/tree/2.x) |
| Documentation | [wcandillon.github.io/react-native-skia](https://wcandillon.github.io/react-native-skia/) | [wcandillon.github.io/react-native-skia/v2](https://wcandillon.github.io/react-native-skia/v2/) |

v2 is still maintained. To upgrade from v2 or from `@shopify/react-native-skia`, follow the [migration guide](https://wcandillon.github.io/react-native-skia/docs/getting-started/migration).

## WebGPU

Graphite runs on Dawn, Google's WebGPU implementation.
With [React Native WebGPU](https://github.com/wcandillon/react-native-webgpu) installed alongside it, Skia and WebGPU share the same GPU device and can exchange textures without any copy. This also works with three.js.
See the [WebGPU documentation](https://wcandillon.github.io/react-native-skia/docs/webgpu).

## Contributing

For detailed information on library development, building, testing, and contributing guidelines, please see [CONTRIBUTING.md](packages/skia/CONTRIBUTING.md).
