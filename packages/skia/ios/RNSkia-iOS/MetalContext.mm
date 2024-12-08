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
  auto device = MetalSharedContext::getInstance().getDevice();
  _commandQueue =
      id<MTLCommandQueue>(CFRetain((GrMTLHandle)[device newCommandQueue]));
  GrMtlBackendContext backendContext = {};
  backendContext.fDevice.reset((__bridge void *)device);
  backendContext.fQueue.reset((__bridge void *)_commandQueue);
  GrContextOptions grContextOptions; // set different options here.

  // Create the Skia Direct Context
  _directContext = GrDirectContexts::MakeMetal(backendContext);
  if (_directContext == nullptr) {
    RNSkia::RNSkLogger::logToConsole("Couldn't create a Skia Metal Context");
  }
}
