#include "WebGPUTriangle.h"

#include <fbjni/fbjni.h>
#include <jni.h>
#include "RNSkLog.h"

#include "webgpu.h"

WGPUInstance instance;
WGPUDevice device;
WGPURenderPipeline pipeline;

WGPUSwapChain swapChain;
const uint32_t kWidth = 512;
const uint32_t kHeight = 512;

void SetupSwapChain(WGPUSurface surface) {
  WGPUSwapChainDescriptor scDesc{
      .usage = WGPUTextureUsage_RenderAttachment,
      .format = WGPUTextureFormat_BGRA8Unorm,
      .width = kWidth,
      .height = kHeight,
      .presentMode = WGPUPresentMode_Fifo};
  swapChain = wgpuDeviceCreateSwapChain(device, surface, &scDesc);
}



void runTriangleDemo(jobject surface, int width, int height) {
    JNIEnv *env = facebook::jni::Environment::current();
    auto _jSurfaceTexture = env->NewGlobalRef(surface);
    jclass surfaceClass = env->FindClass("android/view/Surface");
    jmethodID surfaceConstructor = env->GetMethodID(
        surfaceClass, "<init>", "(Landroid/graphics/SurfaceTexture;)V");
    // Create a new Surface instance
    jobject jSurface =
        env->NewObject(surfaceClass, surfaceConstructor, _jSurfaceTexture);

    // Acquire the native window from the Surface
    auto _window = ANativeWindow_fromSurface(env, jSurface);
    // Clean up local references
    env->DeleteLocalRef(jSurface);
    env->DeleteLocalRef(surfaceClass);

    // Instance creation
    WGPUSurfaceDescriptorFromAndroidNativeWindow androidSurfaceDesc = {};
    androidSurfaceDesc.chain.sType = WGPUSType_SurfaceDescriptorFromAndroidNativeWindow;
    androidSurfaceDesc.window = reinterpret_cast<void *>(_window);

    // Set up the generic surface descriptor to use the platform-specific one
    WGPUSurfaceDescriptor surfaceDesc = {};
    surfaceDesc.nextInChain = reinterpret_cast<const WGPUChainedStruct*>(&androidSurfaceDesc);

    WGPUSurface s = wgpuInstanceCreateSurface(instance, &surfaceDesc);
    if (s == nullptr) {
        RNSkia::RNSkLogger::logToConsole("FAILED!");
    } else {
        RNSkia::RNSkLogger::logToConsole("SUCCESS!");
    }

}