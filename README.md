# React Native Skia

High-performance 2d Graphics for React Native using Skia

[![Tests](https://github.com/Shopify/react-native-skia/actions/workflows/tests.yml/badge.svg)](https://github.com/Shopify/react-native-skia/actions/workflows/tests.yml)
[![npm version](https://img.shields.io/npm/v/@shopify/react-native-skia.svg?style=flat)](https://www.npmjs.com/package/@shopify/react-native-skia)
[![issues](https://img.shields.io/github/issues/shopify/react-native-skia.svg?style=flat)](https://github.com/shopify/react-native-skia/issues)

<img width="400" alt="skia" src="https://user-images.githubusercontent.com/306134/146549218-b7959ad9-0107-4c1c-b439-b96c780f5230.png">

Checkout the full documentation [here](https://shopify.github.io/react-native-skia).

React Native Skia brings the Skia Graphics Library to React Native. Skia serves as the graphics engine for Google Chrome and Chrome OS, Android, Flutter, Mozilla Firefox and Firefox OS, and many other products.

_This is an alpha release. Use with caution._

## Getting Started

```sh
npm install @shopify/react-native-skia
```

Documentation is available at [https://shopify.github.io/react-native-skia](https://shopify.github.io/react-native-skia/docs/getting-started/installation/).

## Library Development

To develop react-native-skia, you need to build the skia libraries on your computer.

Make sure to check out the sub modules:

`git submodule update --init --recursive`

You also need to install some tools for the build scripts to work. Run `yarn` in the root of the project to install them.

Make sure you have all the tools required for building the skia libraries (XCode, Ninja, CMake, Android NDK / build tools).

On MacOS you can install Ninja via homebrew:

```sh
brew install ninja
```

If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk/<version>` for instance.

If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_.

And then the _SDK Location_ section. It will show you the NDK path, or the option to Download it if you don't have it installed.

### Building

- Install dependencies `yarn bootstrap`
- Build the Skia libraries with `yarn build-skia` (this can take a while)
- Copy Skia headers `yarn copy-skia-headers`
- Run `pod install` in the example project

### Upgrading

If a new version of Skia is included in an upgrade of this library, you need to perform a few extra steps before continuing:

1. Update submodules: `git submodule update --recursive`
2. Copy Skia Headers: `yarn copy-skia-headers`
3. Clean Skia: `yarn clean-skia`
4. Build Skia: `yarn build-skia`
5. Run pod install in the example project

### Publishing

- Run the commands in the [Building](#building) section
- Build the Android binaries with `yarn build-android`
- Build the NPM package with `yarn build-npm`

Publish the NPM package manually. The output is found in the `dist` folder.

- Install Cocoapods in the example/ios folder `cd example/ios && pod install && cd ..`
