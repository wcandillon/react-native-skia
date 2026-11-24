// React Native 0.88 no longer ships types for deep imports. The spec keeps
// importing WithDefault from this path: the codegen of React Native 0.79 (our
// floor) matches the bare WithDefault name and can't read the qualified
// CodegenTypes.WithDefault that newer versions export from "react-native".
declare module "react-native/Libraries/Types/CodegenTypes" {
  export type WithDefault<
    Type extends number | boolean | string | ReadonlyArray<string>,
    Value extends Type | string | undefined | null,
  > = Type | undefined | null;
  // SkiaImageViewNativeComponent's prop tells codegen a 64-bit number by this
  // bare name, as the view's spec tells WithDefault.
  export type Double = number;
}
