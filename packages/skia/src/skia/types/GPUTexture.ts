/**
 * A WebGPU texture, as accepted by `Skia.Image.MakeImageFromGPUTexture` and
 * `Skia.Surface.MakeFromGPUTexture`: a `GPUTexture` created with React Native
 * WebGPU on the shared device, whose `nativePointer` (a non-spec extension)
 * holds the `WGPUTexture` handle. The handle itself, as a `BigInt`, is
 * accepted too for libraries that export textures without React Native
 * WebGPU.
 */
export type GPUTextureHandle = { readonly nativePointer: bigint } | bigint;
