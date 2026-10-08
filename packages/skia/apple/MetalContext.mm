#include "MetalContext.h"

#include "RNSkLog.h"

#import <MetalKit/MetalKit.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <include/gpu/ganesh/GrBackendSurface.h>
#import <include/gpu/ganesh/SkImageGanesh.h>
#import <include/gpu/ganesh/mtl/GrMtlBackendContext.h>
#import <include/gpu/ganesh/mtl/GrMtlBackendSurface.h>
#import <include/gpu/ganesh/mtl/GrMtlDirectContext.h>
#import <include/gpu/ganesh/mtl/GrMtlTypes.h>
#import <include/gpu/ganesh/mtl/SkSurfaceMetal.h>

#pragma clang diagnostic pop

MetalContext::MetalContext() {
  _device = MTLCreateSystemDefaultDevice();
  if (!_device) {
    throw std::runtime_error("Failed to create Metal device");
  }

  _commandQueue =
      id<MTLCommandQueue>(CFRetain((GrMTLHandle)[_device newCommandQueue]));
  GrMtlBackendContext backendContext = {};
  // retain, not reset: reset adopts a reference that the backend context
  // releases when it goes out of scope, and _device (an ARC strong reference)
  // never gave it one. Each MetalContext destroyed (they are thread_local, so
  // at every thread exit) would release the shared system device once more
  // than it retained it. The queue below is balanced by its CFRetain.
  backendContext.fDevice.retain((__bridge void *)_device);
  backendContext.fQueue.reset((__bridge void *)_commandQueue);
  GrContextOptions grContextOptions; // set different options here.

  // Create the Skia Direct Context
  _directContext = GrDirectContexts::MakeMetal(backendContext, grContextOptions);
  if (_directContext == nullptr) {
    RNSkia::RNSkLogger::logToConsole("Couldn't create a Skia Metal Context");
  }
}
