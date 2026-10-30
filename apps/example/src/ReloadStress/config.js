/**
 * Flip to `true` to boot the app in the runtime-reload stress mode used to
 * reproduce https://github.com/Shopify/react-native-skia/issues/4003
 * (Android SIGSEGV in RNSkManager::installBindings / `Skia` undefined after
 * a JS runtime reload). See src/ReloadStress/README.md.
 */
export const RELOAD_STRESS_TEST = false;
