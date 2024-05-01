
#include <utility>

#include "dawn/webgpu_cpp.h"

#if defined(__GNUC__) || defined(__clang__)
// error: 'offsetof' within non-standard-layout type 'wgpu::XXX' is
// conditionally-supported
#pragma GCC diagnostic ignored "-Winvalid-offsetof"
#endif

namespace wgpu {

// WGSLFeatureName

static_assert(sizeof(WGSLFeatureName) == sizeof(WGPUWGSLFeatureName),
              "sizeof mismatch for WGSLFeatureName");
static_assert(alignof(WGSLFeatureName) == alignof(WGPUWGSLFeatureName),
              "alignof mismatch for WGSLFeatureName");

static_assert(static_cast<uint32_t>(WGSLFeatureName::Undefined) ==
                  WGPUWGSLFeatureName_Undefined,
              "value mismatch for WGSLFeatureName::Undefined");
static_assert(
    static_cast<uint32_t>(
        WGSLFeatureName::ReadonlyAndReadwriteStorageTextures) ==
        WGPUWGSLFeatureName_ReadonlyAndReadwriteStorageTextures,
    "value mismatch for WGSLFeatureName::ReadonlyAndReadwriteStorageTextures");
static_assert(
    static_cast<uint32_t>(WGSLFeatureName::Packed4x8IntegerDotProduct) ==
        WGPUWGSLFeatureName_Packed4x8IntegerDotProduct,
    "value mismatch for WGSLFeatureName::Packed4x8IntegerDotProduct");
static_assert(
    static_cast<uint32_t>(WGSLFeatureName::UnrestrictedPointerParameters) ==
        WGPUWGSLFeatureName_UnrestrictedPointerParameters,
    "value mismatch for WGSLFeatureName::UnrestrictedPointerParameters");
static_assert(static_cast<uint32_t>(WGSLFeatureName::PointerCompositeAccess) ==
                  WGPUWGSLFeatureName_PointerCompositeAccess,
              "value mismatch for WGSLFeatureName::PointerCompositeAccess");
static_assert(
    static_cast<uint32_t>(WGSLFeatureName::ChromiumTestingUnimplemented) ==
        WGPUWGSLFeatureName_ChromiumTestingUnimplemented,
    "value mismatch for WGSLFeatureName::ChromiumTestingUnimplemented");
static_assert(
    static_cast<uint32_t>(WGSLFeatureName::ChromiumTestingUnsafeExperimental) ==
        WGPUWGSLFeatureName_ChromiumTestingUnsafeExperimental,
    "value mismatch for WGSLFeatureName::ChromiumTestingUnsafeExperimental");
static_assert(
    static_cast<uint32_t>(WGSLFeatureName::ChromiumTestingExperimental) ==
        WGPUWGSLFeatureName_ChromiumTestingExperimental,
    "value mismatch for WGSLFeatureName::ChromiumTestingExperimental");
static_assert(
    static_cast<uint32_t>(
        WGSLFeatureName::ChromiumTestingShippedWithKillswitch) ==
        WGPUWGSLFeatureName_ChromiumTestingShippedWithKillswitch,
    "value mismatch for WGSLFeatureName::ChromiumTestingShippedWithKillswitch");
static_assert(static_cast<uint32_t>(WGSLFeatureName::ChromiumTestingShipped) ==
                  WGPUWGSLFeatureName_ChromiumTestingShipped,
              "value mismatch for WGSLFeatureName::ChromiumTestingShipped");

// AdapterType

static_assert(sizeof(AdapterType) == sizeof(WGPUAdapterType),
              "sizeof mismatch for AdapterType");
static_assert(alignof(AdapterType) == alignof(WGPUAdapterType),
              "alignof mismatch for AdapterType");

static_assert(static_cast<uint32_t>(AdapterType::DiscreteGPU) ==
                  WGPUAdapterType_DiscreteGPU,
              "value mismatch for AdapterType::DiscreteGPU");
static_assert(static_cast<uint32_t>(AdapterType::IntegratedGPU) ==
                  WGPUAdapterType_IntegratedGPU,
              "value mismatch for AdapterType::IntegratedGPU");
static_assert(static_cast<uint32_t>(AdapterType::CPU) == WGPUAdapterType_CPU,
              "value mismatch for AdapterType::CPU");
static_assert(static_cast<uint32_t>(AdapterType::Unknown) ==
                  WGPUAdapterType_Unknown,
              "value mismatch for AdapterType::Unknown");

// AddressMode

static_assert(sizeof(AddressMode) == sizeof(WGPUAddressMode),
              "sizeof mismatch for AddressMode");
static_assert(alignof(AddressMode) == alignof(WGPUAddressMode),
              "alignof mismatch for AddressMode");

static_assert(static_cast<uint32_t>(AddressMode::Undefined) ==
                  WGPUAddressMode_Undefined,
              "value mismatch for AddressMode::Undefined");
static_assert(static_cast<uint32_t>(AddressMode::ClampToEdge) ==
                  WGPUAddressMode_ClampToEdge,
              "value mismatch for AddressMode::ClampToEdge");
static_assert(static_cast<uint32_t>(AddressMode::Repeat) ==
                  WGPUAddressMode_Repeat,
              "value mismatch for AddressMode::Repeat");
static_assert(static_cast<uint32_t>(AddressMode::MirrorRepeat) ==
                  WGPUAddressMode_MirrorRepeat,
              "value mismatch for AddressMode::MirrorRepeat");

// AlphaMode

static_assert(sizeof(AlphaMode) == sizeof(WGPUAlphaMode),
              "sizeof mismatch for AlphaMode");
static_assert(alignof(AlphaMode) == alignof(WGPUAlphaMode),
              "alignof mismatch for AlphaMode");

static_assert(static_cast<uint32_t>(AlphaMode::Opaque) == WGPUAlphaMode_Opaque,
              "value mismatch for AlphaMode::Opaque");
static_assert(static_cast<uint32_t>(AlphaMode::Premultiplied) ==
                  WGPUAlphaMode_Premultiplied,
              "value mismatch for AlphaMode::Premultiplied");
static_assert(static_cast<uint32_t>(AlphaMode::Unpremultiplied) ==
                  WGPUAlphaMode_Unpremultiplied,
              "value mismatch for AlphaMode::Unpremultiplied");

// BackendType

static_assert(sizeof(BackendType) == sizeof(WGPUBackendType),
              "sizeof mismatch for BackendType");
static_assert(alignof(BackendType) == alignof(WGPUBackendType),
              "alignof mismatch for BackendType");

static_assert(static_cast<uint32_t>(BackendType::Undefined) ==
                  WGPUBackendType_Undefined,
              "value mismatch for BackendType::Undefined");
static_assert(static_cast<uint32_t>(BackendType::Null) == WGPUBackendType_Null,
              "value mismatch for BackendType::Null");
static_assert(static_cast<uint32_t>(BackendType::WebGPU) ==
                  WGPUBackendType_WebGPU,
              "value mismatch for BackendType::WebGPU");
static_assert(static_cast<uint32_t>(BackendType::D3D11) ==
                  WGPUBackendType_D3D11,
              "value mismatch for BackendType::D3D11");
static_assert(static_cast<uint32_t>(BackendType::D3D12) ==
                  WGPUBackendType_D3D12,
              "value mismatch for BackendType::D3D12");
static_assert(static_cast<uint32_t>(BackendType::Metal) ==
                  WGPUBackendType_Metal,
              "value mismatch for BackendType::Metal");
static_assert(static_cast<uint32_t>(BackendType::Vulkan) ==
                  WGPUBackendType_Vulkan,
              "value mismatch for BackendType::Vulkan");
static_assert(static_cast<uint32_t>(BackendType::OpenGL) ==
                  WGPUBackendType_OpenGL,
              "value mismatch for BackendType::OpenGL");
static_assert(static_cast<uint32_t>(BackendType::OpenGLES) ==
                  WGPUBackendType_OpenGLES,
              "value mismatch for BackendType::OpenGLES");

// BlendFactor

static_assert(sizeof(BlendFactor) == sizeof(WGPUBlendFactor),
              "sizeof mismatch for BlendFactor");
static_assert(alignof(BlendFactor) == alignof(WGPUBlendFactor),
              "alignof mismatch for BlendFactor");

static_assert(static_cast<uint32_t>(BlendFactor::Undefined) ==
                  WGPUBlendFactor_Undefined,
              "value mismatch for BlendFactor::Undefined");
static_assert(static_cast<uint32_t>(BlendFactor::Zero) == WGPUBlendFactor_Zero,
              "value mismatch for BlendFactor::Zero");
static_assert(static_cast<uint32_t>(BlendFactor::One) == WGPUBlendFactor_One,
              "value mismatch for BlendFactor::One");
static_assert(static_cast<uint32_t>(BlendFactor::Src) == WGPUBlendFactor_Src,
              "value mismatch for BlendFactor::Src");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusSrc) ==
                  WGPUBlendFactor_OneMinusSrc,
              "value mismatch for BlendFactor::OneMinusSrc");
static_assert(static_cast<uint32_t>(BlendFactor::SrcAlpha) ==
                  WGPUBlendFactor_SrcAlpha,
              "value mismatch for BlendFactor::SrcAlpha");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusSrcAlpha) ==
                  WGPUBlendFactor_OneMinusSrcAlpha,
              "value mismatch for BlendFactor::OneMinusSrcAlpha");
static_assert(static_cast<uint32_t>(BlendFactor::Dst) == WGPUBlendFactor_Dst,
              "value mismatch for BlendFactor::Dst");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusDst) ==
                  WGPUBlendFactor_OneMinusDst,
              "value mismatch for BlendFactor::OneMinusDst");
static_assert(static_cast<uint32_t>(BlendFactor::DstAlpha) ==
                  WGPUBlendFactor_DstAlpha,
              "value mismatch for BlendFactor::DstAlpha");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusDstAlpha) ==
                  WGPUBlendFactor_OneMinusDstAlpha,
              "value mismatch for BlendFactor::OneMinusDstAlpha");
static_assert(static_cast<uint32_t>(BlendFactor::SrcAlphaSaturated) ==
                  WGPUBlendFactor_SrcAlphaSaturated,
              "value mismatch for BlendFactor::SrcAlphaSaturated");
static_assert(static_cast<uint32_t>(BlendFactor::Constant) ==
                  WGPUBlendFactor_Constant,
              "value mismatch for BlendFactor::Constant");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusConstant) ==
                  WGPUBlendFactor_OneMinusConstant,
              "value mismatch for BlendFactor::OneMinusConstant");
static_assert(static_cast<uint32_t>(BlendFactor::Src1) == WGPUBlendFactor_Src1,
              "value mismatch for BlendFactor::Src1");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusSrc1) ==
                  WGPUBlendFactor_OneMinusSrc1,
              "value mismatch for BlendFactor::OneMinusSrc1");
static_assert(static_cast<uint32_t>(BlendFactor::Src1Alpha) ==
                  WGPUBlendFactor_Src1Alpha,
              "value mismatch for BlendFactor::Src1Alpha");
static_assert(static_cast<uint32_t>(BlendFactor::OneMinusSrc1Alpha) ==
                  WGPUBlendFactor_OneMinusSrc1Alpha,
              "value mismatch for BlendFactor::OneMinusSrc1Alpha");

// BlendOperation

static_assert(sizeof(BlendOperation) == sizeof(WGPUBlendOperation),
              "sizeof mismatch for BlendOperation");
static_assert(alignof(BlendOperation) == alignof(WGPUBlendOperation),
              "alignof mismatch for BlendOperation");

static_assert(static_cast<uint32_t>(BlendOperation::Undefined) ==
                  WGPUBlendOperation_Undefined,
              "value mismatch for BlendOperation::Undefined");
static_assert(static_cast<uint32_t>(BlendOperation::Add) ==
                  WGPUBlendOperation_Add,
              "value mismatch for BlendOperation::Add");
static_assert(static_cast<uint32_t>(BlendOperation::Subtract) ==
                  WGPUBlendOperation_Subtract,
              "value mismatch for BlendOperation::Subtract");
static_assert(static_cast<uint32_t>(BlendOperation::ReverseSubtract) ==
                  WGPUBlendOperation_ReverseSubtract,
              "value mismatch for BlendOperation::ReverseSubtract");
static_assert(static_cast<uint32_t>(BlendOperation::Min) ==
                  WGPUBlendOperation_Min,
              "value mismatch for BlendOperation::Min");
static_assert(static_cast<uint32_t>(BlendOperation::Max) ==
                  WGPUBlendOperation_Max,
              "value mismatch for BlendOperation::Max");

// BufferBindingType

static_assert(sizeof(BufferBindingType) == sizeof(WGPUBufferBindingType),
              "sizeof mismatch for BufferBindingType");
static_assert(alignof(BufferBindingType) == alignof(WGPUBufferBindingType),
              "alignof mismatch for BufferBindingType");

static_assert(static_cast<uint32_t>(BufferBindingType::Undefined) ==
                  WGPUBufferBindingType_Undefined,
              "value mismatch for BufferBindingType::Undefined");
static_assert(static_cast<uint32_t>(BufferBindingType::Uniform) ==
                  WGPUBufferBindingType_Uniform,
              "value mismatch for BufferBindingType::Uniform");
static_assert(static_cast<uint32_t>(BufferBindingType::Storage) ==
                  WGPUBufferBindingType_Storage,
              "value mismatch for BufferBindingType::Storage");
static_assert(static_cast<uint32_t>(BufferBindingType::ReadOnlyStorage) ==
                  WGPUBufferBindingType_ReadOnlyStorage,
              "value mismatch for BufferBindingType::ReadOnlyStorage");

// BufferMapAsyncStatus

static_assert(sizeof(BufferMapAsyncStatus) == sizeof(WGPUBufferMapAsyncStatus),
              "sizeof mismatch for BufferMapAsyncStatus");
static_assert(alignof(BufferMapAsyncStatus) ==
                  alignof(WGPUBufferMapAsyncStatus),
              "alignof mismatch for BufferMapAsyncStatus");

static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::Success) ==
                  WGPUBufferMapAsyncStatus_Success,
              "value mismatch for BufferMapAsyncStatus::Success");
static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::InstanceDropped) ==
                  WGPUBufferMapAsyncStatus_InstanceDropped,
              "value mismatch for BufferMapAsyncStatus::InstanceDropped");
static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::ValidationError) ==
                  WGPUBufferMapAsyncStatus_ValidationError,
              "value mismatch for BufferMapAsyncStatus::ValidationError");
static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::Unknown) ==
                  WGPUBufferMapAsyncStatus_Unknown,
              "value mismatch for BufferMapAsyncStatus::Unknown");
static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::DeviceLost) ==
                  WGPUBufferMapAsyncStatus_DeviceLost,
              "value mismatch for BufferMapAsyncStatus::DeviceLost");
static_assert(
    static_cast<uint32_t>(BufferMapAsyncStatus::DestroyedBeforeCallback) ==
        WGPUBufferMapAsyncStatus_DestroyedBeforeCallback,
    "value mismatch for BufferMapAsyncStatus::DestroyedBeforeCallback");
static_assert(
    static_cast<uint32_t>(BufferMapAsyncStatus::UnmappedBeforeCallback) ==
        WGPUBufferMapAsyncStatus_UnmappedBeforeCallback,
    "value mismatch for BufferMapAsyncStatus::UnmappedBeforeCallback");
static_assert(
    static_cast<uint32_t>(BufferMapAsyncStatus::MappingAlreadyPending) ==
        WGPUBufferMapAsyncStatus_MappingAlreadyPending,
    "value mismatch for BufferMapAsyncStatus::MappingAlreadyPending");
static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::OffsetOutOfRange) ==
                  WGPUBufferMapAsyncStatus_OffsetOutOfRange,
              "value mismatch for BufferMapAsyncStatus::OffsetOutOfRange");
static_assert(static_cast<uint32_t>(BufferMapAsyncStatus::SizeOutOfRange) ==
                  WGPUBufferMapAsyncStatus_SizeOutOfRange,
              "value mismatch for BufferMapAsyncStatus::SizeOutOfRange");

// BufferMapState

static_assert(sizeof(BufferMapState) == sizeof(WGPUBufferMapState),
              "sizeof mismatch for BufferMapState");
static_assert(alignof(BufferMapState) == alignof(WGPUBufferMapState),
              "alignof mismatch for BufferMapState");

static_assert(static_cast<uint32_t>(BufferMapState::Unmapped) ==
                  WGPUBufferMapState_Unmapped,
              "value mismatch for BufferMapState::Unmapped");
static_assert(static_cast<uint32_t>(BufferMapState::Pending) ==
                  WGPUBufferMapState_Pending,
              "value mismatch for BufferMapState::Pending");
static_assert(static_cast<uint32_t>(BufferMapState::Mapped) ==
                  WGPUBufferMapState_Mapped,
              "value mismatch for BufferMapState::Mapped");

// CallbackMode

static_assert(sizeof(CallbackMode) == sizeof(WGPUCallbackMode),
              "sizeof mismatch for CallbackMode");
static_assert(alignof(CallbackMode) == alignof(WGPUCallbackMode),
              "alignof mismatch for CallbackMode");

static_assert(static_cast<uint32_t>(CallbackMode::WaitAnyOnly) ==
                  WGPUCallbackMode_WaitAnyOnly,
              "value mismatch for CallbackMode::WaitAnyOnly");
static_assert(static_cast<uint32_t>(CallbackMode::AllowProcessEvents) ==
                  WGPUCallbackMode_AllowProcessEvents,
              "value mismatch for CallbackMode::AllowProcessEvents");
static_assert(static_cast<uint32_t>(CallbackMode::AllowSpontaneous) ==
                  WGPUCallbackMode_AllowSpontaneous,
              "value mismatch for CallbackMode::AllowSpontaneous");

// CompareFunction

static_assert(sizeof(CompareFunction) == sizeof(WGPUCompareFunction),
              "sizeof mismatch for CompareFunction");
static_assert(alignof(CompareFunction) == alignof(WGPUCompareFunction),
              "alignof mismatch for CompareFunction");

static_assert(static_cast<uint32_t>(CompareFunction::Undefined) ==
                  WGPUCompareFunction_Undefined,
              "value mismatch for CompareFunction::Undefined");
static_assert(static_cast<uint32_t>(CompareFunction::Never) ==
                  WGPUCompareFunction_Never,
              "value mismatch for CompareFunction::Never");
static_assert(static_cast<uint32_t>(CompareFunction::Less) ==
                  WGPUCompareFunction_Less,
              "value mismatch for CompareFunction::Less");
static_assert(static_cast<uint32_t>(CompareFunction::Equal) ==
                  WGPUCompareFunction_Equal,
              "value mismatch for CompareFunction::Equal");
static_assert(static_cast<uint32_t>(CompareFunction::LessEqual) ==
                  WGPUCompareFunction_LessEqual,
              "value mismatch for CompareFunction::LessEqual");
static_assert(static_cast<uint32_t>(CompareFunction::Greater) ==
                  WGPUCompareFunction_Greater,
              "value mismatch for CompareFunction::Greater");
static_assert(static_cast<uint32_t>(CompareFunction::NotEqual) ==
                  WGPUCompareFunction_NotEqual,
              "value mismatch for CompareFunction::NotEqual");
static_assert(static_cast<uint32_t>(CompareFunction::GreaterEqual) ==
                  WGPUCompareFunction_GreaterEqual,
              "value mismatch for CompareFunction::GreaterEqual");
static_assert(static_cast<uint32_t>(CompareFunction::Always) ==
                  WGPUCompareFunction_Always,
              "value mismatch for CompareFunction::Always");

// CompilationInfoRequestStatus

static_assert(sizeof(CompilationInfoRequestStatus) ==
                  sizeof(WGPUCompilationInfoRequestStatus),
              "sizeof mismatch for CompilationInfoRequestStatus");
static_assert(alignof(CompilationInfoRequestStatus) ==
                  alignof(WGPUCompilationInfoRequestStatus),
              "alignof mismatch for CompilationInfoRequestStatus");

static_assert(static_cast<uint32_t>(CompilationInfoRequestStatus::Success) ==
                  WGPUCompilationInfoRequestStatus_Success,
              "value mismatch for CompilationInfoRequestStatus::Success");
static_assert(
    static_cast<uint32_t>(CompilationInfoRequestStatus::InstanceDropped) ==
        WGPUCompilationInfoRequestStatus_InstanceDropped,
    "value mismatch for CompilationInfoRequestStatus::InstanceDropped");
static_assert(static_cast<uint32_t>(CompilationInfoRequestStatus::Error) ==
                  WGPUCompilationInfoRequestStatus_Error,
              "value mismatch for CompilationInfoRequestStatus::Error");
static_assert(static_cast<uint32_t>(CompilationInfoRequestStatus::DeviceLost) ==
                  WGPUCompilationInfoRequestStatus_DeviceLost,
              "value mismatch for CompilationInfoRequestStatus::DeviceLost");
static_assert(static_cast<uint32_t>(CompilationInfoRequestStatus::Unknown) ==
                  WGPUCompilationInfoRequestStatus_Unknown,
              "value mismatch for CompilationInfoRequestStatus::Unknown");

// CompilationMessageType

static_assert(sizeof(CompilationMessageType) ==
                  sizeof(WGPUCompilationMessageType),
              "sizeof mismatch for CompilationMessageType");
static_assert(alignof(CompilationMessageType) ==
                  alignof(WGPUCompilationMessageType),
              "alignof mismatch for CompilationMessageType");

static_assert(static_cast<uint32_t>(CompilationMessageType::Error) ==
                  WGPUCompilationMessageType_Error,
              "value mismatch for CompilationMessageType::Error");
static_assert(static_cast<uint32_t>(CompilationMessageType::Warning) ==
                  WGPUCompilationMessageType_Warning,
              "value mismatch for CompilationMessageType::Warning");
static_assert(static_cast<uint32_t>(CompilationMessageType::Info) ==
                  WGPUCompilationMessageType_Info,
              "value mismatch for CompilationMessageType::Info");

// CreatePipelineAsyncStatus

static_assert(sizeof(CreatePipelineAsyncStatus) ==
                  sizeof(WGPUCreatePipelineAsyncStatus),
              "sizeof mismatch for CreatePipelineAsyncStatus");
static_assert(alignof(CreatePipelineAsyncStatus) ==
                  alignof(WGPUCreatePipelineAsyncStatus),
              "alignof mismatch for CreatePipelineAsyncStatus");

static_assert(static_cast<uint32_t>(CreatePipelineAsyncStatus::Success) ==
                  WGPUCreatePipelineAsyncStatus_Success,
              "value mismatch for CreatePipelineAsyncStatus::Success");
static_assert(
    static_cast<uint32_t>(CreatePipelineAsyncStatus::InstanceDropped) ==
        WGPUCreatePipelineAsyncStatus_InstanceDropped,
    "value mismatch for CreatePipelineAsyncStatus::InstanceDropped");
static_assert(
    static_cast<uint32_t>(CreatePipelineAsyncStatus::ValidationError) ==
        WGPUCreatePipelineAsyncStatus_ValidationError,
    "value mismatch for CreatePipelineAsyncStatus::ValidationError");
static_assert(static_cast<uint32_t>(CreatePipelineAsyncStatus::InternalError) ==
                  WGPUCreatePipelineAsyncStatus_InternalError,
              "value mismatch for CreatePipelineAsyncStatus::InternalError");
static_assert(static_cast<uint32_t>(CreatePipelineAsyncStatus::DeviceLost) ==
                  WGPUCreatePipelineAsyncStatus_DeviceLost,
              "value mismatch for CreatePipelineAsyncStatus::DeviceLost");
static_assert(
    static_cast<uint32_t>(CreatePipelineAsyncStatus::DeviceDestroyed) ==
        WGPUCreatePipelineAsyncStatus_DeviceDestroyed,
    "value mismatch for CreatePipelineAsyncStatus::DeviceDestroyed");
static_assert(static_cast<uint32_t>(CreatePipelineAsyncStatus::Unknown) ==
                  WGPUCreatePipelineAsyncStatus_Unknown,
              "value mismatch for CreatePipelineAsyncStatus::Unknown");

// CullMode

static_assert(sizeof(CullMode) == sizeof(WGPUCullMode),
              "sizeof mismatch for CullMode");
static_assert(alignof(CullMode) == alignof(WGPUCullMode),
              "alignof mismatch for CullMode");

static_assert(static_cast<uint32_t>(CullMode::Undefined) ==
                  WGPUCullMode_Undefined,
              "value mismatch for CullMode::Undefined");
static_assert(static_cast<uint32_t>(CullMode::None) == WGPUCullMode_None,
              "value mismatch for CullMode::None");
static_assert(static_cast<uint32_t>(CullMode::Front) == WGPUCullMode_Front,
              "value mismatch for CullMode::Front");
static_assert(static_cast<uint32_t>(CullMode::Back) == WGPUCullMode_Back,
              "value mismatch for CullMode::Back");

// DeviceLostReason

static_assert(sizeof(DeviceLostReason) == sizeof(WGPUDeviceLostReason),
              "sizeof mismatch for DeviceLostReason");
static_assert(alignof(DeviceLostReason) == alignof(WGPUDeviceLostReason),
              "alignof mismatch for DeviceLostReason");

static_assert(static_cast<uint32_t>(DeviceLostReason::Undefined) ==
                  WGPUDeviceLostReason_Undefined,
              "value mismatch for DeviceLostReason::Undefined");
static_assert(static_cast<uint32_t>(DeviceLostReason::Destroyed) ==
                  WGPUDeviceLostReason_Destroyed,
              "value mismatch for DeviceLostReason::Destroyed");

// ErrorFilter

static_assert(sizeof(ErrorFilter) == sizeof(WGPUErrorFilter),
              "sizeof mismatch for ErrorFilter");
static_assert(alignof(ErrorFilter) == alignof(WGPUErrorFilter),
              "alignof mismatch for ErrorFilter");

static_assert(static_cast<uint32_t>(ErrorFilter::Validation) ==
                  WGPUErrorFilter_Validation,
              "value mismatch for ErrorFilter::Validation");
static_assert(static_cast<uint32_t>(ErrorFilter::OutOfMemory) ==
                  WGPUErrorFilter_OutOfMemory,
              "value mismatch for ErrorFilter::OutOfMemory");
static_assert(static_cast<uint32_t>(ErrorFilter::Internal) ==
                  WGPUErrorFilter_Internal,
              "value mismatch for ErrorFilter::Internal");

// ErrorType

static_assert(sizeof(ErrorType) == sizeof(WGPUErrorType),
              "sizeof mismatch for ErrorType");
static_assert(alignof(ErrorType) == alignof(WGPUErrorType),
              "alignof mismatch for ErrorType");

static_assert(static_cast<uint32_t>(ErrorType::NoError) ==
                  WGPUErrorType_NoError,
              "value mismatch for ErrorType::NoError");
static_assert(static_cast<uint32_t>(ErrorType::Validation) ==
                  WGPUErrorType_Validation,
              "value mismatch for ErrorType::Validation");
static_assert(static_cast<uint32_t>(ErrorType::OutOfMemory) ==
                  WGPUErrorType_OutOfMemory,
              "value mismatch for ErrorType::OutOfMemory");
static_assert(static_cast<uint32_t>(ErrorType::Internal) ==
                  WGPUErrorType_Internal,
              "value mismatch for ErrorType::Internal");
static_assert(static_cast<uint32_t>(ErrorType::Unknown) ==
                  WGPUErrorType_Unknown,
              "value mismatch for ErrorType::Unknown");
static_assert(static_cast<uint32_t>(ErrorType::DeviceLost) ==
                  WGPUErrorType_DeviceLost,
              "value mismatch for ErrorType::DeviceLost");

// ExternalTextureRotation

static_assert(sizeof(ExternalTextureRotation) ==
                  sizeof(WGPUExternalTextureRotation),
              "sizeof mismatch for ExternalTextureRotation");
static_assert(alignof(ExternalTextureRotation) ==
                  alignof(WGPUExternalTextureRotation),
              "alignof mismatch for ExternalTextureRotation");

static_assert(static_cast<uint32_t>(ExternalTextureRotation::Rotate0Degrees) ==
                  WGPUExternalTextureRotation_Rotate0Degrees,
              "value mismatch for ExternalTextureRotation::Rotate0Degrees");
static_assert(static_cast<uint32_t>(ExternalTextureRotation::Rotate90Degrees) ==
                  WGPUExternalTextureRotation_Rotate90Degrees,
              "value mismatch for ExternalTextureRotation::Rotate90Degrees");
static_assert(
    static_cast<uint32_t>(ExternalTextureRotation::Rotate180Degrees) ==
        WGPUExternalTextureRotation_Rotate180Degrees,
    "value mismatch for ExternalTextureRotation::Rotate180Degrees");
static_assert(
    static_cast<uint32_t>(ExternalTextureRotation::Rotate270Degrees) ==
        WGPUExternalTextureRotation_Rotate270Degrees,
    "value mismatch for ExternalTextureRotation::Rotate270Degrees");

// FeatureName

static_assert(sizeof(FeatureName) == sizeof(WGPUFeatureName),
              "sizeof mismatch for FeatureName");
static_assert(alignof(FeatureName) == alignof(WGPUFeatureName),
              "alignof mismatch for FeatureName");

static_assert(static_cast<uint32_t>(FeatureName::Undefined) ==
                  WGPUFeatureName_Undefined,
              "value mismatch for FeatureName::Undefined");
static_assert(static_cast<uint32_t>(FeatureName::DepthClipControl) ==
                  WGPUFeatureName_DepthClipControl,
              "value mismatch for FeatureName::DepthClipControl");
static_assert(static_cast<uint32_t>(FeatureName::Depth32FloatStencil8) ==
                  WGPUFeatureName_Depth32FloatStencil8,
              "value mismatch for FeatureName::Depth32FloatStencil8");
static_assert(static_cast<uint32_t>(FeatureName::TimestampQuery) ==
                  WGPUFeatureName_TimestampQuery,
              "value mismatch for FeatureName::TimestampQuery");
static_assert(static_cast<uint32_t>(FeatureName::TextureCompressionBC) ==
                  WGPUFeatureName_TextureCompressionBC,
              "value mismatch for FeatureName::TextureCompressionBC");
static_assert(static_cast<uint32_t>(FeatureName::TextureCompressionETC2) ==
                  WGPUFeatureName_TextureCompressionETC2,
              "value mismatch for FeatureName::TextureCompressionETC2");
static_assert(static_cast<uint32_t>(FeatureName::TextureCompressionASTC) ==
                  WGPUFeatureName_TextureCompressionASTC,
              "value mismatch for FeatureName::TextureCompressionASTC");
static_assert(static_cast<uint32_t>(FeatureName::IndirectFirstInstance) ==
                  WGPUFeatureName_IndirectFirstInstance,
              "value mismatch for FeatureName::IndirectFirstInstance");
static_assert(static_cast<uint32_t>(FeatureName::ShaderF16) ==
                  WGPUFeatureName_ShaderF16,
              "value mismatch for FeatureName::ShaderF16");
static_assert(static_cast<uint32_t>(FeatureName::RG11B10UfloatRenderable) ==
                  WGPUFeatureName_RG11B10UfloatRenderable,
              "value mismatch for FeatureName::RG11B10UfloatRenderable");
static_assert(static_cast<uint32_t>(FeatureName::BGRA8UnormStorage) ==
                  WGPUFeatureName_BGRA8UnormStorage,
              "value mismatch for FeatureName::BGRA8UnormStorage");
static_assert(static_cast<uint32_t>(FeatureName::Float32Filterable) ==
                  WGPUFeatureName_Float32Filterable,
              "value mismatch for FeatureName::Float32Filterable");
static_assert(static_cast<uint32_t>(FeatureName::DawnInternalUsages) ==
                  WGPUFeatureName_DawnInternalUsages,
              "value mismatch for FeatureName::DawnInternalUsages");
static_assert(static_cast<uint32_t>(FeatureName::DawnMultiPlanarFormats) ==
                  WGPUFeatureName_DawnMultiPlanarFormats,
              "value mismatch for FeatureName::DawnMultiPlanarFormats");
static_assert(static_cast<uint32_t>(FeatureName::DawnNative) ==
                  WGPUFeatureName_DawnNative,
              "value mismatch for FeatureName::DawnNative");
static_assert(
    static_cast<uint32_t>(
        FeatureName::ChromiumExperimentalTimestampQueryInsidePasses) ==
        WGPUFeatureName_ChromiumExperimentalTimestampQueryInsidePasses,
    "value mismatch for "
    "FeatureName::ChromiumExperimentalTimestampQueryInsidePasses");
static_assert(
    static_cast<uint32_t>(FeatureName::ImplicitDeviceSynchronization) ==
        WGPUFeatureName_ImplicitDeviceSynchronization,
    "value mismatch for FeatureName::ImplicitDeviceSynchronization");
static_assert(static_cast<uint32_t>(FeatureName::SurfaceCapabilities) ==
                  WGPUFeatureName_SurfaceCapabilities,
              "value mismatch for FeatureName::SurfaceCapabilities");
static_assert(static_cast<uint32_t>(FeatureName::TransientAttachments) ==
                  WGPUFeatureName_TransientAttachments,
              "value mismatch for FeatureName::TransientAttachments");
static_assert(static_cast<uint32_t>(FeatureName::MSAARenderToSingleSampled) ==
                  WGPUFeatureName_MSAARenderToSingleSampled,
              "value mismatch for FeatureName::MSAARenderToSingleSampled");
static_assert(static_cast<uint32_t>(FeatureName::DualSourceBlending) ==
                  WGPUFeatureName_DualSourceBlending,
              "value mismatch for FeatureName::DualSourceBlending");
static_assert(static_cast<uint32_t>(FeatureName::D3D11MultithreadProtected) ==
                  WGPUFeatureName_D3D11MultithreadProtected,
              "value mismatch for FeatureName::D3D11MultithreadProtected");
static_assert(static_cast<uint32_t>(FeatureName::ANGLETextureSharing) ==
                  WGPUFeatureName_ANGLETextureSharing,
              "value mismatch for FeatureName::ANGLETextureSharing");
static_assert(
    static_cast<uint32_t>(FeatureName::ChromiumExperimentalSubgroups) ==
        WGPUFeatureName_ChromiumExperimentalSubgroups,
    "value mismatch for FeatureName::ChromiumExperimentalSubgroups");
static_assert(
    static_cast<uint32_t>(
        FeatureName::ChromiumExperimentalSubgroupUniformControlFlow) ==
        WGPUFeatureName_ChromiumExperimentalSubgroupUniformControlFlow,
    "value mismatch for "
    "FeatureName::ChromiumExperimentalSubgroupUniformControlFlow");
static_assert(static_cast<uint32_t>(FeatureName::PixelLocalStorageCoherent) ==
                  WGPUFeatureName_PixelLocalStorageCoherent,
              "value mismatch for FeatureName::PixelLocalStorageCoherent");
static_assert(
    static_cast<uint32_t>(FeatureName::PixelLocalStorageNonCoherent) ==
        WGPUFeatureName_PixelLocalStorageNonCoherent,
    "value mismatch for FeatureName::PixelLocalStorageNonCoherent");
static_assert(static_cast<uint32_t>(FeatureName::Unorm16TextureFormats) ==
                  WGPUFeatureName_Unorm16TextureFormats,
              "value mismatch for FeatureName::Unorm16TextureFormats");
static_assert(static_cast<uint32_t>(FeatureName::Snorm16TextureFormats) ==
                  WGPUFeatureName_Snorm16TextureFormats,
              "value mismatch for FeatureName::Snorm16TextureFormats");
static_assert(
    static_cast<uint32_t>(FeatureName::MultiPlanarFormatExtendedUsages) ==
        WGPUFeatureName_MultiPlanarFormatExtendedUsages,
    "value mismatch for FeatureName::MultiPlanarFormatExtendedUsages");
static_assert(static_cast<uint32_t>(FeatureName::MultiPlanarFormatP010) ==
                  WGPUFeatureName_MultiPlanarFormatP010,
              "value mismatch for FeatureName::MultiPlanarFormatP010");
static_assert(static_cast<uint32_t>(FeatureName::HostMappedPointer) ==
                  WGPUFeatureName_HostMappedPointer,
              "value mismatch for FeatureName::HostMappedPointer");
static_assert(static_cast<uint32_t>(FeatureName::MultiPlanarRenderTargets) ==
                  WGPUFeatureName_MultiPlanarRenderTargets,
              "value mismatch for FeatureName::MultiPlanarRenderTargets");
static_assert(static_cast<uint32_t>(FeatureName::MultiPlanarFormatNv12a) ==
                  WGPUFeatureName_MultiPlanarFormatNv12a,
              "value mismatch for FeatureName::MultiPlanarFormatNv12a");
static_assert(static_cast<uint32_t>(FeatureName::FramebufferFetch) ==
                  WGPUFeatureName_FramebufferFetch,
              "value mismatch for FeatureName::FramebufferFetch");
static_assert(static_cast<uint32_t>(FeatureName::BufferMapExtendedUsages) ==
                  WGPUFeatureName_BufferMapExtendedUsages,
              "value mismatch for FeatureName::BufferMapExtendedUsages");
static_assert(
    static_cast<uint32_t>(FeatureName::AdapterPropertiesMemoryHeaps) ==
        WGPUFeatureName_AdapterPropertiesMemoryHeaps,
    "value mismatch for FeatureName::AdapterPropertiesMemoryHeaps");
static_assert(static_cast<uint32_t>(FeatureName::AdapterPropertiesD3D) ==
                  WGPUFeatureName_AdapterPropertiesD3D,
              "value mismatch for FeatureName::AdapterPropertiesD3D");
static_assert(static_cast<uint32_t>(FeatureName::AdapterPropertiesVk) ==
                  WGPUFeatureName_AdapterPropertiesVk,
              "value mismatch for FeatureName::AdapterPropertiesVk");
static_assert(static_cast<uint32_t>(FeatureName::R8UnormStorage) ==
                  WGPUFeatureName_R8UnormStorage,
              "value mismatch for FeatureName::R8UnormStorage");
static_assert(static_cast<uint32_t>(FeatureName::FormatCapabilities) ==
                  WGPUFeatureName_FormatCapabilities,
              "value mismatch for FeatureName::FormatCapabilities");
static_assert(static_cast<uint32_t>(FeatureName::DrmFormatCapabilities) ==
                  WGPUFeatureName_DrmFormatCapabilities,
              "value mismatch for FeatureName::DrmFormatCapabilities");
static_assert(static_cast<uint32_t>(FeatureName::Norm16TextureFormats) ==
                  WGPUFeatureName_Norm16TextureFormats,
              "value mismatch for FeatureName::Norm16TextureFormats");
static_assert(
    static_cast<uint32_t>(
        FeatureName::SharedTextureMemoryVkDedicatedAllocation) ==
        WGPUFeatureName_SharedTextureMemoryVkDedicatedAllocation,
    "value mismatch for FeatureName::SharedTextureMemoryVkDedicatedAllocation");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedTextureMemoryAHardwareBuffer) ==
        WGPUFeatureName_SharedTextureMemoryAHardwareBuffer,
    "value mismatch for FeatureName::SharedTextureMemoryAHardwareBuffer");
static_assert(static_cast<uint32_t>(FeatureName::SharedTextureMemoryDmaBuf) ==
                  WGPUFeatureName_SharedTextureMemoryDmaBuf,
              "value mismatch for FeatureName::SharedTextureMemoryDmaBuf");
static_assert(static_cast<uint32_t>(FeatureName::SharedTextureMemoryOpaqueFD) ==
                  WGPUFeatureName_SharedTextureMemoryOpaqueFD,
              "value mismatch for FeatureName::SharedTextureMemoryOpaqueFD");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedTextureMemoryZirconHandle) ==
        WGPUFeatureName_SharedTextureMemoryZirconHandle,
    "value mismatch for FeatureName::SharedTextureMemoryZirconHandle");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedTextureMemoryDXGISharedHandle) ==
        WGPUFeatureName_SharedTextureMemoryDXGISharedHandle,
    "value mismatch for FeatureName::SharedTextureMemoryDXGISharedHandle");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedTextureMemoryD3D11Texture2D) ==
        WGPUFeatureName_SharedTextureMemoryD3D11Texture2D,
    "value mismatch for FeatureName::SharedTextureMemoryD3D11Texture2D");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedTextureMemoryIOSurface) ==
        WGPUFeatureName_SharedTextureMemoryIOSurface,
    "value mismatch for FeatureName::SharedTextureMemoryIOSurface");
static_assert(static_cast<uint32_t>(FeatureName::SharedTextureMemoryEGLImage) ==
                  WGPUFeatureName_SharedTextureMemoryEGLImage,
              "value mismatch for FeatureName::SharedTextureMemoryEGLImage");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedFenceVkSemaphoreOpaqueFD) ==
        WGPUFeatureName_SharedFenceVkSemaphoreOpaqueFD,
    "value mismatch for FeatureName::SharedFenceVkSemaphoreOpaqueFD");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedFenceVkSemaphoreSyncFD) ==
        WGPUFeatureName_SharedFenceVkSemaphoreSyncFD,
    "value mismatch for FeatureName::SharedFenceVkSemaphoreSyncFD");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedFenceVkSemaphoreZirconHandle) ==
        WGPUFeatureName_SharedFenceVkSemaphoreZirconHandle,
    "value mismatch for FeatureName::SharedFenceVkSemaphoreZirconHandle");
static_assert(static_cast<uint32_t>(FeatureName::SharedFenceDXGISharedHandle) ==
                  WGPUFeatureName_SharedFenceDXGISharedHandle,
              "value mismatch for FeatureName::SharedFenceDXGISharedHandle");
static_assert(static_cast<uint32_t>(FeatureName::SharedFenceMTLSharedEvent) ==
                  WGPUFeatureName_SharedFenceMTLSharedEvent,
              "value mismatch for FeatureName::SharedFenceMTLSharedEvent");
static_assert(
    static_cast<uint32_t>(FeatureName::SharedBufferMemoryD3D12Resource) ==
        WGPUFeatureName_SharedBufferMemoryD3D12Resource,
    "value mismatch for FeatureName::SharedBufferMemoryD3D12Resource");
static_assert(static_cast<uint32_t>(FeatureName::StaticSamplers) ==
                  WGPUFeatureName_StaticSamplers,
              "value mismatch for FeatureName::StaticSamplers");

// FilterMode

static_assert(sizeof(FilterMode) == sizeof(WGPUFilterMode),
              "sizeof mismatch for FilterMode");
static_assert(alignof(FilterMode) == alignof(WGPUFilterMode),
              "alignof mismatch for FilterMode");

static_assert(static_cast<uint32_t>(FilterMode::Undefined) ==
                  WGPUFilterMode_Undefined,
              "value mismatch for FilterMode::Undefined");
static_assert(static_cast<uint32_t>(FilterMode::Nearest) ==
                  WGPUFilterMode_Nearest,
              "value mismatch for FilterMode::Nearest");
static_assert(static_cast<uint32_t>(FilterMode::Linear) ==
                  WGPUFilterMode_Linear,
              "value mismatch for FilterMode::Linear");

// FrontFace

static_assert(sizeof(FrontFace) == sizeof(WGPUFrontFace),
              "sizeof mismatch for FrontFace");
static_assert(alignof(FrontFace) == alignof(WGPUFrontFace),
              "alignof mismatch for FrontFace");

static_assert(static_cast<uint32_t>(FrontFace::Undefined) ==
                  WGPUFrontFace_Undefined,
              "value mismatch for FrontFace::Undefined");
static_assert(static_cast<uint32_t>(FrontFace::CCW) == WGPUFrontFace_CCW,
              "value mismatch for FrontFace::CCW");
static_assert(static_cast<uint32_t>(FrontFace::CW) == WGPUFrontFace_CW,
              "value mismatch for FrontFace::CW");

// IndexFormat

static_assert(sizeof(IndexFormat) == sizeof(WGPUIndexFormat),
              "sizeof mismatch for IndexFormat");
static_assert(alignof(IndexFormat) == alignof(WGPUIndexFormat),
              "alignof mismatch for IndexFormat");

static_assert(static_cast<uint32_t>(IndexFormat::Undefined) ==
                  WGPUIndexFormat_Undefined,
              "value mismatch for IndexFormat::Undefined");
static_assert(static_cast<uint32_t>(IndexFormat::Uint16) ==
                  WGPUIndexFormat_Uint16,
              "value mismatch for IndexFormat::Uint16");
static_assert(static_cast<uint32_t>(IndexFormat::Uint32) ==
                  WGPUIndexFormat_Uint32,
              "value mismatch for IndexFormat::Uint32");

// LoadOp

static_assert(sizeof(LoadOp) == sizeof(WGPULoadOp),
              "sizeof mismatch for LoadOp");
static_assert(alignof(LoadOp) == alignof(WGPULoadOp),
              "alignof mismatch for LoadOp");

static_assert(static_cast<uint32_t>(LoadOp::Undefined) == WGPULoadOp_Undefined,
              "value mismatch for LoadOp::Undefined");
static_assert(static_cast<uint32_t>(LoadOp::Clear) == WGPULoadOp_Clear,
              "value mismatch for LoadOp::Clear");
static_assert(static_cast<uint32_t>(LoadOp::Load) == WGPULoadOp_Load,
              "value mismatch for LoadOp::Load");

// LoggingType

static_assert(sizeof(LoggingType) == sizeof(WGPULoggingType),
              "sizeof mismatch for LoggingType");
static_assert(alignof(LoggingType) == alignof(WGPULoggingType),
              "alignof mismatch for LoggingType");

static_assert(static_cast<uint32_t>(LoggingType::Verbose) ==
                  WGPULoggingType_Verbose,
              "value mismatch for LoggingType::Verbose");
static_assert(static_cast<uint32_t>(LoggingType::Info) == WGPULoggingType_Info,
              "value mismatch for LoggingType::Info");
static_assert(static_cast<uint32_t>(LoggingType::Warning) ==
                  WGPULoggingType_Warning,
              "value mismatch for LoggingType::Warning");
static_assert(static_cast<uint32_t>(LoggingType::Error) ==
                  WGPULoggingType_Error,
              "value mismatch for LoggingType::Error");

// MipmapFilterMode

static_assert(sizeof(MipmapFilterMode) == sizeof(WGPUMipmapFilterMode),
              "sizeof mismatch for MipmapFilterMode");
static_assert(alignof(MipmapFilterMode) == alignof(WGPUMipmapFilterMode),
              "alignof mismatch for MipmapFilterMode");

static_assert(static_cast<uint32_t>(MipmapFilterMode::Undefined) ==
                  WGPUMipmapFilterMode_Undefined,
              "value mismatch for MipmapFilterMode::Undefined");
static_assert(static_cast<uint32_t>(MipmapFilterMode::Nearest) ==
                  WGPUMipmapFilterMode_Nearest,
              "value mismatch for MipmapFilterMode::Nearest");
static_assert(static_cast<uint32_t>(MipmapFilterMode::Linear) ==
                  WGPUMipmapFilterMode_Linear,
              "value mismatch for MipmapFilterMode::Linear");

// PopErrorScopeStatus

static_assert(sizeof(PopErrorScopeStatus) == sizeof(WGPUPopErrorScopeStatus),
              "sizeof mismatch for PopErrorScopeStatus");
static_assert(alignof(PopErrorScopeStatus) == alignof(WGPUPopErrorScopeStatus),
              "alignof mismatch for PopErrorScopeStatus");

static_assert(static_cast<uint32_t>(PopErrorScopeStatus::Success) ==
                  WGPUPopErrorScopeStatus_Success,
              "value mismatch for PopErrorScopeStatus::Success");
static_assert(static_cast<uint32_t>(PopErrorScopeStatus::InstanceDropped) ==
                  WGPUPopErrorScopeStatus_InstanceDropped,
              "value mismatch for PopErrorScopeStatus::InstanceDropped");

// PowerPreference

static_assert(sizeof(PowerPreference) == sizeof(WGPUPowerPreference),
              "sizeof mismatch for PowerPreference");
static_assert(alignof(PowerPreference) == alignof(WGPUPowerPreference),
              "alignof mismatch for PowerPreference");

static_assert(static_cast<uint32_t>(PowerPreference::Undefined) ==
                  WGPUPowerPreference_Undefined,
              "value mismatch for PowerPreference::Undefined");
static_assert(static_cast<uint32_t>(PowerPreference::LowPower) ==
                  WGPUPowerPreference_LowPower,
              "value mismatch for PowerPreference::LowPower");
static_assert(static_cast<uint32_t>(PowerPreference::HighPerformance) ==
                  WGPUPowerPreference_HighPerformance,
              "value mismatch for PowerPreference::HighPerformance");

// PresentMode

static_assert(sizeof(PresentMode) == sizeof(WGPUPresentMode),
              "sizeof mismatch for PresentMode");
static_assert(alignof(PresentMode) == alignof(WGPUPresentMode),
              "alignof mismatch for PresentMode");

static_assert(static_cast<uint32_t>(PresentMode::Fifo) == WGPUPresentMode_Fifo,
              "value mismatch for PresentMode::Fifo");
static_assert(static_cast<uint32_t>(PresentMode::Immediate) ==
                  WGPUPresentMode_Immediate,
              "value mismatch for PresentMode::Immediate");
static_assert(static_cast<uint32_t>(PresentMode::Mailbox) ==
                  WGPUPresentMode_Mailbox,
              "value mismatch for PresentMode::Mailbox");

// PrimitiveTopology

static_assert(sizeof(PrimitiveTopology) == sizeof(WGPUPrimitiveTopology),
              "sizeof mismatch for PrimitiveTopology");
static_assert(alignof(PrimitiveTopology) == alignof(WGPUPrimitiveTopology),
              "alignof mismatch for PrimitiveTopology");

static_assert(static_cast<uint32_t>(PrimitiveTopology::Undefined) ==
                  WGPUPrimitiveTopology_Undefined,
              "value mismatch for PrimitiveTopology::Undefined");
static_assert(static_cast<uint32_t>(PrimitiveTopology::PointList) ==
                  WGPUPrimitiveTopology_PointList,
              "value mismatch for PrimitiveTopology::PointList");
static_assert(static_cast<uint32_t>(PrimitiveTopology::LineList) ==
                  WGPUPrimitiveTopology_LineList,
              "value mismatch for PrimitiveTopology::LineList");
static_assert(static_cast<uint32_t>(PrimitiveTopology::LineStrip) ==
                  WGPUPrimitiveTopology_LineStrip,
              "value mismatch for PrimitiveTopology::LineStrip");
static_assert(static_cast<uint32_t>(PrimitiveTopology::TriangleList) ==
                  WGPUPrimitiveTopology_TriangleList,
              "value mismatch for PrimitiveTopology::TriangleList");
static_assert(static_cast<uint32_t>(PrimitiveTopology::TriangleStrip) ==
                  WGPUPrimitiveTopology_TriangleStrip,
              "value mismatch for PrimitiveTopology::TriangleStrip");

// QueryType

static_assert(sizeof(QueryType) == sizeof(WGPUQueryType),
              "sizeof mismatch for QueryType");
static_assert(alignof(QueryType) == alignof(WGPUQueryType),
              "alignof mismatch for QueryType");

static_assert(static_cast<uint32_t>(QueryType::Occlusion) ==
                  WGPUQueryType_Occlusion,
              "value mismatch for QueryType::Occlusion");
static_assert(static_cast<uint32_t>(QueryType::Timestamp) ==
                  WGPUQueryType_Timestamp,
              "value mismatch for QueryType::Timestamp");

// QueueWorkDoneStatus

static_assert(sizeof(QueueWorkDoneStatus) == sizeof(WGPUQueueWorkDoneStatus),
              "sizeof mismatch for QueueWorkDoneStatus");
static_assert(alignof(QueueWorkDoneStatus) == alignof(WGPUQueueWorkDoneStatus),
              "alignof mismatch for QueueWorkDoneStatus");

static_assert(static_cast<uint32_t>(QueueWorkDoneStatus::Success) ==
                  WGPUQueueWorkDoneStatus_Success,
              "value mismatch for QueueWorkDoneStatus::Success");
static_assert(static_cast<uint32_t>(QueueWorkDoneStatus::InstanceDropped) ==
                  WGPUQueueWorkDoneStatus_InstanceDropped,
              "value mismatch for QueueWorkDoneStatus::InstanceDropped");
static_assert(static_cast<uint32_t>(QueueWorkDoneStatus::Error) ==
                  WGPUQueueWorkDoneStatus_Error,
              "value mismatch for QueueWorkDoneStatus::Error");
static_assert(static_cast<uint32_t>(QueueWorkDoneStatus::Unknown) ==
                  WGPUQueueWorkDoneStatus_Unknown,
              "value mismatch for QueueWorkDoneStatus::Unknown");
static_assert(static_cast<uint32_t>(QueueWorkDoneStatus::DeviceLost) ==
                  WGPUQueueWorkDoneStatus_DeviceLost,
              "value mismatch for QueueWorkDoneStatus::DeviceLost");

// RequestAdapterStatus

static_assert(sizeof(RequestAdapterStatus) == sizeof(WGPURequestAdapterStatus),
              "sizeof mismatch for RequestAdapterStatus");
static_assert(alignof(RequestAdapterStatus) ==
                  alignof(WGPURequestAdapterStatus),
              "alignof mismatch for RequestAdapterStatus");

static_assert(static_cast<uint32_t>(RequestAdapterStatus::Success) ==
                  WGPURequestAdapterStatus_Success,
              "value mismatch for RequestAdapterStatus::Success");
static_assert(static_cast<uint32_t>(RequestAdapterStatus::InstanceDropped) ==
                  WGPURequestAdapterStatus_InstanceDropped,
              "value mismatch for RequestAdapterStatus::InstanceDropped");
static_assert(static_cast<uint32_t>(RequestAdapterStatus::Unavailable) ==
                  WGPURequestAdapterStatus_Unavailable,
              "value mismatch for RequestAdapterStatus::Unavailable");
static_assert(static_cast<uint32_t>(RequestAdapterStatus::Error) ==
                  WGPURequestAdapterStatus_Error,
              "value mismatch for RequestAdapterStatus::Error");
static_assert(static_cast<uint32_t>(RequestAdapterStatus::Unknown) ==
                  WGPURequestAdapterStatus_Unknown,
              "value mismatch for RequestAdapterStatus::Unknown");

// RequestDeviceStatus

static_assert(sizeof(RequestDeviceStatus) == sizeof(WGPURequestDeviceStatus),
              "sizeof mismatch for RequestDeviceStatus");
static_assert(alignof(RequestDeviceStatus) == alignof(WGPURequestDeviceStatus),
              "alignof mismatch for RequestDeviceStatus");

static_assert(static_cast<uint32_t>(RequestDeviceStatus::Success) ==
                  WGPURequestDeviceStatus_Success,
              "value mismatch for RequestDeviceStatus::Success");
static_assert(static_cast<uint32_t>(RequestDeviceStatus::InstanceDropped) ==
                  WGPURequestDeviceStatus_InstanceDropped,
              "value mismatch for RequestDeviceStatus::InstanceDropped");
static_assert(static_cast<uint32_t>(RequestDeviceStatus::Error) ==
                  WGPURequestDeviceStatus_Error,
              "value mismatch for RequestDeviceStatus::Error");
static_assert(static_cast<uint32_t>(RequestDeviceStatus::Unknown) ==
                  WGPURequestDeviceStatus_Unknown,
              "value mismatch for RequestDeviceStatus::Unknown");

// SType

static_assert(sizeof(SType) == sizeof(WGPUSType), "sizeof mismatch for SType");
static_assert(alignof(SType) == alignof(WGPUSType),
              "alignof mismatch for SType");

static_assert(static_cast<uint32_t>(SType::Invalid) == WGPUSType_Invalid,
              "value mismatch for SType::Invalid");
static_assert(static_cast<uint32_t>(SType::SurfaceDescriptorFromMetalLayer) ==
                  WGPUSType_SurfaceDescriptorFromMetalLayer,
              "value mismatch for SType::SurfaceDescriptorFromMetalLayer");
static_assert(static_cast<uint32_t>(SType::SurfaceDescriptorFromWindowsHWND) ==
                  WGPUSType_SurfaceDescriptorFromWindowsHWND,
              "value mismatch for SType::SurfaceDescriptorFromWindowsHWND");
static_assert(static_cast<uint32_t>(SType::SurfaceDescriptorFromXlibWindow) ==
                  WGPUSType_SurfaceDescriptorFromXlibWindow,
              "value mismatch for SType::SurfaceDescriptorFromXlibWindow");
static_assert(
    static_cast<uint32_t>(SType::SurfaceDescriptorFromCanvasHTMLSelector) ==
        WGPUSType_SurfaceDescriptorFromCanvasHTMLSelector,
    "value mismatch for SType::SurfaceDescriptorFromCanvasHTMLSelector");
static_assert(static_cast<uint32_t>(SType::ShaderModuleSPIRVDescriptor) ==
                  WGPUSType_ShaderModuleSPIRVDescriptor,
              "value mismatch for SType::ShaderModuleSPIRVDescriptor");
static_assert(static_cast<uint32_t>(SType::ShaderModuleWGSLDescriptor) ==
                  WGPUSType_ShaderModuleWGSLDescriptor,
              "value mismatch for SType::ShaderModuleWGSLDescriptor");
static_assert(static_cast<uint32_t>(SType::PrimitiveDepthClipControl) ==
                  WGPUSType_PrimitiveDepthClipControl,
              "value mismatch for SType::PrimitiveDepthClipControl");
static_assert(
    static_cast<uint32_t>(SType::SurfaceDescriptorFromWaylandSurface) ==
        WGPUSType_SurfaceDescriptorFromWaylandSurface,
    "value mismatch for SType::SurfaceDescriptorFromWaylandSurface");
static_assert(
    static_cast<uint32_t>(SType::SurfaceDescriptorFromAndroidNativeWindow) ==
        WGPUSType_SurfaceDescriptorFromAndroidNativeWindow,
    "value mismatch for SType::SurfaceDescriptorFromAndroidNativeWindow");
static_assert(
    static_cast<uint32_t>(SType::SurfaceDescriptorFromWindowsCoreWindow) ==
        WGPUSType_SurfaceDescriptorFromWindowsCoreWindow,
    "value mismatch for SType::SurfaceDescriptorFromWindowsCoreWindow");
static_assert(static_cast<uint32_t>(SType::ExternalTextureBindingEntry) ==
                  WGPUSType_ExternalTextureBindingEntry,
              "value mismatch for SType::ExternalTextureBindingEntry");
static_assert(static_cast<uint32_t>(SType::ExternalTextureBindingLayout) ==
                  WGPUSType_ExternalTextureBindingLayout,
              "value mismatch for SType::ExternalTextureBindingLayout");
static_assert(
    static_cast<uint32_t>(SType::SurfaceDescriptorFromWindowsSwapChainPanel) ==
        WGPUSType_SurfaceDescriptorFromWindowsSwapChainPanel,
    "value mismatch for SType::SurfaceDescriptorFromWindowsSwapChainPanel");
static_assert(static_cast<uint32_t>(SType::RenderPassDescriptorMaxDrawCount) ==
                  WGPUSType_RenderPassDescriptorMaxDrawCount,
              "value mismatch for SType::RenderPassDescriptorMaxDrawCount");
static_assert(
    static_cast<uint32_t>(SType::DepthStencilStateDepthWriteDefinedDawn) ==
        WGPUSType_DepthStencilStateDepthWriteDefinedDawn,
    "value mismatch for SType::DepthStencilStateDepthWriteDefinedDawn");
static_assert(
    static_cast<uint32_t>(SType::TextureBindingViewDimensionDescriptor) ==
        WGPUSType_TextureBindingViewDimensionDescriptor,
    "value mismatch for SType::TextureBindingViewDimensionDescriptor");
static_assert(
    static_cast<uint32_t>(SType::DawnTextureInternalUsageDescriptor) ==
        WGPUSType_DawnTextureInternalUsageDescriptor,
    "value mismatch for SType::DawnTextureInternalUsageDescriptor");
static_assert(
    static_cast<uint32_t>(SType::DawnEncoderInternalUsageDescriptor) ==
        WGPUSType_DawnEncoderInternalUsageDescriptor,
    "value mismatch for SType::DawnEncoderInternalUsageDescriptor");
static_assert(static_cast<uint32_t>(SType::DawnInstanceDescriptor) ==
                  WGPUSType_DawnInstanceDescriptor,
              "value mismatch for SType::DawnInstanceDescriptor");
static_assert(static_cast<uint32_t>(SType::DawnCacheDeviceDescriptor) ==
                  WGPUSType_DawnCacheDeviceDescriptor,
              "value mismatch for SType::DawnCacheDeviceDescriptor");
static_assert(
    static_cast<uint32_t>(SType::DawnAdapterPropertiesPowerPreference) ==
        WGPUSType_DawnAdapterPropertiesPowerPreference,
    "value mismatch for SType::DawnAdapterPropertiesPowerPreference");
static_assert(
    static_cast<uint32_t>(SType::DawnBufferDescriptorErrorInfoFromWireClient) ==
        WGPUSType_DawnBufferDescriptorErrorInfoFromWireClient,
    "value mismatch for SType::DawnBufferDescriptorErrorInfoFromWireClient");
static_assert(static_cast<uint32_t>(SType::DawnTogglesDescriptor) ==
                  WGPUSType_DawnTogglesDescriptor,
              "value mismatch for SType::DawnTogglesDescriptor");
static_assert(
    static_cast<uint32_t>(SType::DawnShaderModuleSPIRVOptionsDescriptor) ==
        WGPUSType_DawnShaderModuleSPIRVOptionsDescriptor,
    "value mismatch for SType::DawnShaderModuleSPIRVOptionsDescriptor");
static_assert(static_cast<uint32_t>(SType::RequestAdapterOptionsLUID) ==
                  WGPUSType_RequestAdapterOptionsLUID,
              "value mismatch for SType::RequestAdapterOptionsLUID");
static_assert(static_cast<uint32_t>(SType::RequestAdapterOptionsGetGLProc) ==
                  WGPUSType_RequestAdapterOptionsGetGLProc,
              "value mismatch for SType::RequestAdapterOptionsGetGLProc");
static_assert(static_cast<uint32_t>(SType::RequestAdapterOptionsD3D11Device) ==
                  WGPUSType_RequestAdapterOptionsD3D11Device,
              "value mismatch for SType::RequestAdapterOptionsD3D11Device");
static_assert(
    static_cast<uint32_t>(SType::DawnMultisampleStateRenderToSingleSampled) ==
        WGPUSType_DawnMultisampleStateRenderToSingleSampled,
    "value mismatch for SType::DawnMultisampleStateRenderToSingleSampled");
static_assert(static_cast<uint32_t>(
                  SType::DawnRenderPassColorAttachmentRenderToSingleSampled) ==
                  WGPUSType_DawnRenderPassColorAttachmentRenderToSingleSampled,
              "value mismatch for "
              "SType::DawnRenderPassColorAttachmentRenderToSingleSampled");
static_assert(static_cast<uint32_t>(SType::RenderPassPixelLocalStorage) ==
                  WGPUSType_RenderPassPixelLocalStorage,
              "value mismatch for SType::RenderPassPixelLocalStorage");
static_assert(static_cast<uint32_t>(SType::PipelineLayoutPixelLocalStorage) ==
                  WGPUSType_PipelineLayoutPixelLocalStorage,
              "value mismatch for SType::PipelineLayoutPixelLocalStorage");
static_assert(static_cast<uint32_t>(SType::BufferHostMappedPointer) ==
                  WGPUSType_BufferHostMappedPointer,
              "value mismatch for SType::BufferHostMappedPointer");
static_assert(static_cast<uint32_t>(SType::DawnExperimentalSubgroupLimits) ==
                  WGPUSType_DawnExperimentalSubgroupLimits,
              "value mismatch for SType::DawnExperimentalSubgroupLimits");
static_assert(static_cast<uint32_t>(SType::AdapterPropertiesMemoryHeaps) ==
                  WGPUSType_AdapterPropertiesMemoryHeaps,
              "value mismatch for SType::AdapterPropertiesMemoryHeaps");
static_assert(static_cast<uint32_t>(SType::AdapterPropertiesD3D) ==
                  WGPUSType_AdapterPropertiesD3D,
              "value mismatch for SType::AdapterPropertiesD3D");
static_assert(static_cast<uint32_t>(SType::AdapterPropertiesVk) ==
                  WGPUSType_AdapterPropertiesVk,
              "value mismatch for SType::AdapterPropertiesVk");
static_assert(static_cast<uint32_t>(SType::DawnComputePipelineFullSubgroups) ==
                  WGPUSType_DawnComputePipelineFullSubgroups,
              "value mismatch for SType::DawnComputePipelineFullSubgroups");
static_assert(static_cast<uint32_t>(SType::DawnWireWGSLControl) ==
                  WGPUSType_DawnWireWGSLControl,
              "value mismatch for SType::DawnWireWGSLControl");
static_assert(static_cast<uint32_t>(SType::DawnWGSLBlocklist) ==
                  WGPUSType_DawnWGSLBlocklist,
              "value mismatch for SType::DawnWGSLBlocklist");
static_assert(static_cast<uint32_t>(SType::DrmFormatCapabilities) ==
                  WGPUSType_DrmFormatCapabilities,
              "value mismatch for SType::DrmFormatCapabilities");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryVkImageDescriptor) ==
        WGPUSType_SharedTextureMemoryVkImageDescriptor,
    "value mismatch for SType::SharedTextureMemoryVkImageDescriptor");
static_assert(static_cast<uint32_t>(
                  SType::SharedTextureMemoryVkDedicatedAllocationDescriptor) ==
                  WGPUSType_SharedTextureMemoryVkDedicatedAllocationDescriptor,
              "value mismatch for "
              "SType::SharedTextureMemoryVkDedicatedAllocationDescriptor");
static_assert(
    static_cast<uint32_t>(
        SType::SharedTextureMemoryAHardwareBufferDescriptor) ==
        WGPUSType_SharedTextureMemoryAHardwareBufferDescriptor,
    "value mismatch for SType::SharedTextureMemoryAHardwareBufferDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryDmaBufDescriptor) ==
        WGPUSType_SharedTextureMemoryDmaBufDescriptor,
    "value mismatch for SType::SharedTextureMemoryDmaBufDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryOpaqueFDDescriptor) ==
        WGPUSType_SharedTextureMemoryOpaqueFDDescriptor,
    "value mismatch for SType::SharedTextureMemoryOpaqueFDDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryZirconHandleDescriptor) ==
        WGPUSType_SharedTextureMemoryZirconHandleDescriptor,
    "value mismatch for SType::SharedTextureMemoryZirconHandleDescriptor");
static_assert(
    static_cast<uint32_t>(
        SType::SharedTextureMemoryDXGISharedHandleDescriptor) ==
        WGPUSType_SharedTextureMemoryDXGISharedHandleDescriptor,
    "value mismatch for SType::SharedTextureMemoryDXGISharedHandleDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryD3D11Texture2DDescriptor) ==
        WGPUSType_SharedTextureMemoryD3D11Texture2DDescriptor,
    "value mismatch for SType::SharedTextureMemoryD3D11Texture2DDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryIOSurfaceDescriptor) ==
        WGPUSType_SharedTextureMemoryIOSurfaceDescriptor,
    "value mismatch for SType::SharedTextureMemoryIOSurfaceDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryEGLImageDescriptor) ==
        WGPUSType_SharedTextureMemoryEGLImageDescriptor,
    "value mismatch for SType::SharedTextureMemoryEGLImageDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryInitializedBeginState) ==
        WGPUSType_SharedTextureMemoryInitializedBeginState,
    "value mismatch for SType::SharedTextureMemoryInitializedBeginState");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryInitializedEndState) ==
        WGPUSType_SharedTextureMemoryInitializedEndState,
    "value mismatch for SType::SharedTextureMemoryInitializedEndState");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryVkImageLayoutBeginState) ==
        WGPUSType_SharedTextureMemoryVkImageLayoutBeginState,
    "value mismatch for SType::SharedTextureMemoryVkImageLayoutBeginState");
static_assert(
    static_cast<uint32_t>(SType::SharedTextureMemoryVkImageLayoutEndState) ==
        WGPUSType_SharedTextureMemoryVkImageLayoutEndState,
    "value mismatch for SType::SharedTextureMemoryVkImageLayoutEndState");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceVkSemaphoreOpaqueFDDescriptor) ==
        WGPUSType_SharedFenceVkSemaphoreOpaqueFDDescriptor,
    "value mismatch for SType::SharedFenceVkSemaphoreOpaqueFDDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceVkSemaphoreOpaqueFDExportInfo) ==
        WGPUSType_SharedFenceVkSemaphoreOpaqueFDExportInfo,
    "value mismatch for SType::SharedFenceVkSemaphoreOpaqueFDExportInfo");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceVkSemaphoreSyncFDDescriptor) ==
        WGPUSType_SharedFenceVkSemaphoreSyncFDDescriptor,
    "value mismatch for SType::SharedFenceVkSemaphoreSyncFDDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceVkSemaphoreSyncFDExportInfo) ==
        WGPUSType_SharedFenceVkSemaphoreSyncFDExportInfo,
    "value mismatch for SType::SharedFenceVkSemaphoreSyncFDExportInfo");
static_assert(
    static_cast<uint32_t>(
        SType::SharedFenceVkSemaphoreZirconHandleDescriptor) ==
        WGPUSType_SharedFenceVkSemaphoreZirconHandleDescriptor,
    "value mismatch for SType::SharedFenceVkSemaphoreZirconHandleDescriptor");
static_assert(
    static_cast<uint32_t>(
        SType::SharedFenceVkSemaphoreZirconHandleExportInfo) ==
        WGPUSType_SharedFenceVkSemaphoreZirconHandleExportInfo,
    "value mismatch for SType::SharedFenceVkSemaphoreZirconHandleExportInfo");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceDXGISharedHandleDescriptor) ==
        WGPUSType_SharedFenceDXGISharedHandleDescriptor,
    "value mismatch for SType::SharedFenceDXGISharedHandleDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceDXGISharedHandleExportInfo) ==
        WGPUSType_SharedFenceDXGISharedHandleExportInfo,
    "value mismatch for SType::SharedFenceDXGISharedHandleExportInfo");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceMTLSharedEventDescriptor) ==
        WGPUSType_SharedFenceMTLSharedEventDescriptor,
    "value mismatch for SType::SharedFenceMTLSharedEventDescriptor");
static_assert(
    static_cast<uint32_t>(SType::SharedFenceMTLSharedEventExportInfo) ==
        WGPUSType_SharedFenceMTLSharedEventExportInfo,
    "value mismatch for SType::SharedFenceMTLSharedEventExportInfo");
static_assert(
    static_cast<uint32_t>(SType::SharedBufferMemoryD3D12ResourceDescriptor) ==
        WGPUSType_SharedBufferMemoryD3D12ResourceDescriptor,
    "value mismatch for SType::SharedBufferMemoryD3D12ResourceDescriptor");
static_assert(static_cast<uint32_t>(SType::StaticSamplerBindingLayout) ==
                  WGPUSType_StaticSamplerBindingLayout,
              "value mismatch for SType::StaticSamplerBindingLayout");

// SamplerBindingType

static_assert(sizeof(SamplerBindingType) == sizeof(WGPUSamplerBindingType),
              "sizeof mismatch for SamplerBindingType");
static_assert(alignof(SamplerBindingType) == alignof(WGPUSamplerBindingType),
              "alignof mismatch for SamplerBindingType");

static_assert(static_cast<uint32_t>(SamplerBindingType::Undefined) ==
                  WGPUSamplerBindingType_Undefined,
              "value mismatch for SamplerBindingType::Undefined");
static_assert(static_cast<uint32_t>(SamplerBindingType::Filtering) ==
                  WGPUSamplerBindingType_Filtering,
              "value mismatch for SamplerBindingType::Filtering");
static_assert(static_cast<uint32_t>(SamplerBindingType::NonFiltering) ==
                  WGPUSamplerBindingType_NonFiltering,
              "value mismatch for SamplerBindingType::NonFiltering");
static_assert(static_cast<uint32_t>(SamplerBindingType::Comparison) ==
                  WGPUSamplerBindingType_Comparison,
              "value mismatch for SamplerBindingType::Comparison");

// SharedFenceType

static_assert(sizeof(SharedFenceType) == sizeof(WGPUSharedFenceType),
              "sizeof mismatch for SharedFenceType");
static_assert(alignof(SharedFenceType) == alignof(WGPUSharedFenceType),
              "alignof mismatch for SharedFenceType");

static_assert(static_cast<uint32_t>(SharedFenceType::Undefined) ==
                  WGPUSharedFenceType_Undefined,
              "value mismatch for SharedFenceType::Undefined");
static_assert(static_cast<uint32_t>(SharedFenceType::VkSemaphoreOpaqueFD) ==
                  WGPUSharedFenceType_VkSemaphoreOpaqueFD,
              "value mismatch for SharedFenceType::VkSemaphoreOpaqueFD");
static_assert(static_cast<uint32_t>(SharedFenceType::VkSemaphoreSyncFD) ==
                  WGPUSharedFenceType_VkSemaphoreSyncFD,
              "value mismatch for SharedFenceType::VkSemaphoreSyncFD");
static_assert(static_cast<uint32_t>(SharedFenceType::VkSemaphoreZirconHandle) ==
                  WGPUSharedFenceType_VkSemaphoreZirconHandle,
              "value mismatch for SharedFenceType::VkSemaphoreZirconHandle");
static_assert(static_cast<uint32_t>(SharedFenceType::DXGISharedHandle) ==
                  WGPUSharedFenceType_DXGISharedHandle,
              "value mismatch for SharedFenceType::DXGISharedHandle");
static_assert(static_cast<uint32_t>(SharedFenceType::MTLSharedEvent) ==
                  WGPUSharedFenceType_MTLSharedEvent,
              "value mismatch for SharedFenceType::MTLSharedEvent");

// StencilOperation

static_assert(sizeof(StencilOperation) == sizeof(WGPUStencilOperation),
              "sizeof mismatch for StencilOperation");
static_assert(alignof(StencilOperation) == alignof(WGPUStencilOperation),
              "alignof mismatch for StencilOperation");

static_assert(static_cast<uint32_t>(StencilOperation::Undefined) ==
                  WGPUStencilOperation_Undefined,
              "value mismatch for StencilOperation::Undefined");
static_assert(static_cast<uint32_t>(StencilOperation::Keep) ==
                  WGPUStencilOperation_Keep,
              "value mismatch for StencilOperation::Keep");
static_assert(static_cast<uint32_t>(StencilOperation::Zero) ==
                  WGPUStencilOperation_Zero,
              "value mismatch for StencilOperation::Zero");
static_assert(static_cast<uint32_t>(StencilOperation::Replace) ==
                  WGPUStencilOperation_Replace,
              "value mismatch for StencilOperation::Replace");
static_assert(static_cast<uint32_t>(StencilOperation::Invert) ==
                  WGPUStencilOperation_Invert,
              "value mismatch for StencilOperation::Invert");
static_assert(static_cast<uint32_t>(StencilOperation::IncrementClamp) ==
                  WGPUStencilOperation_IncrementClamp,
              "value mismatch for StencilOperation::IncrementClamp");
static_assert(static_cast<uint32_t>(StencilOperation::DecrementClamp) ==
                  WGPUStencilOperation_DecrementClamp,
              "value mismatch for StencilOperation::DecrementClamp");
static_assert(static_cast<uint32_t>(StencilOperation::IncrementWrap) ==
                  WGPUStencilOperation_IncrementWrap,
              "value mismatch for StencilOperation::IncrementWrap");
static_assert(static_cast<uint32_t>(StencilOperation::DecrementWrap) ==
                  WGPUStencilOperation_DecrementWrap,
              "value mismatch for StencilOperation::DecrementWrap");

// StorageTextureAccess

static_assert(sizeof(StorageTextureAccess) == sizeof(WGPUStorageTextureAccess),
              "sizeof mismatch for StorageTextureAccess");
static_assert(alignof(StorageTextureAccess) ==
                  alignof(WGPUStorageTextureAccess),
              "alignof mismatch for StorageTextureAccess");

static_assert(static_cast<uint32_t>(StorageTextureAccess::Undefined) ==
                  WGPUStorageTextureAccess_Undefined,
              "value mismatch for StorageTextureAccess::Undefined");
static_assert(static_cast<uint32_t>(StorageTextureAccess::WriteOnly) ==
                  WGPUStorageTextureAccess_WriteOnly,
              "value mismatch for StorageTextureAccess::WriteOnly");
static_assert(static_cast<uint32_t>(StorageTextureAccess::ReadOnly) ==
                  WGPUStorageTextureAccess_ReadOnly,
              "value mismatch for StorageTextureAccess::ReadOnly");
static_assert(static_cast<uint32_t>(StorageTextureAccess::ReadWrite) ==
                  WGPUStorageTextureAccess_ReadWrite,
              "value mismatch for StorageTextureAccess::ReadWrite");

// StoreOp

static_assert(sizeof(StoreOp) == sizeof(WGPUStoreOp),
              "sizeof mismatch for StoreOp");
static_assert(alignof(StoreOp) == alignof(WGPUStoreOp),
              "alignof mismatch for StoreOp");

static_assert(static_cast<uint32_t>(StoreOp::Undefined) ==
                  WGPUStoreOp_Undefined,
              "value mismatch for StoreOp::Undefined");
static_assert(static_cast<uint32_t>(StoreOp::Store) == WGPUStoreOp_Store,
              "value mismatch for StoreOp::Store");
static_assert(static_cast<uint32_t>(StoreOp::Discard) == WGPUStoreOp_Discard,
              "value mismatch for StoreOp::Discard");

// TextureAspect

static_assert(sizeof(TextureAspect) == sizeof(WGPUTextureAspect),
              "sizeof mismatch for TextureAspect");
static_assert(alignof(TextureAspect) == alignof(WGPUTextureAspect),
              "alignof mismatch for TextureAspect");

static_assert(static_cast<uint32_t>(TextureAspect::Undefined) ==
                  WGPUTextureAspect_Undefined,
              "value mismatch for TextureAspect::Undefined");
static_assert(static_cast<uint32_t>(TextureAspect::All) ==
                  WGPUTextureAspect_All,
              "value mismatch for TextureAspect::All");
static_assert(static_cast<uint32_t>(TextureAspect::StencilOnly) ==
                  WGPUTextureAspect_StencilOnly,
              "value mismatch for TextureAspect::StencilOnly");
static_assert(static_cast<uint32_t>(TextureAspect::DepthOnly) ==
                  WGPUTextureAspect_DepthOnly,
              "value mismatch for TextureAspect::DepthOnly");
static_assert(static_cast<uint32_t>(TextureAspect::Plane0Only) ==
                  WGPUTextureAspect_Plane0Only,
              "value mismatch for TextureAspect::Plane0Only");
static_assert(static_cast<uint32_t>(TextureAspect::Plane1Only) ==
                  WGPUTextureAspect_Plane1Only,
              "value mismatch for TextureAspect::Plane1Only");
static_assert(static_cast<uint32_t>(TextureAspect::Plane2Only) ==
                  WGPUTextureAspect_Plane2Only,
              "value mismatch for TextureAspect::Plane2Only");

// TextureDimension

static_assert(sizeof(TextureDimension) == sizeof(WGPUTextureDimension),
              "sizeof mismatch for TextureDimension");
static_assert(alignof(TextureDimension) == alignof(WGPUTextureDimension),
              "alignof mismatch for TextureDimension");

static_assert(static_cast<uint32_t>(TextureDimension::Undefined) ==
                  WGPUTextureDimension_Undefined,
              "value mismatch for TextureDimension::Undefined");
static_assert(static_cast<uint32_t>(TextureDimension::e1D) ==
                  WGPUTextureDimension_1D,
              "value mismatch for TextureDimension::e1D");
static_assert(static_cast<uint32_t>(TextureDimension::e2D) ==
                  WGPUTextureDimension_2D,
              "value mismatch for TextureDimension::e2D");
static_assert(static_cast<uint32_t>(TextureDimension::e3D) ==
                  WGPUTextureDimension_3D,
              "value mismatch for TextureDimension::e3D");

// TextureFormat

static_assert(sizeof(TextureFormat) == sizeof(WGPUTextureFormat),
              "sizeof mismatch for TextureFormat");
static_assert(alignof(TextureFormat) == alignof(WGPUTextureFormat),
              "alignof mismatch for TextureFormat");

static_assert(static_cast<uint32_t>(TextureFormat::Undefined) ==
                  WGPUTextureFormat_Undefined,
              "value mismatch for TextureFormat::Undefined");
static_assert(static_cast<uint32_t>(TextureFormat::R8Unorm) ==
                  WGPUTextureFormat_R8Unorm,
              "value mismatch for TextureFormat::R8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::R8Snorm) ==
                  WGPUTextureFormat_R8Snorm,
              "value mismatch for TextureFormat::R8Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::R8Uint) ==
                  WGPUTextureFormat_R8Uint,
              "value mismatch for TextureFormat::R8Uint");
static_assert(static_cast<uint32_t>(TextureFormat::R8Sint) ==
                  WGPUTextureFormat_R8Sint,
              "value mismatch for TextureFormat::R8Sint");
static_assert(static_cast<uint32_t>(TextureFormat::R16Uint) ==
                  WGPUTextureFormat_R16Uint,
              "value mismatch for TextureFormat::R16Uint");
static_assert(static_cast<uint32_t>(TextureFormat::R16Sint) ==
                  WGPUTextureFormat_R16Sint,
              "value mismatch for TextureFormat::R16Sint");
static_assert(static_cast<uint32_t>(TextureFormat::R16Float) ==
                  WGPUTextureFormat_R16Float,
              "value mismatch for TextureFormat::R16Float");
static_assert(static_cast<uint32_t>(TextureFormat::RG8Unorm) ==
                  WGPUTextureFormat_RG8Unorm,
              "value mismatch for TextureFormat::RG8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::RG8Snorm) ==
                  WGPUTextureFormat_RG8Snorm,
              "value mismatch for TextureFormat::RG8Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::RG8Uint) ==
                  WGPUTextureFormat_RG8Uint,
              "value mismatch for TextureFormat::RG8Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RG8Sint) ==
                  WGPUTextureFormat_RG8Sint,
              "value mismatch for TextureFormat::RG8Sint");
static_assert(static_cast<uint32_t>(TextureFormat::R32Float) ==
                  WGPUTextureFormat_R32Float,
              "value mismatch for TextureFormat::R32Float");
static_assert(static_cast<uint32_t>(TextureFormat::R32Uint) ==
                  WGPUTextureFormat_R32Uint,
              "value mismatch for TextureFormat::R32Uint");
static_assert(static_cast<uint32_t>(TextureFormat::R32Sint) ==
                  WGPUTextureFormat_R32Sint,
              "value mismatch for TextureFormat::R32Sint");
static_assert(static_cast<uint32_t>(TextureFormat::RG16Uint) ==
                  WGPUTextureFormat_RG16Uint,
              "value mismatch for TextureFormat::RG16Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RG16Sint) ==
                  WGPUTextureFormat_RG16Sint,
              "value mismatch for TextureFormat::RG16Sint");
static_assert(static_cast<uint32_t>(TextureFormat::RG16Float) ==
                  WGPUTextureFormat_RG16Float,
              "value mismatch for TextureFormat::RG16Float");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA8Unorm) ==
                  WGPUTextureFormat_RGBA8Unorm,
              "value mismatch for TextureFormat::RGBA8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA8UnormSrgb) ==
                  WGPUTextureFormat_RGBA8UnormSrgb,
              "value mismatch for TextureFormat::RGBA8UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA8Snorm) ==
                  WGPUTextureFormat_RGBA8Snorm,
              "value mismatch for TextureFormat::RGBA8Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA8Uint) ==
                  WGPUTextureFormat_RGBA8Uint,
              "value mismatch for TextureFormat::RGBA8Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA8Sint) ==
                  WGPUTextureFormat_RGBA8Sint,
              "value mismatch for TextureFormat::RGBA8Sint");
static_assert(static_cast<uint32_t>(TextureFormat::BGRA8Unorm) ==
                  WGPUTextureFormat_BGRA8Unorm,
              "value mismatch for TextureFormat::BGRA8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::BGRA8UnormSrgb) ==
                  WGPUTextureFormat_BGRA8UnormSrgb,
              "value mismatch for TextureFormat::BGRA8UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::RGB10A2Uint) ==
                  WGPUTextureFormat_RGB10A2Uint,
              "value mismatch for TextureFormat::RGB10A2Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RGB10A2Unorm) ==
                  WGPUTextureFormat_RGB10A2Unorm,
              "value mismatch for TextureFormat::RGB10A2Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::RG11B10Ufloat) ==
                  WGPUTextureFormat_RG11B10Ufloat,
              "value mismatch for TextureFormat::RG11B10Ufloat");
static_assert(static_cast<uint32_t>(TextureFormat::RGB9E5Ufloat) ==
                  WGPUTextureFormat_RGB9E5Ufloat,
              "value mismatch for TextureFormat::RGB9E5Ufloat");
static_assert(static_cast<uint32_t>(TextureFormat::RG32Float) ==
                  WGPUTextureFormat_RG32Float,
              "value mismatch for TextureFormat::RG32Float");
static_assert(static_cast<uint32_t>(TextureFormat::RG32Uint) ==
                  WGPUTextureFormat_RG32Uint,
              "value mismatch for TextureFormat::RG32Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RG32Sint) ==
                  WGPUTextureFormat_RG32Sint,
              "value mismatch for TextureFormat::RG32Sint");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA16Uint) ==
                  WGPUTextureFormat_RGBA16Uint,
              "value mismatch for TextureFormat::RGBA16Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA16Sint) ==
                  WGPUTextureFormat_RGBA16Sint,
              "value mismatch for TextureFormat::RGBA16Sint");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA16Float) ==
                  WGPUTextureFormat_RGBA16Float,
              "value mismatch for TextureFormat::RGBA16Float");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA32Float) ==
                  WGPUTextureFormat_RGBA32Float,
              "value mismatch for TextureFormat::RGBA32Float");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA32Uint) ==
                  WGPUTextureFormat_RGBA32Uint,
              "value mismatch for TextureFormat::RGBA32Uint");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA32Sint) ==
                  WGPUTextureFormat_RGBA32Sint,
              "value mismatch for TextureFormat::RGBA32Sint");
static_assert(static_cast<uint32_t>(TextureFormat::Stencil8) ==
                  WGPUTextureFormat_Stencil8,
              "value mismatch for TextureFormat::Stencil8");
static_assert(static_cast<uint32_t>(TextureFormat::Depth16Unorm) ==
                  WGPUTextureFormat_Depth16Unorm,
              "value mismatch for TextureFormat::Depth16Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::Depth24Plus) ==
                  WGPUTextureFormat_Depth24Plus,
              "value mismatch for TextureFormat::Depth24Plus");
static_assert(static_cast<uint32_t>(TextureFormat::Depth24PlusStencil8) ==
                  WGPUTextureFormat_Depth24PlusStencil8,
              "value mismatch for TextureFormat::Depth24PlusStencil8");
static_assert(static_cast<uint32_t>(TextureFormat::Depth32Float) ==
                  WGPUTextureFormat_Depth32Float,
              "value mismatch for TextureFormat::Depth32Float");
static_assert(static_cast<uint32_t>(TextureFormat::Depth32FloatStencil8) ==
                  WGPUTextureFormat_Depth32FloatStencil8,
              "value mismatch for TextureFormat::Depth32FloatStencil8");
static_assert(static_cast<uint32_t>(TextureFormat::BC1RGBAUnorm) ==
                  WGPUTextureFormat_BC1RGBAUnorm,
              "value mismatch for TextureFormat::BC1RGBAUnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC1RGBAUnormSrgb) ==
                  WGPUTextureFormat_BC1RGBAUnormSrgb,
              "value mismatch for TextureFormat::BC1RGBAUnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::BC2RGBAUnorm) ==
                  WGPUTextureFormat_BC2RGBAUnorm,
              "value mismatch for TextureFormat::BC2RGBAUnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC2RGBAUnormSrgb) ==
                  WGPUTextureFormat_BC2RGBAUnormSrgb,
              "value mismatch for TextureFormat::BC2RGBAUnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::BC3RGBAUnorm) ==
                  WGPUTextureFormat_BC3RGBAUnorm,
              "value mismatch for TextureFormat::BC3RGBAUnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC3RGBAUnormSrgb) ==
                  WGPUTextureFormat_BC3RGBAUnormSrgb,
              "value mismatch for TextureFormat::BC3RGBAUnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::BC4RUnorm) ==
                  WGPUTextureFormat_BC4RUnorm,
              "value mismatch for TextureFormat::BC4RUnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC4RSnorm) ==
                  WGPUTextureFormat_BC4RSnorm,
              "value mismatch for TextureFormat::BC4RSnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC5RGUnorm) ==
                  WGPUTextureFormat_BC5RGUnorm,
              "value mismatch for TextureFormat::BC5RGUnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC5RGSnorm) ==
                  WGPUTextureFormat_BC5RGSnorm,
              "value mismatch for TextureFormat::BC5RGSnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC6HRGBUfloat) ==
                  WGPUTextureFormat_BC6HRGBUfloat,
              "value mismatch for TextureFormat::BC6HRGBUfloat");
static_assert(static_cast<uint32_t>(TextureFormat::BC6HRGBFloat) ==
                  WGPUTextureFormat_BC6HRGBFloat,
              "value mismatch for TextureFormat::BC6HRGBFloat");
static_assert(static_cast<uint32_t>(TextureFormat::BC7RGBAUnorm) ==
                  WGPUTextureFormat_BC7RGBAUnorm,
              "value mismatch for TextureFormat::BC7RGBAUnorm");
static_assert(static_cast<uint32_t>(TextureFormat::BC7RGBAUnormSrgb) ==
                  WGPUTextureFormat_BC7RGBAUnormSrgb,
              "value mismatch for TextureFormat::BC7RGBAUnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ETC2RGB8Unorm) ==
                  WGPUTextureFormat_ETC2RGB8Unorm,
              "value mismatch for TextureFormat::ETC2RGB8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ETC2RGB8UnormSrgb) ==
                  WGPUTextureFormat_ETC2RGB8UnormSrgb,
              "value mismatch for TextureFormat::ETC2RGB8UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ETC2RGB8A1Unorm) ==
                  WGPUTextureFormat_ETC2RGB8A1Unorm,
              "value mismatch for TextureFormat::ETC2RGB8A1Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ETC2RGB8A1UnormSrgb) ==
                  WGPUTextureFormat_ETC2RGB8A1UnormSrgb,
              "value mismatch for TextureFormat::ETC2RGB8A1UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ETC2RGBA8Unorm) ==
                  WGPUTextureFormat_ETC2RGBA8Unorm,
              "value mismatch for TextureFormat::ETC2RGBA8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ETC2RGBA8UnormSrgb) ==
                  WGPUTextureFormat_ETC2RGBA8UnormSrgb,
              "value mismatch for TextureFormat::ETC2RGBA8UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::EACR11Unorm) ==
                  WGPUTextureFormat_EACR11Unorm,
              "value mismatch for TextureFormat::EACR11Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::EACR11Snorm) ==
                  WGPUTextureFormat_EACR11Snorm,
              "value mismatch for TextureFormat::EACR11Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::EACRG11Unorm) ==
                  WGPUTextureFormat_EACRG11Unorm,
              "value mismatch for TextureFormat::EACRG11Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::EACRG11Snorm) ==
                  WGPUTextureFormat_EACRG11Snorm,
              "value mismatch for TextureFormat::EACRG11Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC4x4Unorm) ==
                  WGPUTextureFormat_ASTC4x4Unorm,
              "value mismatch for TextureFormat::ASTC4x4Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC4x4UnormSrgb) ==
                  WGPUTextureFormat_ASTC4x4UnormSrgb,
              "value mismatch for TextureFormat::ASTC4x4UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC5x4Unorm) ==
                  WGPUTextureFormat_ASTC5x4Unorm,
              "value mismatch for TextureFormat::ASTC5x4Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC5x4UnormSrgb) ==
                  WGPUTextureFormat_ASTC5x4UnormSrgb,
              "value mismatch for TextureFormat::ASTC5x4UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC5x5Unorm) ==
                  WGPUTextureFormat_ASTC5x5Unorm,
              "value mismatch for TextureFormat::ASTC5x5Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC5x5UnormSrgb) ==
                  WGPUTextureFormat_ASTC5x5UnormSrgb,
              "value mismatch for TextureFormat::ASTC5x5UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC6x5Unorm) ==
                  WGPUTextureFormat_ASTC6x5Unorm,
              "value mismatch for TextureFormat::ASTC6x5Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC6x5UnormSrgb) ==
                  WGPUTextureFormat_ASTC6x5UnormSrgb,
              "value mismatch for TextureFormat::ASTC6x5UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC6x6Unorm) ==
                  WGPUTextureFormat_ASTC6x6Unorm,
              "value mismatch for TextureFormat::ASTC6x6Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC6x6UnormSrgb) ==
                  WGPUTextureFormat_ASTC6x6UnormSrgb,
              "value mismatch for TextureFormat::ASTC6x6UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC8x5Unorm) ==
                  WGPUTextureFormat_ASTC8x5Unorm,
              "value mismatch for TextureFormat::ASTC8x5Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC8x5UnormSrgb) ==
                  WGPUTextureFormat_ASTC8x5UnormSrgb,
              "value mismatch for TextureFormat::ASTC8x5UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC8x6Unorm) ==
                  WGPUTextureFormat_ASTC8x6Unorm,
              "value mismatch for TextureFormat::ASTC8x6Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC8x6UnormSrgb) ==
                  WGPUTextureFormat_ASTC8x6UnormSrgb,
              "value mismatch for TextureFormat::ASTC8x6UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC8x8Unorm) ==
                  WGPUTextureFormat_ASTC8x8Unorm,
              "value mismatch for TextureFormat::ASTC8x8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC8x8UnormSrgb) ==
                  WGPUTextureFormat_ASTC8x8UnormSrgb,
              "value mismatch for TextureFormat::ASTC8x8UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x5Unorm) ==
                  WGPUTextureFormat_ASTC10x5Unorm,
              "value mismatch for TextureFormat::ASTC10x5Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x5UnormSrgb) ==
                  WGPUTextureFormat_ASTC10x5UnormSrgb,
              "value mismatch for TextureFormat::ASTC10x5UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x6Unorm) ==
                  WGPUTextureFormat_ASTC10x6Unorm,
              "value mismatch for TextureFormat::ASTC10x6Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x6UnormSrgb) ==
                  WGPUTextureFormat_ASTC10x6UnormSrgb,
              "value mismatch for TextureFormat::ASTC10x6UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x8Unorm) ==
                  WGPUTextureFormat_ASTC10x8Unorm,
              "value mismatch for TextureFormat::ASTC10x8Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x8UnormSrgb) ==
                  WGPUTextureFormat_ASTC10x8UnormSrgb,
              "value mismatch for TextureFormat::ASTC10x8UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x10Unorm) ==
                  WGPUTextureFormat_ASTC10x10Unorm,
              "value mismatch for TextureFormat::ASTC10x10Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC10x10UnormSrgb) ==
                  WGPUTextureFormat_ASTC10x10UnormSrgb,
              "value mismatch for TextureFormat::ASTC10x10UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC12x10Unorm) ==
                  WGPUTextureFormat_ASTC12x10Unorm,
              "value mismatch for TextureFormat::ASTC12x10Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC12x10UnormSrgb) ==
                  WGPUTextureFormat_ASTC12x10UnormSrgb,
              "value mismatch for TextureFormat::ASTC12x10UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC12x12Unorm) ==
                  WGPUTextureFormat_ASTC12x12Unorm,
              "value mismatch for TextureFormat::ASTC12x12Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::ASTC12x12UnormSrgb) ==
                  WGPUTextureFormat_ASTC12x12UnormSrgb,
              "value mismatch for TextureFormat::ASTC12x12UnormSrgb");
static_assert(static_cast<uint32_t>(TextureFormat::R16Unorm) ==
                  WGPUTextureFormat_R16Unorm,
              "value mismatch for TextureFormat::R16Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::RG16Unorm) ==
                  WGPUTextureFormat_RG16Unorm,
              "value mismatch for TextureFormat::RG16Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA16Unorm) ==
                  WGPUTextureFormat_RGBA16Unorm,
              "value mismatch for TextureFormat::RGBA16Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::R16Snorm) ==
                  WGPUTextureFormat_R16Snorm,
              "value mismatch for TextureFormat::R16Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::RG16Snorm) ==
                  WGPUTextureFormat_RG16Snorm,
              "value mismatch for TextureFormat::RG16Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::RGBA16Snorm) ==
                  WGPUTextureFormat_RGBA16Snorm,
              "value mismatch for TextureFormat::RGBA16Snorm");
static_assert(static_cast<uint32_t>(TextureFormat::R8BG8Biplanar420Unorm) ==
                  WGPUTextureFormat_R8BG8Biplanar420Unorm,
              "value mismatch for TextureFormat::R8BG8Biplanar420Unorm");
static_assert(
    static_cast<uint32_t>(TextureFormat::R10X6BG10X6Biplanar420Unorm) ==
        WGPUTextureFormat_R10X6BG10X6Biplanar420Unorm,
    "value mismatch for TextureFormat::R10X6BG10X6Biplanar420Unorm");
static_assert(static_cast<uint32_t>(TextureFormat::R8BG8A8Triplanar420Unorm) ==
                  WGPUTextureFormat_R8BG8A8Triplanar420Unorm,
              "value mismatch for TextureFormat::R8BG8A8Triplanar420Unorm");

// TextureSampleType

static_assert(sizeof(TextureSampleType) == sizeof(WGPUTextureSampleType),
              "sizeof mismatch for TextureSampleType");
static_assert(alignof(TextureSampleType) == alignof(WGPUTextureSampleType),
              "alignof mismatch for TextureSampleType");

static_assert(static_cast<uint32_t>(TextureSampleType::Undefined) ==
                  WGPUTextureSampleType_Undefined,
              "value mismatch for TextureSampleType::Undefined");
static_assert(static_cast<uint32_t>(TextureSampleType::Float) ==
                  WGPUTextureSampleType_Float,
              "value mismatch for TextureSampleType::Float");
static_assert(static_cast<uint32_t>(TextureSampleType::UnfilterableFloat) ==
                  WGPUTextureSampleType_UnfilterableFloat,
              "value mismatch for TextureSampleType::UnfilterableFloat");
static_assert(static_cast<uint32_t>(TextureSampleType::Depth) ==
                  WGPUTextureSampleType_Depth,
              "value mismatch for TextureSampleType::Depth");
static_assert(static_cast<uint32_t>(TextureSampleType::Sint) ==
                  WGPUTextureSampleType_Sint,
              "value mismatch for TextureSampleType::Sint");
static_assert(static_cast<uint32_t>(TextureSampleType::Uint) ==
                  WGPUTextureSampleType_Uint,
              "value mismatch for TextureSampleType::Uint");

// TextureViewDimension

static_assert(sizeof(TextureViewDimension) == sizeof(WGPUTextureViewDimension),
              "sizeof mismatch for TextureViewDimension");
static_assert(alignof(TextureViewDimension) ==
                  alignof(WGPUTextureViewDimension),
              "alignof mismatch for TextureViewDimension");

static_assert(static_cast<uint32_t>(TextureViewDimension::Undefined) ==
                  WGPUTextureViewDimension_Undefined,
              "value mismatch for TextureViewDimension::Undefined");
static_assert(static_cast<uint32_t>(TextureViewDimension::e1D) ==
                  WGPUTextureViewDimension_1D,
              "value mismatch for TextureViewDimension::e1D");
static_assert(static_cast<uint32_t>(TextureViewDimension::e2D) ==
                  WGPUTextureViewDimension_2D,
              "value mismatch for TextureViewDimension::e2D");
static_assert(static_cast<uint32_t>(TextureViewDimension::e2DArray) ==
                  WGPUTextureViewDimension_2DArray,
              "value mismatch for TextureViewDimension::e2DArray");
static_assert(static_cast<uint32_t>(TextureViewDimension::Cube) ==
                  WGPUTextureViewDimension_Cube,
              "value mismatch for TextureViewDimension::Cube");
static_assert(static_cast<uint32_t>(TextureViewDimension::CubeArray) ==
                  WGPUTextureViewDimension_CubeArray,
              "value mismatch for TextureViewDimension::CubeArray");
static_assert(static_cast<uint32_t>(TextureViewDimension::e3D) ==
                  WGPUTextureViewDimension_3D,
              "value mismatch for TextureViewDimension::e3D");

// VertexFormat

static_assert(sizeof(VertexFormat) == sizeof(WGPUVertexFormat),
              "sizeof mismatch for VertexFormat");
static_assert(alignof(VertexFormat) == alignof(WGPUVertexFormat),
              "alignof mismatch for VertexFormat");

static_assert(static_cast<uint32_t>(VertexFormat::Undefined) ==
                  WGPUVertexFormat_Undefined,
              "value mismatch for VertexFormat::Undefined");
static_assert(static_cast<uint32_t>(VertexFormat::Uint8x2) ==
                  WGPUVertexFormat_Uint8x2,
              "value mismatch for VertexFormat::Uint8x2");
static_assert(static_cast<uint32_t>(VertexFormat::Uint8x4) ==
                  WGPUVertexFormat_Uint8x4,
              "value mismatch for VertexFormat::Uint8x4");
static_assert(static_cast<uint32_t>(VertexFormat::Sint8x2) ==
                  WGPUVertexFormat_Sint8x2,
              "value mismatch for VertexFormat::Sint8x2");
static_assert(static_cast<uint32_t>(VertexFormat::Sint8x4) ==
                  WGPUVertexFormat_Sint8x4,
              "value mismatch for VertexFormat::Sint8x4");
static_assert(static_cast<uint32_t>(VertexFormat::Unorm8x2) ==
                  WGPUVertexFormat_Unorm8x2,
              "value mismatch for VertexFormat::Unorm8x2");
static_assert(static_cast<uint32_t>(VertexFormat::Unorm8x4) ==
                  WGPUVertexFormat_Unorm8x4,
              "value mismatch for VertexFormat::Unorm8x4");
static_assert(static_cast<uint32_t>(VertexFormat::Snorm8x2) ==
                  WGPUVertexFormat_Snorm8x2,
              "value mismatch for VertexFormat::Snorm8x2");
static_assert(static_cast<uint32_t>(VertexFormat::Snorm8x4) ==
                  WGPUVertexFormat_Snorm8x4,
              "value mismatch for VertexFormat::Snorm8x4");
static_assert(static_cast<uint32_t>(VertexFormat::Uint16x2) ==
                  WGPUVertexFormat_Uint16x2,
              "value mismatch for VertexFormat::Uint16x2");
static_assert(static_cast<uint32_t>(VertexFormat::Uint16x4) ==
                  WGPUVertexFormat_Uint16x4,
              "value mismatch for VertexFormat::Uint16x4");
static_assert(static_cast<uint32_t>(VertexFormat::Sint16x2) ==
                  WGPUVertexFormat_Sint16x2,
              "value mismatch for VertexFormat::Sint16x2");
static_assert(static_cast<uint32_t>(VertexFormat::Sint16x4) ==
                  WGPUVertexFormat_Sint16x4,
              "value mismatch for VertexFormat::Sint16x4");
static_assert(static_cast<uint32_t>(VertexFormat::Unorm16x2) ==
                  WGPUVertexFormat_Unorm16x2,
              "value mismatch for VertexFormat::Unorm16x2");
static_assert(static_cast<uint32_t>(VertexFormat::Unorm16x4) ==
                  WGPUVertexFormat_Unorm16x4,
              "value mismatch for VertexFormat::Unorm16x4");
static_assert(static_cast<uint32_t>(VertexFormat::Snorm16x2) ==
                  WGPUVertexFormat_Snorm16x2,
              "value mismatch for VertexFormat::Snorm16x2");
static_assert(static_cast<uint32_t>(VertexFormat::Snorm16x4) ==
                  WGPUVertexFormat_Snorm16x4,
              "value mismatch for VertexFormat::Snorm16x4");
static_assert(static_cast<uint32_t>(VertexFormat::Float16x2) ==
                  WGPUVertexFormat_Float16x2,
              "value mismatch for VertexFormat::Float16x2");
static_assert(static_cast<uint32_t>(VertexFormat::Float16x4) ==
                  WGPUVertexFormat_Float16x4,
              "value mismatch for VertexFormat::Float16x4");
static_assert(static_cast<uint32_t>(VertexFormat::Float32) ==
                  WGPUVertexFormat_Float32,
              "value mismatch for VertexFormat::Float32");
static_assert(static_cast<uint32_t>(VertexFormat::Float32x2) ==
                  WGPUVertexFormat_Float32x2,
              "value mismatch for VertexFormat::Float32x2");
static_assert(static_cast<uint32_t>(VertexFormat::Float32x3) ==
                  WGPUVertexFormat_Float32x3,
              "value mismatch for VertexFormat::Float32x3");
static_assert(static_cast<uint32_t>(VertexFormat::Float32x4) ==
                  WGPUVertexFormat_Float32x4,
              "value mismatch for VertexFormat::Float32x4");
static_assert(static_cast<uint32_t>(VertexFormat::Uint32) ==
                  WGPUVertexFormat_Uint32,
              "value mismatch for VertexFormat::Uint32");
static_assert(static_cast<uint32_t>(VertexFormat::Uint32x2) ==
                  WGPUVertexFormat_Uint32x2,
              "value mismatch for VertexFormat::Uint32x2");
static_assert(static_cast<uint32_t>(VertexFormat::Uint32x3) ==
                  WGPUVertexFormat_Uint32x3,
              "value mismatch for VertexFormat::Uint32x3");
static_assert(static_cast<uint32_t>(VertexFormat::Uint32x4) ==
                  WGPUVertexFormat_Uint32x4,
              "value mismatch for VertexFormat::Uint32x4");
static_assert(static_cast<uint32_t>(VertexFormat::Sint32) ==
                  WGPUVertexFormat_Sint32,
              "value mismatch for VertexFormat::Sint32");
static_assert(static_cast<uint32_t>(VertexFormat::Sint32x2) ==
                  WGPUVertexFormat_Sint32x2,
              "value mismatch for VertexFormat::Sint32x2");
static_assert(static_cast<uint32_t>(VertexFormat::Sint32x3) ==
                  WGPUVertexFormat_Sint32x3,
              "value mismatch for VertexFormat::Sint32x3");
static_assert(static_cast<uint32_t>(VertexFormat::Sint32x4) ==
                  WGPUVertexFormat_Sint32x4,
              "value mismatch for VertexFormat::Sint32x4");
static_assert(static_cast<uint32_t>(VertexFormat::Unorm10_10_10_2) ==
                  WGPUVertexFormat_Unorm10_10_10_2,
              "value mismatch for VertexFormat::Unorm10_10_10_2");

// VertexStepMode

static_assert(sizeof(VertexStepMode) == sizeof(WGPUVertexStepMode),
              "sizeof mismatch for VertexStepMode");
static_assert(alignof(VertexStepMode) == alignof(WGPUVertexStepMode),
              "alignof mismatch for VertexStepMode");

static_assert(static_cast<uint32_t>(VertexStepMode::Undefined) ==
                  WGPUVertexStepMode_Undefined,
              "value mismatch for VertexStepMode::Undefined");
static_assert(static_cast<uint32_t>(VertexStepMode::VertexBufferNotUsed) ==
                  WGPUVertexStepMode_VertexBufferNotUsed,
              "value mismatch for VertexStepMode::VertexBufferNotUsed");
static_assert(static_cast<uint32_t>(VertexStepMode::Vertex) ==
                  WGPUVertexStepMode_Vertex,
              "value mismatch for VertexStepMode::Vertex");
static_assert(static_cast<uint32_t>(VertexStepMode::Instance) ==
                  WGPUVertexStepMode_Instance,
              "value mismatch for VertexStepMode::Instance");

// WaitStatus

static_assert(sizeof(WaitStatus) == sizeof(WGPUWaitStatus),
              "sizeof mismatch for WaitStatus");
static_assert(alignof(WaitStatus) == alignof(WGPUWaitStatus),
              "alignof mismatch for WaitStatus");

static_assert(static_cast<uint32_t>(WaitStatus::Success) ==
                  WGPUWaitStatus_Success,
              "value mismatch for WaitStatus::Success");
static_assert(static_cast<uint32_t>(WaitStatus::TimedOut) ==
                  WGPUWaitStatus_TimedOut,
              "value mismatch for WaitStatus::TimedOut");
static_assert(static_cast<uint32_t>(WaitStatus::UnsupportedTimeout) ==
                  WGPUWaitStatus_UnsupportedTimeout,
              "value mismatch for WaitStatus::UnsupportedTimeout");
static_assert(static_cast<uint32_t>(WaitStatus::UnsupportedCount) ==
                  WGPUWaitStatus_UnsupportedCount,
              "value mismatch for WaitStatus::UnsupportedCount");
static_assert(static_cast<uint32_t>(WaitStatus::UnsupportedMixedSources) ==
                  WGPUWaitStatus_UnsupportedMixedSources,
              "value mismatch for WaitStatus::UnsupportedMixedSources");
static_assert(static_cast<uint32_t>(WaitStatus::Unknown) ==
                  WGPUWaitStatus_Unknown,
              "value mismatch for WaitStatus::Unknown");

// BufferUsage

static_assert(sizeof(BufferUsage) == sizeof(WGPUBufferUsageFlags),
              "sizeof mismatch for BufferUsage");
static_assert(alignof(BufferUsage) == alignof(WGPUBufferUsageFlags),
              "alignof mismatch for BufferUsage");

static_assert(static_cast<uint32_t>(BufferUsage::None) == WGPUBufferUsage_None,
              "value mismatch for BufferUsage::None");
static_assert(static_cast<uint32_t>(BufferUsage::MapRead) ==
                  WGPUBufferUsage_MapRead,
              "value mismatch for BufferUsage::MapRead");
static_assert(static_cast<uint32_t>(BufferUsage::MapWrite) ==
                  WGPUBufferUsage_MapWrite,
              "value mismatch for BufferUsage::MapWrite");
static_assert(static_cast<uint32_t>(BufferUsage::CopySrc) ==
                  WGPUBufferUsage_CopySrc,
              "value mismatch for BufferUsage::CopySrc");
static_assert(static_cast<uint32_t>(BufferUsage::CopyDst) ==
                  WGPUBufferUsage_CopyDst,
              "value mismatch for BufferUsage::CopyDst");
static_assert(static_cast<uint32_t>(BufferUsage::Index) ==
                  WGPUBufferUsage_Index,
              "value mismatch for BufferUsage::Index");
static_assert(static_cast<uint32_t>(BufferUsage::Vertex) ==
                  WGPUBufferUsage_Vertex,
              "value mismatch for BufferUsage::Vertex");
static_assert(static_cast<uint32_t>(BufferUsage::Uniform) ==
                  WGPUBufferUsage_Uniform,
              "value mismatch for BufferUsage::Uniform");
static_assert(static_cast<uint32_t>(BufferUsage::Storage) ==
                  WGPUBufferUsage_Storage,
              "value mismatch for BufferUsage::Storage");
static_assert(static_cast<uint32_t>(BufferUsage::Indirect) ==
                  WGPUBufferUsage_Indirect,
              "value mismatch for BufferUsage::Indirect");
static_assert(static_cast<uint32_t>(BufferUsage::QueryResolve) ==
                  WGPUBufferUsage_QueryResolve,
              "value mismatch for BufferUsage::QueryResolve");

// ColorWriteMask

static_assert(sizeof(ColorWriteMask) == sizeof(WGPUColorWriteMaskFlags),
              "sizeof mismatch for ColorWriteMask");
static_assert(alignof(ColorWriteMask) == alignof(WGPUColorWriteMaskFlags),
              "alignof mismatch for ColorWriteMask");

static_assert(static_cast<uint32_t>(ColorWriteMask::None) ==
                  WGPUColorWriteMask_None,
              "value mismatch for ColorWriteMask::None");
static_assert(static_cast<uint32_t>(ColorWriteMask::Red) ==
                  WGPUColorWriteMask_Red,
              "value mismatch for ColorWriteMask::Red");
static_assert(static_cast<uint32_t>(ColorWriteMask::Green) ==
                  WGPUColorWriteMask_Green,
              "value mismatch for ColorWriteMask::Green");
static_assert(static_cast<uint32_t>(ColorWriteMask::Blue) ==
                  WGPUColorWriteMask_Blue,
              "value mismatch for ColorWriteMask::Blue");
static_assert(static_cast<uint32_t>(ColorWriteMask::Alpha) ==
                  WGPUColorWriteMask_Alpha,
              "value mismatch for ColorWriteMask::Alpha");
static_assert(static_cast<uint32_t>(ColorWriteMask::All) ==
                  WGPUColorWriteMask_All,
              "value mismatch for ColorWriteMask::All");

// HeapProperty

static_assert(sizeof(HeapProperty) == sizeof(WGPUHeapPropertyFlags),
              "sizeof mismatch for HeapProperty");
static_assert(alignof(HeapProperty) == alignof(WGPUHeapPropertyFlags),
              "alignof mismatch for HeapProperty");

static_assert(static_cast<uint32_t>(HeapProperty::Undefined) ==
                  WGPUHeapProperty_Undefined,
              "value mismatch for HeapProperty::Undefined");
static_assert(static_cast<uint32_t>(HeapProperty::DeviceLocal) ==
                  WGPUHeapProperty_DeviceLocal,
              "value mismatch for HeapProperty::DeviceLocal");
static_assert(static_cast<uint32_t>(HeapProperty::HostVisible) ==
                  WGPUHeapProperty_HostVisible,
              "value mismatch for HeapProperty::HostVisible");
static_assert(static_cast<uint32_t>(HeapProperty::HostCoherent) ==
                  WGPUHeapProperty_HostCoherent,
              "value mismatch for HeapProperty::HostCoherent");
static_assert(static_cast<uint32_t>(HeapProperty::HostUncached) ==
                  WGPUHeapProperty_HostUncached,
              "value mismatch for HeapProperty::HostUncached");
static_assert(static_cast<uint32_t>(HeapProperty::HostCached) ==
                  WGPUHeapProperty_HostCached,
              "value mismatch for HeapProperty::HostCached");

// MapMode

static_assert(sizeof(MapMode) == sizeof(WGPUMapModeFlags),
              "sizeof mismatch for MapMode");
static_assert(alignof(MapMode) == alignof(WGPUMapModeFlags),
              "alignof mismatch for MapMode");

static_assert(static_cast<uint32_t>(MapMode::None) == WGPUMapMode_None,
              "value mismatch for MapMode::None");
static_assert(static_cast<uint32_t>(MapMode::Read) == WGPUMapMode_Read,
              "value mismatch for MapMode::Read");
static_assert(static_cast<uint32_t>(MapMode::Write) == WGPUMapMode_Write,
              "value mismatch for MapMode::Write");

// ShaderStage

static_assert(sizeof(ShaderStage) == sizeof(WGPUShaderStageFlags),
              "sizeof mismatch for ShaderStage");
static_assert(alignof(ShaderStage) == alignof(WGPUShaderStageFlags),
              "alignof mismatch for ShaderStage");

static_assert(static_cast<uint32_t>(ShaderStage::None) == WGPUShaderStage_None,
              "value mismatch for ShaderStage::None");
static_assert(static_cast<uint32_t>(ShaderStage::Vertex) ==
                  WGPUShaderStage_Vertex,
              "value mismatch for ShaderStage::Vertex");
static_assert(static_cast<uint32_t>(ShaderStage::Fragment) ==
                  WGPUShaderStage_Fragment,
              "value mismatch for ShaderStage::Fragment");
static_assert(static_cast<uint32_t>(ShaderStage::Compute) ==
                  WGPUShaderStage_Compute,
              "value mismatch for ShaderStage::Compute");

// TextureUsage

static_assert(sizeof(TextureUsage) == sizeof(WGPUTextureUsageFlags),
              "sizeof mismatch for TextureUsage");
static_assert(alignof(TextureUsage) == alignof(WGPUTextureUsageFlags),
              "alignof mismatch for TextureUsage");

static_assert(static_cast<uint32_t>(TextureUsage::None) ==
                  WGPUTextureUsage_None,
              "value mismatch for TextureUsage::None");
static_assert(static_cast<uint32_t>(TextureUsage::CopySrc) ==
                  WGPUTextureUsage_CopySrc,
              "value mismatch for TextureUsage::CopySrc");
static_assert(static_cast<uint32_t>(TextureUsage::CopyDst) ==
                  WGPUTextureUsage_CopyDst,
              "value mismatch for TextureUsage::CopyDst");
static_assert(static_cast<uint32_t>(TextureUsage::TextureBinding) ==
                  WGPUTextureUsage_TextureBinding,
              "value mismatch for TextureUsage::TextureBinding");
static_assert(static_cast<uint32_t>(TextureUsage::StorageBinding) ==
                  WGPUTextureUsage_StorageBinding,
              "value mismatch for TextureUsage::StorageBinding");
static_assert(static_cast<uint32_t>(TextureUsage::RenderAttachment) ==
                  WGPUTextureUsage_RenderAttachment,
              "value mismatch for TextureUsage::RenderAttachment");
static_assert(static_cast<uint32_t>(TextureUsage::TransientAttachment) ==
                  WGPUTextureUsage_TransientAttachment,
              "value mismatch for TextureUsage::TransientAttachment");
static_assert(static_cast<uint32_t>(TextureUsage::StorageAttachment) ==
                  WGPUTextureUsage_StorageAttachment,
              "value mismatch for TextureUsage::StorageAttachment");

// ChainedStruct

static_assert(sizeof(ChainedStruct) == sizeof(WGPUChainedStruct),
              "sizeof mismatch for ChainedStruct");
static_assert(alignof(ChainedStruct) == alignof(WGPUChainedStruct),
              "alignof mismatch for ChainedStruct");
static_assert(offsetof(ChainedStruct, nextInChain) ==
                  offsetof(WGPUChainedStruct, next),
              "offsetof mismatch for ChainedStruct::nextInChain");
static_assert(offsetof(ChainedStruct, sType) ==
                  offsetof(WGPUChainedStruct, sType),
              "offsetof mismatch for ChainedStruct::sType");

// AdapterProperties

static_assert(sizeof(AdapterProperties) == sizeof(WGPUAdapterProperties),
              "sizeof mismatch for AdapterProperties");
static_assert(alignof(AdapterProperties) == alignof(WGPUAdapterProperties),
              "alignof mismatch for AdapterProperties");

static_assert(offsetof(AdapterProperties, nextInChain) ==
                  offsetof(WGPUAdapterProperties, nextInChain),
              "offsetof mismatch for AdapterProperties::nextInChain");
static_assert(offsetof(AdapterProperties, vendorID) ==
                  offsetof(WGPUAdapterProperties, vendorID),
              "offsetof mismatch for AdapterProperties::vendorID");
static_assert(offsetof(AdapterProperties, vendorName) ==
                  offsetof(WGPUAdapterProperties, vendorName),
              "offsetof mismatch for AdapterProperties::vendorName");
static_assert(offsetof(AdapterProperties, architecture) ==
                  offsetof(WGPUAdapterProperties, architecture),
              "offsetof mismatch for AdapterProperties::architecture");
static_assert(offsetof(AdapterProperties, deviceID) ==
                  offsetof(WGPUAdapterProperties, deviceID),
              "offsetof mismatch for AdapterProperties::deviceID");
static_assert(offsetof(AdapterProperties, name) ==
                  offsetof(WGPUAdapterProperties, name),
              "offsetof mismatch for AdapterProperties::name");
static_assert(offsetof(AdapterProperties, driverDescription) ==
                  offsetof(WGPUAdapterProperties, driverDescription),
              "offsetof mismatch for AdapterProperties::driverDescription");
static_assert(offsetof(AdapterProperties, adapterType) ==
                  offsetof(WGPUAdapterProperties, adapterType),
              "offsetof mismatch for AdapterProperties::adapterType");
static_assert(offsetof(AdapterProperties, backendType) ==
                  offsetof(WGPUAdapterProperties, backendType),
              "offsetof mismatch for AdapterProperties::backendType");
static_assert(offsetof(AdapterProperties, compatibilityMode) ==
                  offsetof(WGPUAdapterProperties, compatibilityMode),
              "offsetof mismatch for AdapterProperties::compatibilityMode");

// AdapterPropertiesD3D

static_assert(sizeof(AdapterPropertiesD3D) == sizeof(WGPUAdapterPropertiesD3D),
              "sizeof mismatch for AdapterPropertiesD3D");
static_assert(alignof(AdapterPropertiesD3D) ==
                  alignof(WGPUAdapterPropertiesD3D),
              "alignof mismatch for AdapterPropertiesD3D");

static_assert(offsetof(AdapterPropertiesD3D, shaderModel) ==
                  offsetof(WGPUAdapterPropertiesD3D, shaderModel),
              "offsetof mismatch for AdapterPropertiesD3D::shaderModel");

// AdapterPropertiesVk

static_assert(sizeof(AdapterPropertiesVk) == sizeof(WGPUAdapterPropertiesVk),
              "sizeof mismatch for AdapterPropertiesVk");
static_assert(alignof(AdapterPropertiesVk) == alignof(WGPUAdapterPropertiesVk),
              "alignof mismatch for AdapterPropertiesVk");

static_assert(offsetof(AdapterPropertiesVk, driverVersion) ==
                  offsetof(WGPUAdapterPropertiesVk, driverVersion),
              "offsetof mismatch for AdapterPropertiesVk::driverVersion");

// BindGroupEntry

static_assert(sizeof(BindGroupEntry) == sizeof(WGPUBindGroupEntry),
              "sizeof mismatch for BindGroupEntry");
static_assert(alignof(BindGroupEntry) == alignof(WGPUBindGroupEntry),
              "alignof mismatch for BindGroupEntry");

static_assert(offsetof(BindGroupEntry, nextInChain) ==
                  offsetof(WGPUBindGroupEntry, nextInChain),
              "offsetof mismatch for BindGroupEntry::nextInChain");
static_assert(offsetof(BindGroupEntry, binding) ==
                  offsetof(WGPUBindGroupEntry, binding),
              "offsetof mismatch for BindGroupEntry::binding");
static_assert(offsetof(BindGroupEntry, buffer) ==
                  offsetof(WGPUBindGroupEntry, buffer),
              "offsetof mismatch for BindGroupEntry::buffer");
static_assert(offsetof(BindGroupEntry, offset) ==
                  offsetof(WGPUBindGroupEntry, offset),
              "offsetof mismatch for BindGroupEntry::offset");
static_assert(offsetof(BindGroupEntry, size) ==
                  offsetof(WGPUBindGroupEntry, size),
              "offsetof mismatch for BindGroupEntry::size");
static_assert(offsetof(BindGroupEntry, sampler) ==
                  offsetof(WGPUBindGroupEntry, sampler),
              "offsetof mismatch for BindGroupEntry::sampler");
static_assert(offsetof(BindGroupEntry, textureView) ==
                  offsetof(WGPUBindGroupEntry, textureView),
              "offsetof mismatch for BindGroupEntry::textureView");

// BlendComponent

static_assert(sizeof(BlendComponent) == sizeof(WGPUBlendComponent),
              "sizeof mismatch for BlendComponent");
static_assert(alignof(BlendComponent) == alignof(WGPUBlendComponent),
              "alignof mismatch for BlendComponent");

static_assert(offsetof(BlendComponent, operation) ==
                  offsetof(WGPUBlendComponent, operation),
              "offsetof mismatch for BlendComponent::operation");
static_assert(offsetof(BlendComponent, srcFactor) ==
                  offsetof(WGPUBlendComponent, srcFactor),
              "offsetof mismatch for BlendComponent::srcFactor");
static_assert(offsetof(BlendComponent, dstFactor) ==
                  offsetof(WGPUBlendComponent, dstFactor),
              "offsetof mismatch for BlendComponent::dstFactor");

// BufferBindingLayout

static_assert(sizeof(BufferBindingLayout) == sizeof(WGPUBufferBindingLayout),
              "sizeof mismatch for BufferBindingLayout");
static_assert(alignof(BufferBindingLayout) == alignof(WGPUBufferBindingLayout),
              "alignof mismatch for BufferBindingLayout");

static_assert(offsetof(BufferBindingLayout, nextInChain) ==
                  offsetof(WGPUBufferBindingLayout, nextInChain),
              "offsetof mismatch for BufferBindingLayout::nextInChain");
static_assert(offsetof(BufferBindingLayout, type) ==
                  offsetof(WGPUBufferBindingLayout, type),
              "offsetof mismatch for BufferBindingLayout::type");
static_assert(offsetof(BufferBindingLayout, hasDynamicOffset) ==
                  offsetof(WGPUBufferBindingLayout, hasDynamicOffset),
              "offsetof mismatch for BufferBindingLayout::hasDynamicOffset");
static_assert(offsetof(BufferBindingLayout, minBindingSize) ==
                  offsetof(WGPUBufferBindingLayout, minBindingSize),
              "offsetof mismatch for BufferBindingLayout::minBindingSize");

// BufferDescriptor

static_assert(sizeof(BufferDescriptor) == sizeof(WGPUBufferDescriptor),
              "sizeof mismatch for BufferDescriptor");
static_assert(alignof(BufferDescriptor) == alignof(WGPUBufferDescriptor),
              "alignof mismatch for BufferDescriptor");

static_assert(offsetof(BufferDescriptor, nextInChain) ==
                  offsetof(WGPUBufferDescriptor, nextInChain),
              "offsetof mismatch for BufferDescriptor::nextInChain");
static_assert(offsetof(BufferDescriptor, label) ==
                  offsetof(WGPUBufferDescriptor, label),
              "offsetof mismatch for BufferDescriptor::label");
static_assert(offsetof(BufferDescriptor, usage) ==
                  offsetof(WGPUBufferDescriptor, usage),
              "offsetof mismatch for BufferDescriptor::usage");
static_assert(offsetof(BufferDescriptor, size) ==
                  offsetof(WGPUBufferDescriptor, size),
              "offsetof mismatch for BufferDescriptor::size");
static_assert(offsetof(BufferDescriptor, mappedAtCreation) ==
                  offsetof(WGPUBufferDescriptor, mappedAtCreation),
              "offsetof mismatch for BufferDescriptor::mappedAtCreation");

// BufferHostMappedPointer

static_assert(sizeof(BufferHostMappedPointer) ==
                  sizeof(WGPUBufferHostMappedPointer),
              "sizeof mismatch for BufferHostMappedPointer");
static_assert(alignof(BufferHostMappedPointer) ==
                  alignof(WGPUBufferHostMappedPointer),
              "alignof mismatch for BufferHostMappedPointer");

static_assert(offsetof(BufferHostMappedPointer, pointer) ==
                  offsetof(WGPUBufferHostMappedPointer, pointer),
              "offsetof mismatch for BufferHostMappedPointer::pointer");
static_assert(offsetof(BufferHostMappedPointer, disposeCallback) ==
                  offsetof(WGPUBufferHostMappedPointer, disposeCallback),
              "offsetof mismatch for BufferHostMappedPointer::disposeCallback");
static_assert(offsetof(BufferHostMappedPointer, userdata) ==
                  offsetof(WGPUBufferHostMappedPointer, userdata),
              "offsetof mismatch for BufferHostMappedPointer::userdata");

// BufferMapCallbackInfo

static_assert(sizeof(BufferMapCallbackInfo) ==
                  sizeof(WGPUBufferMapCallbackInfo),
              "sizeof mismatch for BufferMapCallbackInfo");
static_assert(alignof(BufferMapCallbackInfo) ==
                  alignof(WGPUBufferMapCallbackInfo),
              "alignof mismatch for BufferMapCallbackInfo");

static_assert(offsetof(BufferMapCallbackInfo, nextInChain) ==
                  offsetof(WGPUBufferMapCallbackInfo, nextInChain),
              "offsetof mismatch for BufferMapCallbackInfo::nextInChain");
static_assert(offsetof(BufferMapCallbackInfo, mode) ==
                  offsetof(WGPUBufferMapCallbackInfo, mode),
              "offsetof mismatch for BufferMapCallbackInfo::mode");
static_assert(offsetof(BufferMapCallbackInfo, callback) ==
                  offsetof(WGPUBufferMapCallbackInfo, callback),
              "offsetof mismatch for BufferMapCallbackInfo::callback");
static_assert(offsetof(BufferMapCallbackInfo, userdata) ==
                  offsetof(WGPUBufferMapCallbackInfo, userdata),
              "offsetof mismatch for BufferMapCallbackInfo::userdata");

// Color

static_assert(sizeof(Color) == sizeof(WGPUColor), "sizeof mismatch for Color");
static_assert(alignof(Color) == alignof(WGPUColor),
              "alignof mismatch for Color");

static_assert(offsetof(Color, r) == offsetof(WGPUColor, r),
              "offsetof mismatch for Color::r");
static_assert(offsetof(Color, g) == offsetof(WGPUColor, g),
              "offsetof mismatch for Color::g");
static_assert(offsetof(Color, b) == offsetof(WGPUColor, b),
              "offsetof mismatch for Color::b");
static_assert(offsetof(Color, a) == offsetof(WGPUColor, a),
              "offsetof mismatch for Color::a");

// CommandBufferDescriptor

static_assert(sizeof(CommandBufferDescriptor) ==
                  sizeof(WGPUCommandBufferDescriptor),
              "sizeof mismatch for CommandBufferDescriptor");
static_assert(alignof(CommandBufferDescriptor) ==
                  alignof(WGPUCommandBufferDescriptor),
              "alignof mismatch for CommandBufferDescriptor");

static_assert(offsetof(CommandBufferDescriptor, nextInChain) ==
                  offsetof(WGPUCommandBufferDescriptor, nextInChain),
              "offsetof mismatch for CommandBufferDescriptor::nextInChain");
static_assert(offsetof(CommandBufferDescriptor, label) ==
                  offsetof(WGPUCommandBufferDescriptor, label),
              "offsetof mismatch for CommandBufferDescriptor::label");

// CommandEncoderDescriptor

static_assert(sizeof(CommandEncoderDescriptor) ==
                  sizeof(WGPUCommandEncoderDescriptor),
              "sizeof mismatch for CommandEncoderDescriptor");
static_assert(alignof(CommandEncoderDescriptor) ==
                  alignof(WGPUCommandEncoderDescriptor),
              "alignof mismatch for CommandEncoderDescriptor");

static_assert(offsetof(CommandEncoderDescriptor, nextInChain) ==
                  offsetof(WGPUCommandEncoderDescriptor, nextInChain),
              "offsetof mismatch for CommandEncoderDescriptor::nextInChain");
static_assert(offsetof(CommandEncoderDescriptor, label) ==
                  offsetof(WGPUCommandEncoderDescriptor, label),
              "offsetof mismatch for CommandEncoderDescriptor::label");

// CompilationInfoCallbackInfo

static_assert(sizeof(CompilationInfoCallbackInfo) ==
                  sizeof(WGPUCompilationInfoCallbackInfo),
              "sizeof mismatch for CompilationInfoCallbackInfo");
static_assert(alignof(CompilationInfoCallbackInfo) ==
                  alignof(WGPUCompilationInfoCallbackInfo),
              "alignof mismatch for CompilationInfoCallbackInfo");

static_assert(offsetof(CompilationInfoCallbackInfo, nextInChain) ==
                  offsetof(WGPUCompilationInfoCallbackInfo, nextInChain),
              "offsetof mismatch for CompilationInfoCallbackInfo::nextInChain");
static_assert(offsetof(CompilationInfoCallbackInfo, mode) ==
                  offsetof(WGPUCompilationInfoCallbackInfo, mode),
              "offsetof mismatch for CompilationInfoCallbackInfo::mode");
static_assert(offsetof(CompilationInfoCallbackInfo, callback) ==
                  offsetof(WGPUCompilationInfoCallbackInfo, callback),
              "offsetof mismatch for CompilationInfoCallbackInfo::callback");
static_assert(offsetof(CompilationInfoCallbackInfo, userdata) ==
                  offsetof(WGPUCompilationInfoCallbackInfo, userdata),
              "offsetof mismatch for CompilationInfoCallbackInfo::userdata");

// CompilationMessage

static_assert(sizeof(CompilationMessage) == sizeof(WGPUCompilationMessage),
              "sizeof mismatch for CompilationMessage");
static_assert(alignof(CompilationMessage) == alignof(WGPUCompilationMessage),
              "alignof mismatch for CompilationMessage");

static_assert(offsetof(CompilationMessage, nextInChain) ==
                  offsetof(WGPUCompilationMessage, nextInChain),
              "offsetof mismatch for CompilationMessage::nextInChain");
static_assert(offsetof(CompilationMessage, message) ==
                  offsetof(WGPUCompilationMessage, message),
              "offsetof mismatch for CompilationMessage::message");
static_assert(offsetof(CompilationMessage, type) ==
                  offsetof(WGPUCompilationMessage, type),
              "offsetof mismatch for CompilationMessage::type");
static_assert(offsetof(CompilationMessage, lineNum) ==
                  offsetof(WGPUCompilationMessage, lineNum),
              "offsetof mismatch for CompilationMessage::lineNum");
static_assert(offsetof(CompilationMessage, linePos) ==
                  offsetof(WGPUCompilationMessage, linePos),
              "offsetof mismatch for CompilationMessage::linePos");
static_assert(offsetof(CompilationMessage, offset) ==
                  offsetof(WGPUCompilationMessage, offset),
              "offsetof mismatch for CompilationMessage::offset");
static_assert(offsetof(CompilationMessage, length) ==
                  offsetof(WGPUCompilationMessage, length),
              "offsetof mismatch for CompilationMessage::length");
static_assert(offsetof(CompilationMessage, utf16LinePos) ==
                  offsetof(WGPUCompilationMessage, utf16LinePos),
              "offsetof mismatch for CompilationMessage::utf16LinePos");
static_assert(offsetof(CompilationMessage, utf16Offset) ==
                  offsetof(WGPUCompilationMessage, utf16Offset),
              "offsetof mismatch for CompilationMessage::utf16Offset");
static_assert(offsetof(CompilationMessage, utf16Length) ==
                  offsetof(WGPUCompilationMessage, utf16Length),
              "offsetof mismatch for CompilationMessage::utf16Length");

// ComputePassTimestampWrites

static_assert(sizeof(ComputePassTimestampWrites) ==
                  sizeof(WGPUComputePassTimestampWrites),
              "sizeof mismatch for ComputePassTimestampWrites");
static_assert(alignof(ComputePassTimestampWrites) ==
                  alignof(WGPUComputePassTimestampWrites),
              "alignof mismatch for ComputePassTimestampWrites");

static_assert(offsetof(ComputePassTimestampWrites, querySet) ==
                  offsetof(WGPUComputePassTimestampWrites, querySet),
              "offsetof mismatch for ComputePassTimestampWrites::querySet");
static_assert(offsetof(ComputePassTimestampWrites, beginningOfPassWriteIndex) ==
                  offsetof(WGPUComputePassTimestampWrites,
                           beginningOfPassWriteIndex),
              "offsetof mismatch for "
              "ComputePassTimestampWrites::beginningOfPassWriteIndex");
static_assert(
    offsetof(ComputePassTimestampWrites, endOfPassWriteIndex) ==
        offsetof(WGPUComputePassTimestampWrites, endOfPassWriteIndex),
    "offsetof mismatch for ComputePassTimestampWrites::endOfPassWriteIndex");

// ConstantEntry

static_assert(sizeof(ConstantEntry) == sizeof(WGPUConstantEntry),
              "sizeof mismatch for ConstantEntry");
static_assert(alignof(ConstantEntry) == alignof(WGPUConstantEntry),
              "alignof mismatch for ConstantEntry");

static_assert(offsetof(ConstantEntry, nextInChain) ==
                  offsetof(WGPUConstantEntry, nextInChain),
              "offsetof mismatch for ConstantEntry::nextInChain");
static_assert(offsetof(ConstantEntry, key) == offsetof(WGPUConstantEntry, key),
              "offsetof mismatch for ConstantEntry::key");
static_assert(offsetof(ConstantEntry, value) ==
                  offsetof(WGPUConstantEntry, value),
              "offsetof mismatch for ConstantEntry::value");

// CopyTextureForBrowserOptions

static_assert(sizeof(CopyTextureForBrowserOptions) ==
                  sizeof(WGPUCopyTextureForBrowserOptions),
              "sizeof mismatch for CopyTextureForBrowserOptions");
static_assert(alignof(CopyTextureForBrowserOptions) ==
                  alignof(WGPUCopyTextureForBrowserOptions),
              "alignof mismatch for CopyTextureForBrowserOptions");

static_assert(
    offsetof(CopyTextureForBrowserOptions, nextInChain) ==
        offsetof(WGPUCopyTextureForBrowserOptions, nextInChain),
    "offsetof mismatch for CopyTextureForBrowserOptions::nextInChain");
static_assert(offsetof(CopyTextureForBrowserOptions, flipY) ==
                  offsetof(WGPUCopyTextureForBrowserOptions, flipY),
              "offsetof mismatch for CopyTextureForBrowserOptions::flipY");
static_assert(offsetof(CopyTextureForBrowserOptions,
                       needsColorSpaceConversion) ==
                  offsetof(WGPUCopyTextureForBrowserOptions,
                           needsColorSpaceConversion),
              "offsetof mismatch for "
              "CopyTextureForBrowserOptions::needsColorSpaceConversion");
static_assert(
    offsetof(CopyTextureForBrowserOptions, srcAlphaMode) ==
        offsetof(WGPUCopyTextureForBrowserOptions, srcAlphaMode),
    "offsetof mismatch for CopyTextureForBrowserOptions::srcAlphaMode");
static_assert(offsetof(CopyTextureForBrowserOptions,
                       srcTransferFunctionParameters) ==
                  offsetof(WGPUCopyTextureForBrowserOptions,
                           srcTransferFunctionParameters),
              "offsetof mismatch for "
              "CopyTextureForBrowserOptions::srcTransferFunctionParameters");
static_assert(
    offsetof(CopyTextureForBrowserOptions, conversionMatrix) ==
        offsetof(WGPUCopyTextureForBrowserOptions, conversionMatrix),
    "offsetof mismatch for CopyTextureForBrowserOptions::conversionMatrix");
static_assert(offsetof(CopyTextureForBrowserOptions,
                       dstTransferFunctionParameters) ==
                  offsetof(WGPUCopyTextureForBrowserOptions,
                           dstTransferFunctionParameters),
              "offsetof mismatch for "
              "CopyTextureForBrowserOptions::dstTransferFunctionParameters");
static_assert(
    offsetof(CopyTextureForBrowserOptions, dstAlphaMode) ==
        offsetof(WGPUCopyTextureForBrowserOptions, dstAlphaMode),
    "offsetof mismatch for CopyTextureForBrowserOptions::dstAlphaMode");
static_assert(
    offsetof(CopyTextureForBrowserOptions, internalUsage) ==
        offsetof(WGPUCopyTextureForBrowserOptions, internalUsage),
    "offsetof mismatch for CopyTextureForBrowserOptions::internalUsage");

// CreateComputePipelineAsyncCallbackInfo

static_assert(sizeof(CreateComputePipelineAsyncCallbackInfo) ==
                  sizeof(WGPUCreateComputePipelineAsyncCallbackInfo),
              "sizeof mismatch for CreateComputePipelineAsyncCallbackInfo");
static_assert(alignof(CreateComputePipelineAsyncCallbackInfo) ==
                  alignof(WGPUCreateComputePipelineAsyncCallbackInfo),
              "alignof mismatch for CreateComputePipelineAsyncCallbackInfo");

static_assert(offsetof(CreateComputePipelineAsyncCallbackInfo, nextInChain) ==
                  offsetof(WGPUCreateComputePipelineAsyncCallbackInfo,
                           nextInChain),
              "offsetof mismatch for "
              "CreateComputePipelineAsyncCallbackInfo::nextInChain");
static_assert(
    offsetof(CreateComputePipelineAsyncCallbackInfo, mode) ==
        offsetof(WGPUCreateComputePipelineAsyncCallbackInfo, mode),
    "offsetof mismatch for CreateComputePipelineAsyncCallbackInfo::mode");
static_assert(
    offsetof(CreateComputePipelineAsyncCallbackInfo, callback) ==
        offsetof(WGPUCreateComputePipelineAsyncCallbackInfo, callback),
    "offsetof mismatch for CreateComputePipelineAsyncCallbackInfo::callback");
static_assert(
    offsetof(CreateComputePipelineAsyncCallbackInfo, userdata) ==
        offsetof(WGPUCreateComputePipelineAsyncCallbackInfo, userdata),
    "offsetof mismatch for CreateComputePipelineAsyncCallbackInfo::userdata");

// CreateRenderPipelineAsyncCallbackInfo

static_assert(sizeof(CreateRenderPipelineAsyncCallbackInfo) ==
                  sizeof(WGPUCreateRenderPipelineAsyncCallbackInfo),
              "sizeof mismatch for CreateRenderPipelineAsyncCallbackInfo");
static_assert(alignof(CreateRenderPipelineAsyncCallbackInfo) ==
                  alignof(WGPUCreateRenderPipelineAsyncCallbackInfo),
              "alignof mismatch for CreateRenderPipelineAsyncCallbackInfo");

static_assert(
    offsetof(CreateRenderPipelineAsyncCallbackInfo, nextInChain) ==
        offsetof(WGPUCreateRenderPipelineAsyncCallbackInfo, nextInChain),
    "offsetof mismatch for CreateRenderPipelineAsyncCallbackInfo::nextInChain");
static_assert(
    offsetof(CreateRenderPipelineAsyncCallbackInfo, mode) ==
        offsetof(WGPUCreateRenderPipelineAsyncCallbackInfo, mode),
    "offsetof mismatch for CreateRenderPipelineAsyncCallbackInfo::mode");
static_assert(
    offsetof(CreateRenderPipelineAsyncCallbackInfo, callback) ==
        offsetof(WGPUCreateRenderPipelineAsyncCallbackInfo, callback),
    "offsetof mismatch for CreateRenderPipelineAsyncCallbackInfo::callback");
static_assert(
    offsetof(CreateRenderPipelineAsyncCallbackInfo, userdata) ==
        offsetof(WGPUCreateRenderPipelineAsyncCallbackInfo, userdata),
    "offsetof mismatch for CreateRenderPipelineAsyncCallbackInfo::userdata");

// DawnWGSLBlocklist

static_assert(sizeof(DawnWGSLBlocklist) == sizeof(WGPUDawnWGSLBlocklist),
              "sizeof mismatch for DawnWGSLBlocklist");
static_assert(alignof(DawnWGSLBlocklist) == alignof(WGPUDawnWGSLBlocklist),
              "alignof mismatch for DawnWGSLBlocklist");

static_assert(
    offsetof(DawnWGSLBlocklist, blocklistedFeatureCount) ==
        offsetof(WGPUDawnWGSLBlocklist, blocklistedFeatureCount),
    "offsetof mismatch for DawnWGSLBlocklist::blocklistedFeatureCount");
static_assert(offsetof(DawnWGSLBlocklist, blocklistedFeatures) ==
                  offsetof(WGPUDawnWGSLBlocklist, blocklistedFeatures),
              "offsetof mismatch for DawnWGSLBlocklist::blocklistedFeatures");

// DawnAdapterPropertiesPowerPreference

static_assert(sizeof(DawnAdapterPropertiesPowerPreference) ==
                  sizeof(WGPUDawnAdapterPropertiesPowerPreference),
              "sizeof mismatch for DawnAdapterPropertiesPowerPreference");
static_assert(alignof(DawnAdapterPropertiesPowerPreference) ==
                  alignof(WGPUDawnAdapterPropertiesPowerPreference),
              "alignof mismatch for DawnAdapterPropertiesPowerPreference");

static_assert(offsetof(DawnAdapterPropertiesPowerPreference, powerPreference) ==
                  offsetof(WGPUDawnAdapterPropertiesPowerPreference,
                           powerPreference),
              "offsetof mismatch for "
              "DawnAdapterPropertiesPowerPreference::powerPreference");

// DawnBufferDescriptorErrorInfoFromWireClient

static_assert(
    sizeof(DawnBufferDescriptorErrorInfoFromWireClient) ==
        sizeof(WGPUDawnBufferDescriptorErrorInfoFromWireClient),
    "sizeof mismatch for DawnBufferDescriptorErrorInfoFromWireClient");
static_assert(
    alignof(DawnBufferDescriptorErrorInfoFromWireClient) ==
        alignof(WGPUDawnBufferDescriptorErrorInfoFromWireClient),
    "alignof mismatch for DawnBufferDescriptorErrorInfoFromWireClient");

static_assert(offsetof(DawnBufferDescriptorErrorInfoFromWireClient,
                       outOfMemory) ==
                  offsetof(WGPUDawnBufferDescriptorErrorInfoFromWireClient,
                           outOfMemory),
              "offsetof mismatch for "
              "DawnBufferDescriptorErrorInfoFromWireClient::outOfMemory");

// DawnCacheDeviceDescriptor

static_assert(sizeof(DawnCacheDeviceDescriptor) ==
                  sizeof(WGPUDawnCacheDeviceDescriptor),
              "sizeof mismatch for DawnCacheDeviceDescriptor");
static_assert(alignof(DawnCacheDeviceDescriptor) ==
                  alignof(WGPUDawnCacheDeviceDescriptor),
              "alignof mismatch for DawnCacheDeviceDescriptor");

static_assert(offsetof(DawnCacheDeviceDescriptor, isolationKey) ==
                  offsetof(WGPUDawnCacheDeviceDescriptor, isolationKey),
              "offsetof mismatch for DawnCacheDeviceDescriptor::isolationKey");
static_assert(
    offsetof(DawnCacheDeviceDescriptor, loadDataFunction) ==
        offsetof(WGPUDawnCacheDeviceDescriptor, loadDataFunction),
    "offsetof mismatch for DawnCacheDeviceDescriptor::loadDataFunction");
static_assert(
    offsetof(DawnCacheDeviceDescriptor, storeDataFunction) ==
        offsetof(WGPUDawnCacheDeviceDescriptor, storeDataFunction),
    "offsetof mismatch for DawnCacheDeviceDescriptor::storeDataFunction");
static_assert(
    offsetof(DawnCacheDeviceDescriptor, functionUserdata) ==
        offsetof(WGPUDawnCacheDeviceDescriptor, functionUserdata),
    "offsetof mismatch for DawnCacheDeviceDescriptor::functionUserdata");

// DawnComputePipelineFullSubgroups

static_assert(sizeof(DawnComputePipelineFullSubgroups) ==
                  sizeof(WGPUDawnComputePipelineFullSubgroups),
              "sizeof mismatch for DawnComputePipelineFullSubgroups");
static_assert(alignof(DawnComputePipelineFullSubgroups) ==
                  alignof(WGPUDawnComputePipelineFullSubgroups),
              "alignof mismatch for DawnComputePipelineFullSubgroups");

static_assert(offsetof(DawnComputePipelineFullSubgroups,
                       requiresFullSubgroups) ==
                  offsetof(WGPUDawnComputePipelineFullSubgroups,
                           requiresFullSubgroups),
              "offsetof mismatch for "
              "DawnComputePipelineFullSubgroups::requiresFullSubgroups");

// DawnEncoderInternalUsageDescriptor

static_assert(sizeof(DawnEncoderInternalUsageDescriptor) ==
                  sizeof(WGPUDawnEncoderInternalUsageDescriptor),
              "sizeof mismatch for DawnEncoderInternalUsageDescriptor");
static_assert(alignof(DawnEncoderInternalUsageDescriptor) ==
                  alignof(WGPUDawnEncoderInternalUsageDescriptor),
              "alignof mismatch for DawnEncoderInternalUsageDescriptor");

static_assert(offsetof(DawnEncoderInternalUsageDescriptor, useInternalUsages) ==
                  offsetof(WGPUDawnEncoderInternalUsageDescriptor,
                           useInternalUsages),
              "offsetof mismatch for "
              "DawnEncoderInternalUsageDescriptor::useInternalUsages");

// DawnExperimentalSubgroupLimits

static_assert(sizeof(DawnExperimentalSubgroupLimits) ==
                  sizeof(WGPUDawnExperimentalSubgroupLimits),
              "sizeof mismatch for DawnExperimentalSubgroupLimits");
static_assert(alignof(DawnExperimentalSubgroupLimits) ==
                  alignof(WGPUDawnExperimentalSubgroupLimits),
              "alignof mismatch for DawnExperimentalSubgroupLimits");

static_assert(
    offsetof(DawnExperimentalSubgroupLimits, minSubgroupSize) ==
        offsetof(WGPUDawnExperimentalSubgroupLimits, minSubgroupSize),
    "offsetof mismatch for DawnExperimentalSubgroupLimits::minSubgroupSize");
static_assert(
    offsetof(DawnExperimentalSubgroupLimits, maxSubgroupSize) ==
        offsetof(WGPUDawnExperimentalSubgroupLimits, maxSubgroupSize),
    "offsetof mismatch for DawnExperimentalSubgroupLimits::maxSubgroupSize");

// DawnMultisampleStateRenderToSingleSampled

static_assert(sizeof(DawnMultisampleStateRenderToSingleSampled) ==
                  sizeof(WGPUDawnMultisampleStateRenderToSingleSampled),
              "sizeof mismatch for DawnMultisampleStateRenderToSingleSampled");
static_assert(alignof(DawnMultisampleStateRenderToSingleSampled) ==
                  alignof(WGPUDawnMultisampleStateRenderToSingleSampled),
              "alignof mismatch for DawnMultisampleStateRenderToSingleSampled");

static_assert(
    offsetof(DawnMultisampleStateRenderToSingleSampled, enabled) ==
        offsetof(WGPUDawnMultisampleStateRenderToSingleSampled, enabled),
    "offsetof mismatch for DawnMultisampleStateRenderToSingleSampled::enabled");

// DawnRenderPassColorAttachmentRenderToSingleSampled

static_assert(
    sizeof(DawnRenderPassColorAttachmentRenderToSingleSampled) ==
        sizeof(WGPUDawnRenderPassColorAttachmentRenderToSingleSampled),
    "sizeof mismatch for DawnRenderPassColorAttachmentRenderToSingleSampled");
static_assert(
    alignof(DawnRenderPassColorAttachmentRenderToSingleSampled) ==
        alignof(WGPUDawnRenderPassColorAttachmentRenderToSingleSampled),
    "alignof mismatch for DawnRenderPassColorAttachmentRenderToSingleSampled");

static_assert(
    offsetof(DawnRenderPassColorAttachmentRenderToSingleSampled,
             implicitSampleCount) ==
        offsetof(WGPUDawnRenderPassColorAttachmentRenderToSingleSampled,
                 implicitSampleCount),
    "offsetof mismatch for "
    "DawnRenderPassColorAttachmentRenderToSingleSampled::implicitSampleCount");

// DawnShaderModuleSPIRVOptionsDescriptor

static_assert(sizeof(DawnShaderModuleSPIRVOptionsDescriptor) ==
                  sizeof(WGPUDawnShaderModuleSPIRVOptionsDescriptor),
              "sizeof mismatch for DawnShaderModuleSPIRVOptionsDescriptor");
static_assert(alignof(DawnShaderModuleSPIRVOptionsDescriptor) ==
                  alignof(WGPUDawnShaderModuleSPIRVOptionsDescriptor),
              "alignof mismatch for DawnShaderModuleSPIRVOptionsDescriptor");

static_assert(
    offsetof(DawnShaderModuleSPIRVOptionsDescriptor,
             allowNonUniformDerivatives) ==
        offsetof(WGPUDawnShaderModuleSPIRVOptionsDescriptor,
                 allowNonUniformDerivatives),
    "offsetof mismatch for "
    "DawnShaderModuleSPIRVOptionsDescriptor::allowNonUniformDerivatives");

// DawnTextureInternalUsageDescriptor

static_assert(sizeof(DawnTextureInternalUsageDescriptor) ==
                  sizeof(WGPUDawnTextureInternalUsageDescriptor),
              "sizeof mismatch for DawnTextureInternalUsageDescriptor");
static_assert(alignof(DawnTextureInternalUsageDescriptor) ==
                  alignof(WGPUDawnTextureInternalUsageDescriptor),
              "alignof mismatch for DawnTextureInternalUsageDescriptor");

static_assert(
    offsetof(DawnTextureInternalUsageDescriptor, internalUsage) ==
        offsetof(WGPUDawnTextureInternalUsageDescriptor, internalUsage),
    "offsetof mismatch for DawnTextureInternalUsageDescriptor::internalUsage");

// DawnTogglesDescriptor

static_assert(sizeof(DawnTogglesDescriptor) ==
                  sizeof(WGPUDawnTogglesDescriptor),
              "sizeof mismatch for DawnTogglesDescriptor");
static_assert(alignof(DawnTogglesDescriptor) ==
                  alignof(WGPUDawnTogglesDescriptor),
              "alignof mismatch for DawnTogglesDescriptor");

static_assert(
    offsetof(DawnTogglesDescriptor, enabledToggleCount) ==
        offsetof(WGPUDawnTogglesDescriptor, enabledToggleCount),
    "offsetof mismatch for DawnTogglesDescriptor::enabledToggleCount");
static_assert(offsetof(DawnTogglesDescriptor, enabledToggles) ==
                  offsetof(WGPUDawnTogglesDescriptor, enabledToggles),
              "offsetof mismatch for DawnTogglesDescriptor::enabledToggles");
static_assert(
    offsetof(DawnTogglesDescriptor, disabledToggleCount) ==
        offsetof(WGPUDawnTogglesDescriptor, disabledToggleCount),
    "offsetof mismatch for DawnTogglesDescriptor::disabledToggleCount");
static_assert(offsetof(DawnTogglesDescriptor, disabledToggles) ==
                  offsetof(WGPUDawnTogglesDescriptor, disabledToggles),
              "offsetof mismatch for DawnTogglesDescriptor::disabledToggles");

// DawnWireWGSLControl

static_assert(sizeof(DawnWireWGSLControl) == sizeof(WGPUDawnWireWGSLControl),
              "sizeof mismatch for DawnWireWGSLControl");
static_assert(alignof(DawnWireWGSLControl) == alignof(WGPUDawnWireWGSLControl),
              "alignof mismatch for DawnWireWGSLControl");

static_assert(offsetof(DawnWireWGSLControl, enableExperimental) ==
                  offsetof(WGPUDawnWireWGSLControl, enableExperimental),
              "offsetof mismatch for DawnWireWGSLControl::enableExperimental");
static_assert(offsetof(DawnWireWGSLControl, enableUnsafe) ==
                  offsetof(WGPUDawnWireWGSLControl, enableUnsafe),
              "offsetof mismatch for DawnWireWGSLControl::enableUnsafe");
static_assert(offsetof(DawnWireWGSLControl, enableTesting) ==
                  offsetof(WGPUDawnWireWGSLControl, enableTesting),
              "offsetof mismatch for DawnWireWGSLControl::enableTesting");

// DepthStencilStateDepthWriteDefinedDawn

static_assert(sizeof(DepthStencilStateDepthWriteDefinedDawn) ==
                  sizeof(WGPUDepthStencilStateDepthWriteDefinedDawn),
              "sizeof mismatch for DepthStencilStateDepthWriteDefinedDawn");
static_assert(alignof(DepthStencilStateDepthWriteDefinedDawn) ==
                  alignof(WGPUDepthStencilStateDepthWriteDefinedDawn),
              "alignof mismatch for DepthStencilStateDepthWriteDefinedDawn");

static_assert(offsetof(DepthStencilStateDepthWriteDefinedDawn,
                       depthWriteDefined) ==
                  offsetof(WGPUDepthStencilStateDepthWriteDefinedDawn,
                           depthWriteDefined),
              "offsetof mismatch for "
              "DepthStencilStateDepthWriteDefinedDawn::depthWriteDefined");

// DrmFormatProperties

static_assert(sizeof(DrmFormatProperties) == sizeof(WGPUDrmFormatProperties),
              "sizeof mismatch for DrmFormatProperties");
static_assert(alignof(DrmFormatProperties) == alignof(WGPUDrmFormatProperties),
              "alignof mismatch for DrmFormatProperties");

static_assert(offsetof(DrmFormatProperties, modifier) ==
                  offsetof(WGPUDrmFormatProperties, modifier),
              "offsetof mismatch for DrmFormatProperties::modifier");
static_assert(offsetof(DrmFormatProperties, modifierPlaneCount) ==
                  offsetof(WGPUDrmFormatProperties, modifierPlaneCount),
              "offsetof mismatch for DrmFormatProperties::modifierPlaneCount");

// Extent2D

static_assert(sizeof(Extent2D) == sizeof(WGPUExtent2D),
              "sizeof mismatch for Extent2D");
static_assert(alignof(Extent2D) == alignof(WGPUExtent2D),
              "alignof mismatch for Extent2D");

static_assert(offsetof(Extent2D, width) == offsetof(WGPUExtent2D, width),
              "offsetof mismatch for Extent2D::width");
static_assert(offsetof(Extent2D, height) == offsetof(WGPUExtent2D, height),
              "offsetof mismatch for Extent2D::height");

// Extent3D

static_assert(sizeof(Extent3D) == sizeof(WGPUExtent3D),
              "sizeof mismatch for Extent3D");
static_assert(alignof(Extent3D) == alignof(WGPUExtent3D),
              "alignof mismatch for Extent3D");

static_assert(offsetof(Extent3D, width) == offsetof(WGPUExtent3D, width),
              "offsetof mismatch for Extent3D::width");
static_assert(offsetof(Extent3D, height) == offsetof(WGPUExtent3D, height),
              "offsetof mismatch for Extent3D::height");
static_assert(offsetof(Extent3D, depthOrArrayLayers) ==
                  offsetof(WGPUExtent3D, depthOrArrayLayers),
              "offsetof mismatch for Extent3D::depthOrArrayLayers");

// ExternalTextureBindingEntry

static_assert(sizeof(ExternalTextureBindingEntry) ==
                  sizeof(WGPUExternalTextureBindingEntry),
              "sizeof mismatch for ExternalTextureBindingEntry");
static_assert(alignof(ExternalTextureBindingEntry) ==
                  alignof(WGPUExternalTextureBindingEntry),
              "alignof mismatch for ExternalTextureBindingEntry");

static_assert(
    offsetof(ExternalTextureBindingEntry, externalTexture) ==
        offsetof(WGPUExternalTextureBindingEntry, externalTexture),
    "offsetof mismatch for ExternalTextureBindingEntry::externalTexture");

// ExternalTextureBindingLayout

static_assert(sizeof(ExternalTextureBindingLayout) ==
                  sizeof(WGPUExternalTextureBindingLayout),
              "sizeof mismatch for ExternalTextureBindingLayout");
static_assert(alignof(ExternalTextureBindingLayout) ==
                  alignof(WGPUExternalTextureBindingLayout),
              "alignof mismatch for ExternalTextureBindingLayout");

// FormatCapabilities

static_assert(sizeof(FormatCapabilities) == sizeof(WGPUFormatCapabilities),
              "sizeof mismatch for FormatCapabilities");
static_assert(alignof(FormatCapabilities) == alignof(WGPUFormatCapabilities),
              "alignof mismatch for FormatCapabilities");

static_assert(offsetof(FormatCapabilities, nextInChain) ==
                  offsetof(WGPUFormatCapabilities, nextInChain),
              "offsetof mismatch for FormatCapabilities::nextInChain");

// Future

static_assert(sizeof(Future) == sizeof(WGPUFuture),
              "sizeof mismatch for Future");
static_assert(alignof(Future) == alignof(WGPUFuture),
              "alignof mismatch for Future");

static_assert(offsetof(Future, id) == offsetof(WGPUFuture, id),
              "offsetof mismatch for Future::id");

// InstanceFeatures

static_assert(sizeof(InstanceFeatures) == sizeof(WGPUInstanceFeatures),
              "sizeof mismatch for InstanceFeatures");
static_assert(alignof(InstanceFeatures) == alignof(WGPUInstanceFeatures),
              "alignof mismatch for InstanceFeatures");

static_assert(offsetof(InstanceFeatures, nextInChain) ==
                  offsetof(WGPUInstanceFeatures, nextInChain),
              "offsetof mismatch for InstanceFeatures::nextInChain");
static_assert(offsetof(InstanceFeatures, timedWaitAnyEnable) ==
                  offsetof(WGPUInstanceFeatures, timedWaitAnyEnable),
              "offsetof mismatch for InstanceFeatures::timedWaitAnyEnable");
static_assert(offsetof(InstanceFeatures, timedWaitAnyMaxCount) ==
                  offsetof(WGPUInstanceFeatures, timedWaitAnyMaxCount),
              "offsetof mismatch for InstanceFeatures::timedWaitAnyMaxCount");

// Limits

static_assert(sizeof(Limits) == sizeof(WGPULimits),
              "sizeof mismatch for Limits");
static_assert(alignof(Limits) == alignof(WGPULimits),
              "alignof mismatch for Limits");

static_assert(offsetof(Limits, maxTextureDimension1D) ==
                  offsetof(WGPULimits, maxTextureDimension1D),
              "offsetof mismatch for Limits::maxTextureDimension1D");
static_assert(offsetof(Limits, maxTextureDimension2D) ==
                  offsetof(WGPULimits, maxTextureDimension2D),
              "offsetof mismatch for Limits::maxTextureDimension2D");
static_assert(offsetof(Limits, maxTextureDimension3D) ==
                  offsetof(WGPULimits, maxTextureDimension3D),
              "offsetof mismatch for Limits::maxTextureDimension3D");
static_assert(offsetof(Limits, maxTextureArrayLayers) ==
                  offsetof(WGPULimits, maxTextureArrayLayers),
              "offsetof mismatch for Limits::maxTextureArrayLayers");
static_assert(offsetof(Limits, maxBindGroups) ==
                  offsetof(WGPULimits, maxBindGroups),
              "offsetof mismatch for Limits::maxBindGroups");
static_assert(offsetof(Limits, maxBindGroupsPlusVertexBuffers) ==
                  offsetof(WGPULimits, maxBindGroupsPlusVertexBuffers),
              "offsetof mismatch for Limits::maxBindGroupsPlusVertexBuffers");
static_assert(offsetof(Limits, maxBindingsPerBindGroup) ==
                  offsetof(WGPULimits, maxBindingsPerBindGroup),
              "offsetof mismatch for Limits::maxBindingsPerBindGroup");
static_assert(
    offsetof(Limits, maxDynamicUniformBuffersPerPipelineLayout) ==
        offsetof(WGPULimits, maxDynamicUniformBuffersPerPipelineLayout),
    "offsetof mismatch for Limits::maxDynamicUniformBuffersPerPipelineLayout");
static_assert(
    offsetof(Limits, maxDynamicStorageBuffersPerPipelineLayout) ==
        offsetof(WGPULimits, maxDynamicStorageBuffersPerPipelineLayout),
    "offsetof mismatch for Limits::maxDynamicStorageBuffersPerPipelineLayout");
static_assert(offsetof(Limits, maxSampledTexturesPerShaderStage) ==
                  offsetof(WGPULimits, maxSampledTexturesPerShaderStage),
              "offsetof mismatch for Limits::maxSampledTexturesPerShaderStage");
static_assert(offsetof(Limits, maxSamplersPerShaderStage) ==
                  offsetof(WGPULimits, maxSamplersPerShaderStage),
              "offsetof mismatch for Limits::maxSamplersPerShaderStage");
static_assert(offsetof(Limits, maxStorageBuffersPerShaderStage) ==
                  offsetof(WGPULimits, maxStorageBuffersPerShaderStage),
              "offsetof mismatch for Limits::maxStorageBuffersPerShaderStage");
static_assert(offsetof(Limits, maxStorageTexturesPerShaderStage) ==
                  offsetof(WGPULimits, maxStorageTexturesPerShaderStage),
              "offsetof mismatch for Limits::maxStorageTexturesPerShaderStage");
static_assert(offsetof(Limits, maxUniformBuffersPerShaderStage) ==
                  offsetof(WGPULimits, maxUniformBuffersPerShaderStage),
              "offsetof mismatch for Limits::maxUniformBuffersPerShaderStage");
static_assert(offsetof(Limits, maxUniformBufferBindingSize) ==
                  offsetof(WGPULimits, maxUniformBufferBindingSize),
              "offsetof mismatch for Limits::maxUniformBufferBindingSize");
static_assert(offsetof(Limits, maxStorageBufferBindingSize) ==
                  offsetof(WGPULimits, maxStorageBufferBindingSize),
              "offsetof mismatch for Limits::maxStorageBufferBindingSize");
static_assert(offsetof(Limits, minUniformBufferOffsetAlignment) ==
                  offsetof(WGPULimits, minUniformBufferOffsetAlignment),
              "offsetof mismatch for Limits::minUniformBufferOffsetAlignment");
static_assert(offsetof(Limits, minStorageBufferOffsetAlignment) ==
                  offsetof(WGPULimits, minStorageBufferOffsetAlignment),
              "offsetof mismatch for Limits::minStorageBufferOffsetAlignment");
static_assert(offsetof(Limits, maxVertexBuffers) ==
                  offsetof(WGPULimits, maxVertexBuffers),
              "offsetof mismatch for Limits::maxVertexBuffers");
static_assert(offsetof(Limits, maxBufferSize) ==
                  offsetof(WGPULimits, maxBufferSize),
              "offsetof mismatch for Limits::maxBufferSize");
static_assert(offsetof(Limits, maxVertexAttributes) ==
                  offsetof(WGPULimits, maxVertexAttributes),
              "offsetof mismatch for Limits::maxVertexAttributes");
static_assert(offsetof(Limits, maxVertexBufferArrayStride) ==
                  offsetof(WGPULimits, maxVertexBufferArrayStride),
              "offsetof mismatch for Limits::maxVertexBufferArrayStride");
static_assert(offsetof(Limits, maxInterStageShaderComponents) ==
                  offsetof(WGPULimits, maxInterStageShaderComponents),
              "offsetof mismatch for Limits::maxInterStageShaderComponents");
static_assert(offsetof(Limits, maxInterStageShaderVariables) ==
                  offsetof(WGPULimits, maxInterStageShaderVariables),
              "offsetof mismatch for Limits::maxInterStageShaderVariables");
static_assert(offsetof(Limits, maxColorAttachments) ==
                  offsetof(WGPULimits, maxColorAttachments),
              "offsetof mismatch for Limits::maxColorAttachments");
static_assert(offsetof(Limits, maxColorAttachmentBytesPerSample) ==
                  offsetof(WGPULimits, maxColorAttachmentBytesPerSample),
              "offsetof mismatch for Limits::maxColorAttachmentBytesPerSample");
static_assert(offsetof(Limits, maxComputeWorkgroupStorageSize) ==
                  offsetof(WGPULimits, maxComputeWorkgroupStorageSize),
              "offsetof mismatch for Limits::maxComputeWorkgroupStorageSize");
static_assert(
    offsetof(Limits, maxComputeInvocationsPerWorkgroup) ==
        offsetof(WGPULimits, maxComputeInvocationsPerWorkgroup),
    "offsetof mismatch for Limits::maxComputeInvocationsPerWorkgroup");
static_assert(offsetof(Limits, maxComputeWorkgroupSizeX) ==
                  offsetof(WGPULimits, maxComputeWorkgroupSizeX),
              "offsetof mismatch for Limits::maxComputeWorkgroupSizeX");
static_assert(offsetof(Limits, maxComputeWorkgroupSizeY) ==
                  offsetof(WGPULimits, maxComputeWorkgroupSizeY),
              "offsetof mismatch for Limits::maxComputeWorkgroupSizeY");
static_assert(offsetof(Limits, maxComputeWorkgroupSizeZ) ==
                  offsetof(WGPULimits, maxComputeWorkgroupSizeZ),
              "offsetof mismatch for Limits::maxComputeWorkgroupSizeZ");
static_assert(offsetof(Limits, maxComputeWorkgroupsPerDimension) ==
                  offsetof(WGPULimits, maxComputeWorkgroupsPerDimension),
              "offsetof mismatch for Limits::maxComputeWorkgroupsPerDimension");

// MemoryHeapInfo

static_assert(sizeof(MemoryHeapInfo) == sizeof(WGPUMemoryHeapInfo),
              "sizeof mismatch for MemoryHeapInfo");
static_assert(alignof(MemoryHeapInfo) == alignof(WGPUMemoryHeapInfo),
              "alignof mismatch for MemoryHeapInfo");

static_assert(offsetof(MemoryHeapInfo, properties) ==
                  offsetof(WGPUMemoryHeapInfo, properties),
              "offsetof mismatch for MemoryHeapInfo::properties");
static_assert(offsetof(MemoryHeapInfo, size) ==
                  offsetof(WGPUMemoryHeapInfo, size),
              "offsetof mismatch for MemoryHeapInfo::size");

// MultisampleState

static_assert(sizeof(MultisampleState) == sizeof(WGPUMultisampleState),
              "sizeof mismatch for MultisampleState");
static_assert(alignof(MultisampleState) == alignof(WGPUMultisampleState),
              "alignof mismatch for MultisampleState");

static_assert(offsetof(MultisampleState, nextInChain) ==
                  offsetof(WGPUMultisampleState, nextInChain),
              "offsetof mismatch for MultisampleState::nextInChain");
static_assert(offsetof(MultisampleState, count) ==
                  offsetof(WGPUMultisampleState, count),
              "offsetof mismatch for MultisampleState::count");
static_assert(offsetof(MultisampleState, mask) ==
                  offsetof(WGPUMultisampleState, mask),
              "offsetof mismatch for MultisampleState::mask");
static_assert(offsetof(MultisampleState, alphaToCoverageEnabled) ==
                  offsetof(WGPUMultisampleState, alphaToCoverageEnabled),
              "offsetof mismatch for MultisampleState::alphaToCoverageEnabled");

// Origin2D

static_assert(sizeof(Origin2D) == sizeof(WGPUOrigin2D),
              "sizeof mismatch for Origin2D");
static_assert(alignof(Origin2D) == alignof(WGPUOrigin2D),
              "alignof mismatch for Origin2D");

static_assert(offsetof(Origin2D, x) == offsetof(WGPUOrigin2D, x),
              "offsetof mismatch for Origin2D::x");
static_assert(offsetof(Origin2D, y) == offsetof(WGPUOrigin2D, y),
              "offsetof mismatch for Origin2D::y");

// Origin3D

static_assert(sizeof(Origin3D) == sizeof(WGPUOrigin3D),
              "sizeof mismatch for Origin3D");
static_assert(alignof(Origin3D) == alignof(WGPUOrigin3D),
              "alignof mismatch for Origin3D");

static_assert(offsetof(Origin3D, x) == offsetof(WGPUOrigin3D, x),
              "offsetof mismatch for Origin3D::x");
static_assert(offsetof(Origin3D, y) == offsetof(WGPUOrigin3D, y),
              "offsetof mismatch for Origin3D::y");
static_assert(offsetof(Origin3D, z) == offsetof(WGPUOrigin3D, z),
              "offsetof mismatch for Origin3D::z");

// PipelineLayoutDescriptor

static_assert(sizeof(PipelineLayoutDescriptor) ==
                  sizeof(WGPUPipelineLayoutDescriptor),
              "sizeof mismatch for PipelineLayoutDescriptor");
static_assert(alignof(PipelineLayoutDescriptor) ==
                  alignof(WGPUPipelineLayoutDescriptor),
              "alignof mismatch for PipelineLayoutDescriptor");

static_assert(offsetof(PipelineLayoutDescriptor, nextInChain) ==
                  offsetof(WGPUPipelineLayoutDescriptor, nextInChain),
              "offsetof mismatch for PipelineLayoutDescriptor::nextInChain");
static_assert(offsetof(PipelineLayoutDescriptor, label) ==
                  offsetof(WGPUPipelineLayoutDescriptor, label),
              "offsetof mismatch for PipelineLayoutDescriptor::label");
static_assert(
    offsetof(PipelineLayoutDescriptor, bindGroupLayoutCount) ==
        offsetof(WGPUPipelineLayoutDescriptor, bindGroupLayoutCount),
    "offsetof mismatch for PipelineLayoutDescriptor::bindGroupLayoutCount");
static_assert(
    offsetof(PipelineLayoutDescriptor, bindGroupLayouts) ==
        offsetof(WGPUPipelineLayoutDescriptor, bindGroupLayouts),
    "offsetof mismatch for PipelineLayoutDescriptor::bindGroupLayouts");

// PipelineLayoutStorageAttachment

static_assert(sizeof(PipelineLayoutStorageAttachment) ==
                  sizeof(WGPUPipelineLayoutStorageAttachment),
              "sizeof mismatch for PipelineLayoutStorageAttachment");
static_assert(alignof(PipelineLayoutStorageAttachment) ==
                  alignof(WGPUPipelineLayoutStorageAttachment),
              "alignof mismatch for PipelineLayoutStorageAttachment");

static_assert(
    offsetof(PipelineLayoutStorageAttachment, nextInChain) ==
        offsetof(WGPUPipelineLayoutStorageAttachment, nextInChain),
    "offsetof mismatch for PipelineLayoutStorageAttachment::nextInChain");
static_assert(offsetof(PipelineLayoutStorageAttachment, offset) ==
                  offsetof(WGPUPipelineLayoutStorageAttachment, offset),
              "offsetof mismatch for PipelineLayoutStorageAttachment::offset");
static_assert(offsetof(PipelineLayoutStorageAttachment, format) ==
                  offsetof(WGPUPipelineLayoutStorageAttachment, format),
              "offsetof mismatch for PipelineLayoutStorageAttachment::format");

// PopErrorScopeCallbackInfo

static_assert(sizeof(PopErrorScopeCallbackInfo) ==
                  sizeof(WGPUPopErrorScopeCallbackInfo),
              "sizeof mismatch for PopErrorScopeCallbackInfo");
static_assert(alignof(PopErrorScopeCallbackInfo) ==
                  alignof(WGPUPopErrorScopeCallbackInfo),
              "alignof mismatch for PopErrorScopeCallbackInfo");

static_assert(offsetof(PopErrorScopeCallbackInfo, nextInChain) ==
                  offsetof(WGPUPopErrorScopeCallbackInfo, nextInChain),
              "offsetof mismatch for PopErrorScopeCallbackInfo::nextInChain");
static_assert(offsetof(PopErrorScopeCallbackInfo, mode) ==
                  offsetof(WGPUPopErrorScopeCallbackInfo, mode),
              "offsetof mismatch for PopErrorScopeCallbackInfo::mode");
static_assert(offsetof(PopErrorScopeCallbackInfo, callback) ==
                  offsetof(WGPUPopErrorScopeCallbackInfo, callback),
              "offsetof mismatch for PopErrorScopeCallbackInfo::callback");
static_assert(offsetof(PopErrorScopeCallbackInfo, oldCallback) ==
                  offsetof(WGPUPopErrorScopeCallbackInfo, oldCallback),
              "offsetof mismatch for PopErrorScopeCallbackInfo::oldCallback");
static_assert(offsetof(PopErrorScopeCallbackInfo, userdata) ==
                  offsetof(WGPUPopErrorScopeCallbackInfo, userdata),
              "offsetof mismatch for PopErrorScopeCallbackInfo::userdata");

// PrimitiveDepthClipControl

static_assert(sizeof(PrimitiveDepthClipControl) ==
                  sizeof(WGPUPrimitiveDepthClipControl),
              "sizeof mismatch for PrimitiveDepthClipControl");
static_assert(alignof(PrimitiveDepthClipControl) ==
                  alignof(WGPUPrimitiveDepthClipControl),
              "alignof mismatch for PrimitiveDepthClipControl");

static_assert(
    offsetof(PrimitiveDepthClipControl, unclippedDepth) ==
        offsetof(WGPUPrimitiveDepthClipControl, unclippedDepth),
    "offsetof mismatch for PrimitiveDepthClipControl::unclippedDepth");

// PrimitiveState

static_assert(sizeof(PrimitiveState) == sizeof(WGPUPrimitiveState),
              "sizeof mismatch for PrimitiveState");
static_assert(alignof(PrimitiveState) == alignof(WGPUPrimitiveState),
              "alignof mismatch for PrimitiveState");

static_assert(offsetof(PrimitiveState, nextInChain) ==
                  offsetof(WGPUPrimitiveState, nextInChain),
              "offsetof mismatch for PrimitiveState::nextInChain");
static_assert(offsetof(PrimitiveState, topology) ==
                  offsetof(WGPUPrimitiveState, topology),
              "offsetof mismatch for PrimitiveState::topology");
static_assert(offsetof(PrimitiveState, stripIndexFormat) ==
                  offsetof(WGPUPrimitiveState, stripIndexFormat),
              "offsetof mismatch for PrimitiveState::stripIndexFormat");
static_assert(offsetof(PrimitiveState, frontFace) ==
                  offsetof(WGPUPrimitiveState, frontFace),
              "offsetof mismatch for PrimitiveState::frontFace");
static_assert(offsetof(PrimitiveState, cullMode) ==
                  offsetof(WGPUPrimitiveState, cullMode),
              "offsetof mismatch for PrimitiveState::cullMode");

// QuerySetDescriptor

static_assert(sizeof(QuerySetDescriptor) == sizeof(WGPUQuerySetDescriptor),
              "sizeof mismatch for QuerySetDescriptor");
static_assert(alignof(QuerySetDescriptor) == alignof(WGPUQuerySetDescriptor),
              "alignof mismatch for QuerySetDescriptor");

static_assert(offsetof(QuerySetDescriptor, nextInChain) ==
                  offsetof(WGPUQuerySetDescriptor, nextInChain),
              "offsetof mismatch for QuerySetDescriptor::nextInChain");
static_assert(offsetof(QuerySetDescriptor, label) ==
                  offsetof(WGPUQuerySetDescriptor, label),
              "offsetof mismatch for QuerySetDescriptor::label");
static_assert(offsetof(QuerySetDescriptor, type) ==
                  offsetof(WGPUQuerySetDescriptor, type),
              "offsetof mismatch for QuerySetDescriptor::type");
static_assert(offsetof(QuerySetDescriptor, count) ==
                  offsetof(WGPUQuerySetDescriptor, count),
              "offsetof mismatch for QuerySetDescriptor::count");

// QueueDescriptor

static_assert(sizeof(QueueDescriptor) == sizeof(WGPUQueueDescriptor),
              "sizeof mismatch for QueueDescriptor");
static_assert(alignof(QueueDescriptor) == alignof(WGPUQueueDescriptor),
              "alignof mismatch for QueueDescriptor");

static_assert(offsetof(QueueDescriptor, nextInChain) ==
                  offsetof(WGPUQueueDescriptor, nextInChain),
              "offsetof mismatch for QueueDescriptor::nextInChain");
static_assert(offsetof(QueueDescriptor, label) ==
                  offsetof(WGPUQueueDescriptor, label),
              "offsetof mismatch for QueueDescriptor::label");

// QueueWorkDoneCallbackInfo

static_assert(sizeof(QueueWorkDoneCallbackInfo) ==
                  sizeof(WGPUQueueWorkDoneCallbackInfo),
              "sizeof mismatch for QueueWorkDoneCallbackInfo");
static_assert(alignof(QueueWorkDoneCallbackInfo) ==
                  alignof(WGPUQueueWorkDoneCallbackInfo),
              "alignof mismatch for QueueWorkDoneCallbackInfo");

static_assert(offsetof(QueueWorkDoneCallbackInfo, nextInChain) ==
                  offsetof(WGPUQueueWorkDoneCallbackInfo, nextInChain),
              "offsetof mismatch for QueueWorkDoneCallbackInfo::nextInChain");
static_assert(offsetof(QueueWorkDoneCallbackInfo, mode) ==
                  offsetof(WGPUQueueWorkDoneCallbackInfo, mode),
              "offsetof mismatch for QueueWorkDoneCallbackInfo::mode");
static_assert(offsetof(QueueWorkDoneCallbackInfo, callback) ==
                  offsetof(WGPUQueueWorkDoneCallbackInfo, callback),
              "offsetof mismatch for QueueWorkDoneCallbackInfo::callback");
static_assert(offsetof(QueueWorkDoneCallbackInfo, userdata) ==
                  offsetof(WGPUQueueWorkDoneCallbackInfo, userdata),
              "offsetof mismatch for QueueWorkDoneCallbackInfo::userdata");

// RenderBundleDescriptor

static_assert(sizeof(RenderBundleDescriptor) ==
                  sizeof(WGPURenderBundleDescriptor),
              "sizeof mismatch for RenderBundleDescriptor");
static_assert(alignof(RenderBundleDescriptor) ==
                  alignof(WGPURenderBundleDescriptor),
              "alignof mismatch for RenderBundleDescriptor");

static_assert(offsetof(RenderBundleDescriptor, nextInChain) ==
                  offsetof(WGPURenderBundleDescriptor, nextInChain),
              "offsetof mismatch for RenderBundleDescriptor::nextInChain");
static_assert(offsetof(RenderBundleDescriptor, label) ==
                  offsetof(WGPURenderBundleDescriptor, label),
              "offsetof mismatch for RenderBundleDescriptor::label");

// RenderBundleEncoderDescriptor

static_assert(sizeof(RenderBundleEncoderDescriptor) ==
                  sizeof(WGPURenderBundleEncoderDescriptor),
              "sizeof mismatch for RenderBundleEncoderDescriptor");
static_assert(alignof(RenderBundleEncoderDescriptor) ==
                  alignof(WGPURenderBundleEncoderDescriptor),
              "alignof mismatch for RenderBundleEncoderDescriptor");

static_assert(
    offsetof(RenderBundleEncoderDescriptor, nextInChain) ==
        offsetof(WGPURenderBundleEncoderDescriptor, nextInChain),
    "offsetof mismatch for RenderBundleEncoderDescriptor::nextInChain");
static_assert(offsetof(RenderBundleEncoderDescriptor, label) ==
                  offsetof(WGPURenderBundleEncoderDescriptor, label),
              "offsetof mismatch for RenderBundleEncoderDescriptor::label");
static_assert(
    offsetof(RenderBundleEncoderDescriptor, colorFormatCount) ==
        offsetof(WGPURenderBundleEncoderDescriptor, colorFormatCount),
    "offsetof mismatch for RenderBundleEncoderDescriptor::colorFormatCount");
static_assert(
    offsetof(RenderBundleEncoderDescriptor, colorFormats) ==
        offsetof(WGPURenderBundleEncoderDescriptor, colorFormats),
    "offsetof mismatch for RenderBundleEncoderDescriptor::colorFormats");
static_assert(
    offsetof(RenderBundleEncoderDescriptor, depthStencilFormat) ==
        offsetof(WGPURenderBundleEncoderDescriptor, depthStencilFormat),
    "offsetof mismatch for RenderBundleEncoderDescriptor::depthStencilFormat");
static_assert(
    offsetof(RenderBundleEncoderDescriptor, sampleCount) ==
        offsetof(WGPURenderBundleEncoderDescriptor, sampleCount),
    "offsetof mismatch for RenderBundleEncoderDescriptor::sampleCount");
static_assert(
    offsetof(RenderBundleEncoderDescriptor, depthReadOnly) ==
        offsetof(WGPURenderBundleEncoderDescriptor, depthReadOnly),
    "offsetof mismatch for RenderBundleEncoderDescriptor::depthReadOnly");
static_assert(
    offsetof(RenderBundleEncoderDescriptor, stencilReadOnly) ==
        offsetof(WGPURenderBundleEncoderDescriptor, stencilReadOnly),
    "offsetof mismatch for RenderBundleEncoderDescriptor::stencilReadOnly");

// RenderPassDepthStencilAttachment

static_assert(sizeof(RenderPassDepthStencilAttachment) ==
                  sizeof(WGPURenderPassDepthStencilAttachment),
              "sizeof mismatch for RenderPassDepthStencilAttachment");
static_assert(alignof(RenderPassDepthStencilAttachment) ==
                  alignof(WGPURenderPassDepthStencilAttachment),
              "alignof mismatch for RenderPassDepthStencilAttachment");

static_assert(offsetof(RenderPassDepthStencilAttachment, view) ==
                  offsetof(WGPURenderPassDepthStencilAttachment, view),
              "offsetof mismatch for RenderPassDepthStencilAttachment::view");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, depthLoadOp) ==
        offsetof(WGPURenderPassDepthStencilAttachment, depthLoadOp),
    "offsetof mismatch for RenderPassDepthStencilAttachment::depthLoadOp");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, depthStoreOp) ==
        offsetof(WGPURenderPassDepthStencilAttachment, depthStoreOp),
    "offsetof mismatch for RenderPassDepthStencilAttachment::depthStoreOp");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, depthClearValue) ==
        offsetof(WGPURenderPassDepthStencilAttachment, depthClearValue),
    "offsetof mismatch for RenderPassDepthStencilAttachment::depthClearValue");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, depthReadOnly) ==
        offsetof(WGPURenderPassDepthStencilAttachment, depthReadOnly),
    "offsetof mismatch for RenderPassDepthStencilAttachment::depthReadOnly");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, stencilLoadOp) ==
        offsetof(WGPURenderPassDepthStencilAttachment, stencilLoadOp),
    "offsetof mismatch for RenderPassDepthStencilAttachment::stencilLoadOp");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, stencilStoreOp) ==
        offsetof(WGPURenderPassDepthStencilAttachment, stencilStoreOp),
    "offsetof mismatch for RenderPassDepthStencilAttachment::stencilStoreOp");
static_assert(offsetof(RenderPassDepthStencilAttachment, stencilClearValue) ==
                  offsetof(WGPURenderPassDepthStencilAttachment,
                           stencilClearValue),
              "offsetof mismatch for "
              "RenderPassDepthStencilAttachment::stencilClearValue");
static_assert(
    offsetof(RenderPassDepthStencilAttachment, stencilReadOnly) ==
        offsetof(WGPURenderPassDepthStencilAttachment, stencilReadOnly),
    "offsetof mismatch for RenderPassDepthStencilAttachment::stencilReadOnly");

// RenderPassDescriptorMaxDrawCount

static_assert(sizeof(RenderPassDescriptorMaxDrawCount) ==
                  sizeof(WGPURenderPassDescriptorMaxDrawCount),
              "sizeof mismatch for RenderPassDescriptorMaxDrawCount");
static_assert(alignof(RenderPassDescriptorMaxDrawCount) ==
                  alignof(WGPURenderPassDescriptorMaxDrawCount),
              "alignof mismatch for RenderPassDescriptorMaxDrawCount");

static_assert(
    offsetof(RenderPassDescriptorMaxDrawCount, maxDrawCount) ==
        offsetof(WGPURenderPassDescriptorMaxDrawCount, maxDrawCount),
    "offsetof mismatch for RenderPassDescriptorMaxDrawCount::maxDrawCount");

// RenderPassTimestampWrites

static_assert(sizeof(RenderPassTimestampWrites) ==
                  sizeof(WGPURenderPassTimestampWrites),
              "sizeof mismatch for RenderPassTimestampWrites");
static_assert(alignof(RenderPassTimestampWrites) ==
                  alignof(WGPURenderPassTimestampWrites),
              "alignof mismatch for RenderPassTimestampWrites");

static_assert(offsetof(RenderPassTimestampWrites, querySet) ==
                  offsetof(WGPURenderPassTimestampWrites, querySet),
              "offsetof mismatch for RenderPassTimestampWrites::querySet");
static_assert(offsetof(RenderPassTimestampWrites, beginningOfPassWriteIndex) ==
                  offsetof(WGPURenderPassTimestampWrites,
                           beginningOfPassWriteIndex),
              "offsetof mismatch for "
              "RenderPassTimestampWrites::beginningOfPassWriteIndex");
static_assert(
    offsetof(RenderPassTimestampWrites, endOfPassWriteIndex) ==
        offsetof(WGPURenderPassTimestampWrites, endOfPassWriteIndex),
    "offsetof mismatch for RenderPassTimestampWrites::endOfPassWriteIndex");

// RequestAdapterCallbackInfo

static_assert(sizeof(RequestAdapterCallbackInfo) ==
                  sizeof(WGPURequestAdapterCallbackInfo),
              "sizeof mismatch for RequestAdapterCallbackInfo");
static_assert(alignof(RequestAdapterCallbackInfo) ==
                  alignof(WGPURequestAdapterCallbackInfo),
              "alignof mismatch for RequestAdapterCallbackInfo");

static_assert(offsetof(RequestAdapterCallbackInfo, nextInChain) ==
                  offsetof(WGPURequestAdapterCallbackInfo, nextInChain),
              "offsetof mismatch for RequestAdapterCallbackInfo::nextInChain");
static_assert(offsetof(RequestAdapterCallbackInfo, mode) ==
                  offsetof(WGPURequestAdapterCallbackInfo, mode),
              "offsetof mismatch for RequestAdapterCallbackInfo::mode");
static_assert(offsetof(RequestAdapterCallbackInfo, callback) ==
                  offsetof(WGPURequestAdapterCallbackInfo, callback),
              "offsetof mismatch for RequestAdapterCallbackInfo::callback");
static_assert(offsetof(RequestAdapterCallbackInfo, userdata) ==
                  offsetof(WGPURequestAdapterCallbackInfo, userdata),
              "offsetof mismatch for RequestAdapterCallbackInfo::userdata");

// RequestAdapterOptions

static_assert(sizeof(RequestAdapterOptions) ==
                  sizeof(WGPURequestAdapterOptions),
              "sizeof mismatch for RequestAdapterOptions");
static_assert(alignof(RequestAdapterOptions) ==
                  alignof(WGPURequestAdapterOptions),
              "alignof mismatch for RequestAdapterOptions");

static_assert(offsetof(RequestAdapterOptions, nextInChain) ==
                  offsetof(WGPURequestAdapterOptions, nextInChain),
              "offsetof mismatch for RequestAdapterOptions::nextInChain");
static_assert(offsetof(RequestAdapterOptions, compatibleSurface) ==
                  offsetof(WGPURequestAdapterOptions, compatibleSurface),
              "offsetof mismatch for RequestAdapterOptions::compatibleSurface");
static_assert(offsetof(RequestAdapterOptions, powerPreference) ==
                  offsetof(WGPURequestAdapterOptions, powerPreference),
              "offsetof mismatch for RequestAdapterOptions::powerPreference");
static_assert(offsetof(RequestAdapterOptions, backendType) ==
                  offsetof(WGPURequestAdapterOptions, backendType),
              "offsetof mismatch for RequestAdapterOptions::backendType");
static_assert(
    offsetof(RequestAdapterOptions, forceFallbackAdapter) ==
        offsetof(WGPURequestAdapterOptions, forceFallbackAdapter),
    "offsetof mismatch for RequestAdapterOptions::forceFallbackAdapter");
static_assert(offsetof(RequestAdapterOptions, compatibilityMode) ==
                  offsetof(WGPURequestAdapterOptions, compatibilityMode),
              "offsetof mismatch for RequestAdapterOptions::compatibilityMode");

// RequestDeviceCallbackInfo

static_assert(sizeof(RequestDeviceCallbackInfo) ==
                  sizeof(WGPURequestDeviceCallbackInfo),
              "sizeof mismatch for RequestDeviceCallbackInfo");
static_assert(alignof(RequestDeviceCallbackInfo) ==
                  alignof(WGPURequestDeviceCallbackInfo),
              "alignof mismatch for RequestDeviceCallbackInfo");

static_assert(offsetof(RequestDeviceCallbackInfo, nextInChain) ==
                  offsetof(WGPURequestDeviceCallbackInfo, nextInChain),
              "offsetof mismatch for RequestDeviceCallbackInfo::nextInChain");
static_assert(offsetof(RequestDeviceCallbackInfo, mode) ==
                  offsetof(WGPURequestDeviceCallbackInfo, mode),
              "offsetof mismatch for RequestDeviceCallbackInfo::mode");
static_assert(offsetof(RequestDeviceCallbackInfo, callback) ==
                  offsetof(WGPURequestDeviceCallbackInfo, callback),
              "offsetof mismatch for RequestDeviceCallbackInfo::callback");
static_assert(offsetof(RequestDeviceCallbackInfo, userdata) ==
                  offsetof(WGPURequestDeviceCallbackInfo, userdata),
              "offsetof mismatch for RequestDeviceCallbackInfo::userdata");

// SamplerBindingLayout

static_assert(sizeof(SamplerBindingLayout) == sizeof(WGPUSamplerBindingLayout),
              "sizeof mismatch for SamplerBindingLayout");
static_assert(alignof(SamplerBindingLayout) ==
                  alignof(WGPUSamplerBindingLayout),
              "alignof mismatch for SamplerBindingLayout");

static_assert(offsetof(SamplerBindingLayout, nextInChain) ==
                  offsetof(WGPUSamplerBindingLayout, nextInChain),
              "offsetof mismatch for SamplerBindingLayout::nextInChain");
static_assert(offsetof(SamplerBindingLayout, type) ==
                  offsetof(WGPUSamplerBindingLayout, type),
              "offsetof mismatch for SamplerBindingLayout::type");

// SamplerDescriptor

static_assert(sizeof(SamplerDescriptor) == sizeof(WGPUSamplerDescriptor),
              "sizeof mismatch for SamplerDescriptor");
static_assert(alignof(SamplerDescriptor) == alignof(WGPUSamplerDescriptor),
              "alignof mismatch for SamplerDescriptor");

static_assert(offsetof(SamplerDescriptor, nextInChain) ==
                  offsetof(WGPUSamplerDescriptor, nextInChain),
              "offsetof mismatch for SamplerDescriptor::nextInChain");
static_assert(offsetof(SamplerDescriptor, label) ==
                  offsetof(WGPUSamplerDescriptor, label),
              "offsetof mismatch for SamplerDescriptor::label");
static_assert(offsetof(SamplerDescriptor, addressModeU) ==
                  offsetof(WGPUSamplerDescriptor, addressModeU),
              "offsetof mismatch for SamplerDescriptor::addressModeU");
static_assert(offsetof(SamplerDescriptor, addressModeV) ==
                  offsetof(WGPUSamplerDescriptor, addressModeV),
              "offsetof mismatch for SamplerDescriptor::addressModeV");
static_assert(offsetof(SamplerDescriptor, addressModeW) ==
                  offsetof(WGPUSamplerDescriptor, addressModeW),
              "offsetof mismatch for SamplerDescriptor::addressModeW");
static_assert(offsetof(SamplerDescriptor, magFilter) ==
                  offsetof(WGPUSamplerDescriptor, magFilter),
              "offsetof mismatch for SamplerDescriptor::magFilter");
static_assert(offsetof(SamplerDescriptor, minFilter) ==
                  offsetof(WGPUSamplerDescriptor, minFilter),
              "offsetof mismatch for SamplerDescriptor::minFilter");
static_assert(offsetof(SamplerDescriptor, mipmapFilter) ==
                  offsetof(WGPUSamplerDescriptor, mipmapFilter),
              "offsetof mismatch for SamplerDescriptor::mipmapFilter");
static_assert(offsetof(SamplerDescriptor, lodMinClamp) ==
                  offsetof(WGPUSamplerDescriptor, lodMinClamp),
              "offsetof mismatch for SamplerDescriptor::lodMinClamp");
static_assert(offsetof(SamplerDescriptor, lodMaxClamp) ==
                  offsetof(WGPUSamplerDescriptor, lodMaxClamp),
              "offsetof mismatch for SamplerDescriptor::lodMaxClamp");
static_assert(offsetof(SamplerDescriptor, compare) ==
                  offsetof(WGPUSamplerDescriptor, compare),
              "offsetof mismatch for SamplerDescriptor::compare");
static_assert(offsetof(SamplerDescriptor, maxAnisotropy) ==
                  offsetof(WGPUSamplerDescriptor, maxAnisotropy),
              "offsetof mismatch for SamplerDescriptor::maxAnisotropy");

// ShaderModuleSPIRVDescriptor

static_assert(sizeof(ShaderModuleSPIRVDescriptor) ==
                  sizeof(WGPUShaderModuleSPIRVDescriptor),
              "sizeof mismatch for ShaderModuleSPIRVDescriptor");
static_assert(alignof(ShaderModuleSPIRVDescriptor) ==
                  alignof(WGPUShaderModuleSPIRVDescriptor),
              "alignof mismatch for ShaderModuleSPIRVDescriptor");

static_assert(offsetof(ShaderModuleSPIRVDescriptor, codeSize) ==
                  offsetof(WGPUShaderModuleSPIRVDescriptor, codeSize),
              "offsetof mismatch for ShaderModuleSPIRVDescriptor::codeSize");
static_assert(offsetof(ShaderModuleSPIRVDescriptor, code) ==
                  offsetof(WGPUShaderModuleSPIRVDescriptor, code),
              "offsetof mismatch for ShaderModuleSPIRVDescriptor::code");

// ShaderModuleWGSLDescriptor

static_assert(sizeof(ShaderModuleWGSLDescriptor) ==
                  sizeof(WGPUShaderModuleWGSLDescriptor),
              "sizeof mismatch for ShaderModuleWGSLDescriptor");
static_assert(alignof(ShaderModuleWGSLDescriptor) ==
                  alignof(WGPUShaderModuleWGSLDescriptor),
              "alignof mismatch for ShaderModuleWGSLDescriptor");

static_assert(offsetof(ShaderModuleWGSLDescriptor, code) ==
                  offsetof(WGPUShaderModuleWGSLDescriptor, code),
              "offsetof mismatch for ShaderModuleWGSLDescriptor::code");

// ShaderModuleDescriptor

static_assert(sizeof(ShaderModuleDescriptor) ==
                  sizeof(WGPUShaderModuleDescriptor),
              "sizeof mismatch for ShaderModuleDescriptor");
static_assert(alignof(ShaderModuleDescriptor) ==
                  alignof(WGPUShaderModuleDescriptor),
              "alignof mismatch for ShaderModuleDescriptor");

static_assert(offsetof(ShaderModuleDescriptor, nextInChain) ==
                  offsetof(WGPUShaderModuleDescriptor, nextInChain),
              "offsetof mismatch for ShaderModuleDescriptor::nextInChain");
static_assert(offsetof(ShaderModuleDescriptor, label) ==
                  offsetof(WGPUShaderModuleDescriptor, label),
              "offsetof mismatch for ShaderModuleDescriptor::label");

// SharedBufferMemoryBeginAccessDescriptor

static_assert(sizeof(SharedBufferMemoryBeginAccessDescriptor) ==
                  sizeof(WGPUSharedBufferMemoryBeginAccessDescriptor),
              "sizeof mismatch for SharedBufferMemoryBeginAccessDescriptor");
static_assert(alignof(SharedBufferMemoryBeginAccessDescriptor) ==
                  alignof(WGPUSharedBufferMemoryBeginAccessDescriptor),
              "alignof mismatch for SharedBufferMemoryBeginAccessDescriptor");

static_assert(offsetof(SharedBufferMemoryBeginAccessDescriptor, nextInChain) ==
                  offsetof(WGPUSharedBufferMemoryBeginAccessDescriptor,
                           nextInChain),
              "offsetof mismatch for "
              "SharedBufferMemoryBeginAccessDescriptor::nextInChain");
static_assert(offsetof(SharedBufferMemoryBeginAccessDescriptor, initialized) ==
                  offsetof(WGPUSharedBufferMemoryBeginAccessDescriptor,
                           initialized),
              "offsetof mismatch for "
              "SharedBufferMemoryBeginAccessDescriptor::initialized");
static_assert(offsetof(SharedBufferMemoryBeginAccessDescriptor, fenceCount) ==
                  offsetof(WGPUSharedBufferMemoryBeginAccessDescriptor,
                           fenceCount),
              "offsetof mismatch for "
              "SharedBufferMemoryBeginAccessDescriptor::fenceCount");
static_assert(
    offsetof(SharedBufferMemoryBeginAccessDescriptor, fences) ==
        offsetof(WGPUSharedBufferMemoryBeginAccessDescriptor, fences),
    "offsetof mismatch for SharedBufferMemoryBeginAccessDescriptor::fences");
static_assert(offsetof(SharedBufferMemoryBeginAccessDescriptor,
                       signaledValues) ==
                  offsetof(WGPUSharedBufferMemoryBeginAccessDescriptor,
                           signaledValues),
              "offsetof mismatch for "
              "SharedBufferMemoryBeginAccessDescriptor::signaledValues");

// SharedBufferMemoryDescriptor

static_assert(sizeof(SharedBufferMemoryDescriptor) ==
                  sizeof(WGPUSharedBufferMemoryDescriptor),
              "sizeof mismatch for SharedBufferMemoryDescriptor");
static_assert(alignof(SharedBufferMemoryDescriptor) ==
                  alignof(WGPUSharedBufferMemoryDescriptor),
              "alignof mismatch for SharedBufferMemoryDescriptor");

static_assert(
    offsetof(SharedBufferMemoryDescriptor, nextInChain) ==
        offsetof(WGPUSharedBufferMemoryDescriptor, nextInChain),
    "offsetof mismatch for SharedBufferMemoryDescriptor::nextInChain");
static_assert(offsetof(SharedBufferMemoryDescriptor, label) ==
                  offsetof(WGPUSharedBufferMemoryDescriptor, label),
              "offsetof mismatch for SharedBufferMemoryDescriptor::label");

// SharedBufferMemoryEndAccessState

static_assert(sizeof(SharedBufferMemoryEndAccessState) ==
                  sizeof(WGPUSharedBufferMemoryEndAccessState),
              "sizeof mismatch for SharedBufferMemoryEndAccessState");
static_assert(alignof(SharedBufferMemoryEndAccessState) ==
                  alignof(WGPUSharedBufferMemoryEndAccessState),
              "alignof mismatch for SharedBufferMemoryEndAccessState");

static_assert(
    offsetof(SharedBufferMemoryEndAccessState, nextInChain) ==
        offsetof(WGPUSharedBufferMemoryEndAccessState, nextInChain),
    "offsetof mismatch for SharedBufferMemoryEndAccessState::nextInChain");
static_assert(
    offsetof(SharedBufferMemoryEndAccessState, initialized) ==
        offsetof(WGPUSharedBufferMemoryEndAccessState, initialized),
    "offsetof mismatch for SharedBufferMemoryEndAccessState::initialized");
static_assert(
    offsetof(SharedBufferMemoryEndAccessState, fenceCount) ==
        offsetof(WGPUSharedBufferMemoryEndAccessState, fenceCount),
    "offsetof mismatch for SharedBufferMemoryEndAccessState::fenceCount");
static_assert(offsetof(SharedBufferMemoryEndAccessState, fences) ==
                  offsetof(WGPUSharedBufferMemoryEndAccessState, fences),
              "offsetof mismatch for SharedBufferMemoryEndAccessState::fences");
static_assert(
    offsetof(SharedBufferMemoryEndAccessState, signaledValues) ==
        offsetof(WGPUSharedBufferMemoryEndAccessState, signaledValues),
    "offsetof mismatch for SharedBufferMemoryEndAccessState::signaledValues");

// SharedBufferMemoryProperties

static_assert(sizeof(SharedBufferMemoryProperties) ==
                  sizeof(WGPUSharedBufferMemoryProperties),
              "sizeof mismatch for SharedBufferMemoryProperties");
static_assert(alignof(SharedBufferMemoryProperties) ==
                  alignof(WGPUSharedBufferMemoryProperties),
              "alignof mismatch for SharedBufferMemoryProperties");

static_assert(
    offsetof(SharedBufferMemoryProperties, nextInChain) ==
        offsetof(WGPUSharedBufferMemoryProperties, nextInChain),
    "offsetof mismatch for SharedBufferMemoryProperties::nextInChain");
static_assert(offsetof(SharedBufferMemoryProperties, usage) ==
                  offsetof(WGPUSharedBufferMemoryProperties, usage),
              "offsetof mismatch for SharedBufferMemoryProperties::usage");
static_assert(offsetof(SharedBufferMemoryProperties, size) ==
                  offsetof(WGPUSharedBufferMemoryProperties, size),
              "offsetof mismatch for SharedBufferMemoryProperties::size");

// SharedFenceDXGISharedHandleDescriptor

static_assert(sizeof(SharedFenceDXGISharedHandleDescriptor) ==
                  sizeof(WGPUSharedFenceDXGISharedHandleDescriptor),
              "sizeof mismatch for SharedFenceDXGISharedHandleDescriptor");
static_assert(alignof(SharedFenceDXGISharedHandleDescriptor) ==
                  alignof(WGPUSharedFenceDXGISharedHandleDescriptor),
              "alignof mismatch for SharedFenceDXGISharedHandleDescriptor");

static_assert(
    offsetof(SharedFenceDXGISharedHandleDescriptor, handle) ==
        offsetof(WGPUSharedFenceDXGISharedHandleDescriptor, handle),
    "offsetof mismatch for SharedFenceDXGISharedHandleDescriptor::handle");

// SharedFenceDXGISharedHandleExportInfo

static_assert(sizeof(SharedFenceDXGISharedHandleExportInfo) ==
                  sizeof(WGPUSharedFenceDXGISharedHandleExportInfo),
              "sizeof mismatch for SharedFenceDXGISharedHandleExportInfo");
static_assert(alignof(SharedFenceDXGISharedHandleExportInfo) ==
                  alignof(WGPUSharedFenceDXGISharedHandleExportInfo),
              "alignof mismatch for SharedFenceDXGISharedHandleExportInfo");

static_assert(
    offsetof(SharedFenceDXGISharedHandleExportInfo, handle) ==
        offsetof(WGPUSharedFenceDXGISharedHandleExportInfo, handle),
    "offsetof mismatch for SharedFenceDXGISharedHandleExportInfo::handle");

// SharedFenceMTLSharedEventDescriptor

static_assert(sizeof(SharedFenceMTLSharedEventDescriptor) ==
                  sizeof(WGPUSharedFenceMTLSharedEventDescriptor),
              "sizeof mismatch for SharedFenceMTLSharedEventDescriptor");
static_assert(alignof(SharedFenceMTLSharedEventDescriptor) ==
                  alignof(WGPUSharedFenceMTLSharedEventDescriptor),
              "alignof mismatch for SharedFenceMTLSharedEventDescriptor");

static_assert(
    offsetof(SharedFenceMTLSharedEventDescriptor, sharedEvent) ==
        offsetof(WGPUSharedFenceMTLSharedEventDescriptor, sharedEvent),
    "offsetof mismatch for SharedFenceMTLSharedEventDescriptor::sharedEvent");

// SharedFenceMTLSharedEventExportInfo

static_assert(sizeof(SharedFenceMTLSharedEventExportInfo) ==
                  sizeof(WGPUSharedFenceMTLSharedEventExportInfo),
              "sizeof mismatch for SharedFenceMTLSharedEventExportInfo");
static_assert(alignof(SharedFenceMTLSharedEventExportInfo) ==
                  alignof(WGPUSharedFenceMTLSharedEventExportInfo),
              "alignof mismatch for SharedFenceMTLSharedEventExportInfo");

static_assert(
    offsetof(SharedFenceMTLSharedEventExportInfo, sharedEvent) ==
        offsetof(WGPUSharedFenceMTLSharedEventExportInfo, sharedEvent),
    "offsetof mismatch for SharedFenceMTLSharedEventExportInfo::sharedEvent");

// SharedFenceDescriptor

static_assert(sizeof(SharedFenceDescriptor) ==
                  sizeof(WGPUSharedFenceDescriptor),
              "sizeof mismatch for SharedFenceDescriptor");
static_assert(alignof(SharedFenceDescriptor) ==
                  alignof(WGPUSharedFenceDescriptor),
              "alignof mismatch for SharedFenceDescriptor");

static_assert(offsetof(SharedFenceDescriptor, nextInChain) ==
                  offsetof(WGPUSharedFenceDescriptor, nextInChain),
              "offsetof mismatch for SharedFenceDescriptor::nextInChain");
static_assert(offsetof(SharedFenceDescriptor, label) ==
                  offsetof(WGPUSharedFenceDescriptor, label),
              "offsetof mismatch for SharedFenceDescriptor::label");

// SharedFenceExportInfo

static_assert(sizeof(SharedFenceExportInfo) ==
                  sizeof(WGPUSharedFenceExportInfo),
              "sizeof mismatch for SharedFenceExportInfo");
static_assert(alignof(SharedFenceExportInfo) ==
                  alignof(WGPUSharedFenceExportInfo),
              "alignof mismatch for SharedFenceExportInfo");

static_assert(offsetof(SharedFenceExportInfo, nextInChain) ==
                  offsetof(WGPUSharedFenceExportInfo, nextInChain),
              "offsetof mismatch for SharedFenceExportInfo::nextInChain");
static_assert(offsetof(SharedFenceExportInfo, type) ==
                  offsetof(WGPUSharedFenceExportInfo, type),
              "offsetof mismatch for SharedFenceExportInfo::type");

// SharedFenceVkSemaphoreOpaqueFDDescriptor

static_assert(sizeof(SharedFenceVkSemaphoreOpaqueFDDescriptor) ==
                  sizeof(WGPUSharedFenceVkSemaphoreOpaqueFDDescriptor),
              "sizeof mismatch for SharedFenceVkSemaphoreOpaqueFDDescriptor");
static_assert(alignof(SharedFenceVkSemaphoreOpaqueFDDescriptor) ==
                  alignof(WGPUSharedFenceVkSemaphoreOpaqueFDDescriptor),
              "alignof mismatch for SharedFenceVkSemaphoreOpaqueFDDescriptor");

static_assert(
    offsetof(SharedFenceVkSemaphoreOpaqueFDDescriptor, handle) ==
        offsetof(WGPUSharedFenceVkSemaphoreOpaqueFDDescriptor, handle),
    "offsetof mismatch for SharedFenceVkSemaphoreOpaqueFDDescriptor::handle");

// SharedFenceVkSemaphoreOpaqueFDExportInfo

static_assert(sizeof(SharedFenceVkSemaphoreOpaqueFDExportInfo) ==
                  sizeof(WGPUSharedFenceVkSemaphoreOpaqueFDExportInfo),
              "sizeof mismatch for SharedFenceVkSemaphoreOpaqueFDExportInfo");
static_assert(alignof(SharedFenceVkSemaphoreOpaqueFDExportInfo) ==
                  alignof(WGPUSharedFenceVkSemaphoreOpaqueFDExportInfo),
              "alignof mismatch for SharedFenceVkSemaphoreOpaqueFDExportInfo");

static_assert(
    offsetof(SharedFenceVkSemaphoreOpaqueFDExportInfo, handle) ==
        offsetof(WGPUSharedFenceVkSemaphoreOpaqueFDExportInfo, handle),
    "offsetof mismatch for SharedFenceVkSemaphoreOpaqueFDExportInfo::handle");

// SharedFenceVkSemaphoreSyncFDDescriptor

static_assert(sizeof(SharedFenceVkSemaphoreSyncFDDescriptor) ==
                  sizeof(WGPUSharedFenceVkSemaphoreSyncFDDescriptor),
              "sizeof mismatch for SharedFenceVkSemaphoreSyncFDDescriptor");
static_assert(alignof(SharedFenceVkSemaphoreSyncFDDescriptor) ==
                  alignof(WGPUSharedFenceVkSemaphoreSyncFDDescriptor),
              "alignof mismatch for SharedFenceVkSemaphoreSyncFDDescriptor");

static_assert(
    offsetof(SharedFenceVkSemaphoreSyncFDDescriptor, handle) ==
        offsetof(WGPUSharedFenceVkSemaphoreSyncFDDescriptor, handle),
    "offsetof mismatch for SharedFenceVkSemaphoreSyncFDDescriptor::handle");

// SharedFenceVkSemaphoreSyncFDExportInfo

static_assert(sizeof(SharedFenceVkSemaphoreSyncFDExportInfo) ==
                  sizeof(WGPUSharedFenceVkSemaphoreSyncFDExportInfo),
              "sizeof mismatch for SharedFenceVkSemaphoreSyncFDExportInfo");
static_assert(alignof(SharedFenceVkSemaphoreSyncFDExportInfo) ==
                  alignof(WGPUSharedFenceVkSemaphoreSyncFDExportInfo),
              "alignof mismatch for SharedFenceVkSemaphoreSyncFDExportInfo");

static_assert(
    offsetof(SharedFenceVkSemaphoreSyncFDExportInfo, handle) ==
        offsetof(WGPUSharedFenceVkSemaphoreSyncFDExportInfo, handle),
    "offsetof mismatch for SharedFenceVkSemaphoreSyncFDExportInfo::handle");

// SharedFenceVkSemaphoreZirconHandleDescriptor

static_assert(
    sizeof(SharedFenceVkSemaphoreZirconHandleDescriptor) ==
        sizeof(WGPUSharedFenceVkSemaphoreZirconHandleDescriptor),
    "sizeof mismatch for SharedFenceVkSemaphoreZirconHandleDescriptor");
static_assert(
    alignof(SharedFenceVkSemaphoreZirconHandleDescriptor) ==
        alignof(WGPUSharedFenceVkSemaphoreZirconHandleDescriptor),
    "alignof mismatch for SharedFenceVkSemaphoreZirconHandleDescriptor");

static_assert(offsetof(SharedFenceVkSemaphoreZirconHandleDescriptor, handle) ==
                  offsetof(WGPUSharedFenceVkSemaphoreZirconHandleDescriptor,
                           handle),
              "offsetof mismatch for "
              "SharedFenceVkSemaphoreZirconHandleDescriptor::handle");

// SharedFenceVkSemaphoreZirconHandleExportInfo

static_assert(
    sizeof(SharedFenceVkSemaphoreZirconHandleExportInfo) ==
        sizeof(WGPUSharedFenceVkSemaphoreZirconHandleExportInfo),
    "sizeof mismatch for SharedFenceVkSemaphoreZirconHandleExportInfo");
static_assert(
    alignof(SharedFenceVkSemaphoreZirconHandleExportInfo) ==
        alignof(WGPUSharedFenceVkSemaphoreZirconHandleExportInfo),
    "alignof mismatch for SharedFenceVkSemaphoreZirconHandleExportInfo");

static_assert(offsetof(SharedFenceVkSemaphoreZirconHandleExportInfo, handle) ==
                  offsetof(WGPUSharedFenceVkSemaphoreZirconHandleExportInfo,
                           handle),
              "offsetof mismatch for "
              "SharedFenceVkSemaphoreZirconHandleExportInfo::handle");

// SharedTextureMemoryDXGISharedHandleDescriptor

static_assert(
    sizeof(SharedTextureMemoryDXGISharedHandleDescriptor) ==
        sizeof(WGPUSharedTextureMemoryDXGISharedHandleDescriptor),
    "sizeof mismatch for SharedTextureMemoryDXGISharedHandleDescriptor");
static_assert(
    alignof(SharedTextureMemoryDXGISharedHandleDescriptor) ==
        alignof(WGPUSharedTextureMemoryDXGISharedHandleDescriptor),
    "alignof mismatch for SharedTextureMemoryDXGISharedHandleDescriptor");

static_assert(offsetof(SharedTextureMemoryDXGISharedHandleDescriptor, handle) ==
                  offsetof(WGPUSharedTextureMemoryDXGISharedHandleDescriptor,
                           handle),
              "offsetof mismatch for "
              "SharedTextureMemoryDXGISharedHandleDescriptor::handle");
static_assert(offsetof(SharedTextureMemoryDXGISharedHandleDescriptor,
                       useKeyedMutex) ==
                  offsetof(WGPUSharedTextureMemoryDXGISharedHandleDescriptor,
                           useKeyedMutex),
              "offsetof mismatch for "
              "SharedTextureMemoryDXGISharedHandleDescriptor::useKeyedMutex");

// SharedTextureMemoryEGLImageDescriptor

static_assert(sizeof(SharedTextureMemoryEGLImageDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryEGLImageDescriptor),
              "sizeof mismatch for SharedTextureMemoryEGLImageDescriptor");
static_assert(alignof(SharedTextureMemoryEGLImageDescriptor) ==
                  alignof(WGPUSharedTextureMemoryEGLImageDescriptor),
              "alignof mismatch for SharedTextureMemoryEGLImageDescriptor");

static_assert(
    offsetof(SharedTextureMemoryEGLImageDescriptor, image) ==
        offsetof(WGPUSharedTextureMemoryEGLImageDescriptor, image),
    "offsetof mismatch for SharedTextureMemoryEGLImageDescriptor::image");

// SharedTextureMemoryIOSurfaceDescriptor

static_assert(sizeof(SharedTextureMemoryIOSurfaceDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryIOSurfaceDescriptor),
              "sizeof mismatch for SharedTextureMemoryIOSurfaceDescriptor");
static_assert(alignof(SharedTextureMemoryIOSurfaceDescriptor) ==
                  alignof(WGPUSharedTextureMemoryIOSurfaceDescriptor),
              "alignof mismatch for SharedTextureMemoryIOSurfaceDescriptor");

static_assert(
    offsetof(SharedTextureMemoryIOSurfaceDescriptor, ioSurface) ==
        offsetof(WGPUSharedTextureMemoryIOSurfaceDescriptor, ioSurface),
    "offsetof mismatch for SharedTextureMemoryIOSurfaceDescriptor::ioSurface");

// SharedTextureMemoryAHardwareBufferDescriptor

static_assert(
    sizeof(SharedTextureMemoryAHardwareBufferDescriptor) ==
        sizeof(WGPUSharedTextureMemoryAHardwareBufferDescriptor),
    "sizeof mismatch for SharedTextureMemoryAHardwareBufferDescriptor");
static_assert(
    alignof(SharedTextureMemoryAHardwareBufferDescriptor) ==
        alignof(WGPUSharedTextureMemoryAHardwareBufferDescriptor),
    "alignof mismatch for SharedTextureMemoryAHardwareBufferDescriptor");

static_assert(offsetof(SharedTextureMemoryAHardwareBufferDescriptor, handle) ==
                  offsetof(WGPUSharedTextureMemoryAHardwareBufferDescriptor,
                           handle),
              "offsetof mismatch for "
              "SharedTextureMemoryAHardwareBufferDescriptor::handle");

// SharedTextureMemoryBeginAccessDescriptor

static_assert(sizeof(SharedTextureMemoryBeginAccessDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryBeginAccessDescriptor),
              "sizeof mismatch for SharedTextureMemoryBeginAccessDescriptor");
static_assert(alignof(SharedTextureMemoryBeginAccessDescriptor) ==
                  alignof(WGPUSharedTextureMemoryBeginAccessDescriptor),
              "alignof mismatch for SharedTextureMemoryBeginAccessDescriptor");

static_assert(offsetof(SharedTextureMemoryBeginAccessDescriptor, nextInChain) ==
                  offsetof(WGPUSharedTextureMemoryBeginAccessDescriptor,
                           nextInChain),
              "offsetof mismatch for "
              "SharedTextureMemoryBeginAccessDescriptor::nextInChain");
static_assert(offsetof(SharedTextureMemoryBeginAccessDescriptor,
                       concurrentRead) ==
                  offsetof(WGPUSharedTextureMemoryBeginAccessDescriptor,
                           concurrentRead),
              "offsetof mismatch for "
              "SharedTextureMemoryBeginAccessDescriptor::concurrentRead");
static_assert(offsetof(SharedTextureMemoryBeginAccessDescriptor, initialized) ==
                  offsetof(WGPUSharedTextureMemoryBeginAccessDescriptor,
                           initialized),
              "offsetof mismatch for "
              "SharedTextureMemoryBeginAccessDescriptor::initialized");
static_assert(offsetof(SharedTextureMemoryBeginAccessDescriptor, fenceCount) ==
                  offsetof(WGPUSharedTextureMemoryBeginAccessDescriptor,
                           fenceCount),
              "offsetof mismatch for "
              "SharedTextureMemoryBeginAccessDescriptor::fenceCount");
static_assert(
    offsetof(SharedTextureMemoryBeginAccessDescriptor, fences) ==
        offsetof(WGPUSharedTextureMemoryBeginAccessDescriptor, fences),
    "offsetof mismatch for SharedTextureMemoryBeginAccessDescriptor::fences");
static_assert(offsetof(SharedTextureMemoryBeginAccessDescriptor,
                       signaledValues) ==
                  offsetof(WGPUSharedTextureMemoryBeginAccessDescriptor,
                           signaledValues),
              "offsetof mismatch for "
              "SharedTextureMemoryBeginAccessDescriptor::signaledValues");

// SharedTextureMemoryDescriptor

static_assert(sizeof(SharedTextureMemoryDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryDescriptor),
              "sizeof mismatch for SharedTextureMemoryDescriptor");
static_assert(alignof(SharedTextureMemoryDescriptor) ==
                  alignof(WGPUSharedTextureMemoryDescriptor),
              "alignof mismatch for SharedTextureMemoryDescriptor");

static_assert(
    offsetof(SharedTextureMemoryDescriptor, nextInChain) ==
        offsetof(WGPUSharedTextureMemoryDescriptor, nextInChain),
    "offsetof mismatch for SharedTextureMemoryDescriptor::nextInChain");
static_assert(offsetof(SharedTextureMemoryDescriptor, label) ==
                  offsetof(WGPUSharedTextureMemoryDescriptor, label),
              "offsetof mismatch for SharedTextureMemoryDescriptor::label");

// SharedTextureMemoryDmaBufPlane

static_assert(sizeof(SharedTextureMemoryDmaBufPlane) ==
                  sizeof(WGPUSharedTextureMemoryDmaBufPlane),
              "sizeof mismatch for SharedTextureMemoryDmaBufPlane");
static_assert(alignof(SharedTextureMemoryDmaBufPlane) ==
                  alignof(WGPUSharedTextureMemoryDmaBufPlane),
              "alignof mismatch for SharedTextureMemoryDmaBufPlane");

static_assert(offsetof(SharedTextureMemoryDmaBufPlane, fd) ==
                  offsetof(WGPUSharedTextureMemoryDmaBufPlane, fd),
              "offsetof mismatch for SharedTextureMemoryDmaBufPlane::fd");
static_assert(offsetof(SharedTextureMemoryDmaBufPlane, offset) ==
                  offsetof(WGPUSharedTextureMemoryDmaBufPlane, offset),
              "offsetof mismatch for SharedTextureMemoryDmaBufPlane::offset");
static_assert(offsetof(SharedTextureMemoryDmaBufPlane, stride) ==
                  offsetof(WGPUSharedTextureMemoryDmaBufPlane, stride),
              "offsetof mismatch for SharedTextureMemoryDmaBufPlane::stride");

// SharedTextureMemoryEndAccessState

static_assert(sizeof(SharedTextureMemoryEndAccessState) ==
                  sizeof(WGPUSharedTextureMemoryEndAccessState),
              "sizeof mismatch for SharedTextureMemoryEndAccessState");
static_assert(alignof(SharedTextureMemoryEndAccessState) ==
                  alignof(WGPUSharedTextureMemoryEndAccessState),
              "alignof mismatch for SharedTextureMemoryEndAccessState");

static_assert(
    offsetof(SharedTextureMemoryEndAccessState, nextInChain) ==
        offsetof(WGPUSharedTextureMemoryEndAccessState, nextInChain),
    "offsetof mismatch for SharedTextureMemoryEndAccessState::nextInChain");
static_assert(
    offsetof(SharedTextureMemoryEndAccessState, initialized) ==
        offsetof(WGPUSharedTextureMemoryEndAccessState, initialized),
    "offsetof mismatch for SharedTextureMemoryEndAccessState::initialized");
static_assert(
    offsetof(SharedTextureMemoryEndAccessState, fenceCount) ==
        offsetof(WGPUSharedTextureMemoryEndAccessState, fenceCount),
    "offsetof mismatch for SharedTextureMemoryEndAccessState::fenceCount");
static_assert(
    offsetof(SharedTextureMemoryEndAccessState, fences) ==
        offsetof(WGPUSharedTextureMemoryEndAccessState, fences),
    "offsetof mismatch for SharedTextureMemoryEndAccessState::fences");
static_assert(
    offsetof(SharedTextureMemoryEndAccessState, signaledValues) ==
        offsetof(WGPUSharedTextureMemoryEndAccessState, signaledValues),
    "offsetof mismatch for SharedTextureMemoryEndAccessState::signaledValues");

// SharedTextureMemoryOpaqueFDDescriptor

static_assert(sizeof(SharedTextureMemoryOpaqueFDDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryOpaqueFDDescriptor),
              "sizeof mismatch for SharedTextureMemoryOpaqueFDDescriptor");
static_assert(alignof(SharedTextureMemoryOpaqueFDDescriptor) ==
                  alignof(WGPUSharedTextureMemoryOpaqueFDDescriptor),
              "alignof mismatch for SharedTextureMemoryOpaqueFDDescriptor");

static_assert(offsetof(SharedTextureMemoryOpaqueFDDescriptor,
                       vkImageCreateInfo) ==
                  offsetof(WGPUSharedTextureMemoryOpaqueFDDescriptor,
                           vkImageCreateInfo),
              "offsetof mismatch for "
              "SharedTextureMemoryOpaqueFDDescriptor::vkImageCreateInfo");
static_assert(
    offsetof(SharedTextureMemoryOpaqueFDDescriptor, memoryFD) ==
        offsetof(WGPUSharedTextureMemoryOpaqueFDDescriptor, memoryFD),
    "offsetof mismatch for SharedTextureMemoryOpaqueFDDescriptor::memoryFD");
static_assert(offsetof(SharedTextureMemoryOpaqueFDDescriptor,
                       memoryTypeIndex) ==
                  offsetof(WGPUSharedTextureMemoryOpaqueFDDescriptor,
                           memoryTypeIndex),
              "offsetof mismatch for "
              "SharedTextureMemoryOpaqueFDDescriptor::memoryTypeIndex");
static_assert(offsetof(SharedTextureMemoryOpaqueFDDescriptor, allocationSize) ==
                  offsetof(WGPUSharedTextureMemoryOpaqueFDDescriptor,
                           allocationSize),
              "offsetof mismatch for "
              "SharedTextureMemoryOpaqueFDDescriptor::allocationSize");
static_assert(offsetof(SharedTextureMemoryOpaqueFDDescriptor,
                       dedicatedAllocation) ==
                  offsetof(WGPUSharedTextureMemoryOpaqueFDDescriptor,
                           dedicatedAllocation),
              "offsetof mismatch for "
              "SharedTextureMemoryOpaqueFDDescriptor::dedicatedAllocation");

// SharedTextureMemoryVkDedicatedAllocationDescriptor

static_assert(
    sizeof(SharedTextureMemoryVkDedicatedAllocationDescriptor) ==
        sizeof(WGPUSharedTextureMemoryVkDedicatedAllocationDescriptor),
    "sizeof mismatch for SharedTextureMemoryVkDedicatedAllocationDescriptor");
static_assert(
    alignof(SharedTextureMemoryVkDedicatedAllocationDescriptor) ==
        alignof(WGPUSharedTextureMemoryVkDedicatedAllocationDescriptor),
    "alignof mismatch for SharedTextureMemoryVkDedicatedAllocationDescriptor");

static_assert(
    offsetof(SharedTextureMemoryVkDedicatedAllocationDescriptor,
             dedicatedAllocation) ==
        offsetof(WGPUSharedTextureMemoryVkDedicatedAllocationDescriptor,
                 dedicatedAllocation),
    "offsetof mismatch for "
    "SharedTextureMemoryVkDedicatedAllocationDescriptor::dedicatedAllocation");

// SharedTextureMemoryVkImageLayoutBeginState

static_assert(sizeof(SharedTextureMemoryVkImageLayoutBeginState) ==
                  sizeof(WGPUSharedTextureMemoryVkImageLayoutBeginState),
              "sizeof mismatch for SharedTextureMemoryVkImageLayoutBeginState");
static_assert(
    alignof(SharedTextureMemoryVkImageLayoutBeginState) ==
        alignof(WGPUSharedTextureMemoryVkImageLayoutBeginState),
    "alignof mismatch for SharedTextureMemoryVkImageLayoutBeginState");

static_assert(offsetof(SharedTextureMemoryVkImageLayoutBeginState, oldLayout) ==
                  offsetof(WGPUSharedTextureMemoryVkImageLayoutBeginState,
                           oldLayout),
              "offsetof mismatch for "
              "SharedTextureMemoryVkImageLayoutBeginState::oldLayout");
static_assert(offsetof(SharedTextureMemoryVkImageLayoutBeginState, newLayout) ==
                  offsetof(WGPUSharedTextureMemoryVkImageLayoutBeginState,
                           newLayout),
              "offsetof mismatch for "
              "SharedTextureMemoryVkImageLayoutBeginState::newLayout");

// SharedTextureMemoryVkImageLayoutEndState

static_assert(sizeof(SharedTextureMemoryVkImageLayoutEndState) ==
                  sizeof(WGPUSharedTextureMemoryVkImageLayoutEndState),
              "sizeof mismatch for SharedTextureMemoryVkImageLayoutEndState");
static_assert(alignof(SharedTextureMemoryVkImageLayoutEndState) ==
                  alignof(WGPUSharedTextureMemoryVkImageLayoutEndState),
              "alignof mismatch for SharedTextureMemoryVkImageLayoutEndState");

static_assert(offsetof(SharedTextureMemoryVkImageLayoutEndState, oldLayout) ==
                  offsetof(WGPUSharedTextureMemoryVkImageLayoutEndState,
                           oldLayout),
              "offsetof mismatch for "
              "SharedTextureMemoryVkImageLayoutEndState::oldLayout");
static_assert(offsetof(SharedTextureMemoryVkImageLayoutEndState, newLayout) ==
                  offsetof(WGPUSharedTextureMemoryVkImageLayoutEndState,
                           newLayout),
              "offsetof mismatch for "
              "SharedTextureMemoryVkImageLayoutEndState::newLayout");

// SharedTextureMemoryZirconHandleDescriptor

static_assert(sizeof(SharedTextureMemoryZirconHandleDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryZirconHandleDescriptor),
              "sizeof mismatch for SharedTextureMemoryZirconHandleDescriptor");
static_assert(alignof(SharedTextureMemoryZirconHandleDescriptor) ==
                  alignof(WGPUSharedTextureMemoryZirconHandleDescriptor),
              "alignof mismatch for SharedTextureMemoryZirconHandleDescriptor");

static_assert(offsetof(SharedTextureMemoryZirconHandleDescriptor, memoryFD) ==
                  offsetof(WGPUSharedTextureMemoryZirconHandleDescriptor,
                           memoryFD),
              "offsetof mismatch for "
              "SharedTextureMemoryZirconHandleDescriptor::memoryFD");
static_assert(offsetof(SharedTextureMemoryZirconHandleDescriptor,
                       allocationSize) ==
                  offsetof(WGPUSharedTextureMemoryZirconHandleDescriptor,
                           allocationSize),
              "offsetof mismatch for "
              "SharedTextureMemoryZirconHandleDescriptor::allocationSize");

// StaticSamplerBindingLayout

static_assert(sizeof(StaticSamplerBindingLayout) ==
                  sizeof(WGPUStaticSamplerBindingLayout),
              "sizeof mismatch for StaticSamplerBindingLayout");
static_assert(alignof(StaticSamplerBindingLayout) ==
                  alignof(WGPUStaticSamplerBindingLayout),
              "alignof mismatch for StaticSamplerBindingLayout");

static_assert(offsetof(StaticSamplerBindingLayout, sampler) ==
                  offsetof(WGPUStaticSamplerBindingLayout, sampler),
              "offsetof mismatch for StaticSamplerBindingLayout::sampler");

// StencilFaceState

static_assert(sizeof(StencilFaceState) == sizeof(WGPUStencilFaceState),
              "sizeof mismatch for StencilFaceState");
static_assert(alignof(StencilFaceState) == alignof(WGPUStencilFaceState),
              "alignof mismatch for StencilFaceState");

static_assert(offsetof(StencilFaceState, compare) ==
                  offsetof(WGPUStencilFaceState, compare),
              "offsetof mismatch for StencilFaceState::compare");
static_assert(offsetof(StencilFaceState, failOp) ==
                  offsetof(WGPUStencilFaceState, failOp),
              "offsetof mismatch for StencilFaceState::failOp");
static_assert(offsetof(StencilFaceState, depthFailOp) ==
                  offsetof(WGPUStencilFaceState, depthFailOp),
              "offsetof mismatch for StencilFaceState::depthFailOp");
static_assert(offsetof(StencilFaceState, passOp) ==
                  offsetof(WGPUStencilFaceState, passOp),
              "offsetof mismatch for StencilFaceState::passOp");

// StorageTextureBindingLayout

static_assert(sizeof(StorageTextureBindingLayout) ==
                  sizeof(WGPUStorageTextureBindingLayout),
              "sizeof mismatch for StorageTextureBindingLayout");
static_assert(alignof(StorageTextureBindingLayout) ==
                  alignof(WGPUStorageTextureBindingLayout),
              "alignof mismatch for StorageTextureBindingLayout");

static_assert(offsetof(StorageTextureBindingLayout, nextInChain) ==
                  offsetof(WGPUStorageTextureBindingLayout, nextInChain),
              "offsetof mismatch for StorageTextureBindingLayout::nextInChain");
static_assert(offsetof(StorageTextureBindingLayout, access) ==
                  offsetof(WGPUStorageTextureBindingLayout, access),
              "offsetof mismatch for StorageTextureBindingLayout::access");
static_assert(offsetof(StorageTextureBindingLayout, format) ==
                  offsetof(WGPUStorageTextureBindingLayout, format),
              "offsetof mismatch for StorageTextureBindingLayout::format");
static_assert(
    offsetof(StorageTextureBindingLayout, viewDimension) ==
        offsetof(WGPUStorageTextureBindingLayout, viewDimension),
    "offsetof mismatch for StorageTextureBindingLayout::viewDimension");

// SurfaceDescriptor

static_assert(sizeof(SurfaceDescriptor) == sizeof(WGPUSurfaceDescriptor),
              "sizeof mismatch for SurfaceDescriptor");
static_assert(alignof(SurfaceDescriptor) == alignof(WGPUSurfaceDescriptor),
              "alignof mismatch for SurfaceDescriptor");

static_assert(offsetof(SurfaceDescriptor, nextInChain) ==
                  offsetof(WGPUSurfaceDescriptor, nextInChain),
              "offsetof mismatch for SurfaceDescriptor::nextInChain");
static_assert(offsetof(SurfaceDescriptor, label) ==
                  offsetof(WGPUSurfaceDescriptor, label),
              "offsetof mismatch for SurfaceDescriptor::label");

// SurfaceDescriptorFromAndroidNativeWindow

static_assert(sizeof(SurfaceDescriptorFromAndroidNativeWindow) ==
                  sizeof(WGPUSurfaceDescriptorFromAndroidNativeWindow),
              "sizeof mismatch for SurfaceDescriptorFromAndroidNativeWindow");
static_assert(alignof(SurfaceDescriptorFromAndroidNativeWindow) ==
                  alignof(WGPUSurfaceDescriptorFromAndroidNativeWindow),
              "alignof mismatch for SurfaceDescriptorFromAndroidNativeWindow");

static_assert(
    offsetof(SurfaceDescriptorFromAndroidNativeWindow, window) ==
        offsetof(WGPUSurfaceDescriptorFromAndroidNativeWindow, window),
    "offsetof mismatch for SurfaceDescriptorFromAndroidNativeWindow::window");

// SurfaceDescriptorFromCanvasHTMLSelector

static_assert(sizeof(SurfaceDescriptorFromCanvasHTMLSelector) ==
                  sizeof(WGPUSurfaceDescriptorFromCanvasHTMLSelector),
              "sizeof mismatch for SurfaceDescriptorFromCanvasHTMLSelector");
static_assert(alignof(SurfaceDescriptorFromCanvasHTMLSelector) ==
                  alignof(WGPUSurfaceDescriptorFromCanvasHTMLSelector),
              "alignof mismatch for SurfaceDescriptorFromCanvasHTMLSelector");

static_assert(
    offsetof(SurfaceDescriptorFromCanvasHTMLSelector, selector) ==
        offsetof(WGPUSurfaceDescriptorFromCanvasHTMLSelector, selector),
    "offsetof mismatch for SurfaceDescriptorFromCanvasHTMLSelector::selector");

// SurfaceDescriptorFromMetalLayer

static_assert(sizeof(SurfaceDescriptorFromMetalLayer) ==
                  sizeof(WGPUSurfaceDescriptorFromMetalLayer),
              "sizeof mismatch for SurfaceDescriptorFromMetalLayer");
static_assert(alignof(SurfaceDescriptorFromMetalLayer) ==
                  alignof(WGPUSurfaceDescriptorFromMetalLayer),
              "alignof mismatch for SurfaceDescriptorFromMetalLayer");

static_assert(offsetof(SurfaceDescriptorFromMetalLayer, layer) ==
                  offsetof(WGPUSurfaceDescriptorFromMetalLayer, layer),
              "offsetof mismatch for SurfaceDescriptorFromMetalLayer::layer");

// SurfaceDescriptorFromWaylandSurface

static_assert(sizeof(SurfaceDescriptorFromWaylandSurface) ==
                  sizeof(WGPUSurfaceDescriptorFromWaylandSurface),
              "sizeof mismatch for SurfaceDescriptorFromWaylandSurface");
static_assert(alignof(SurfaceDescriptorFromWaylandSurface) ==
                  alignof(WGPUSurfaceDescriptorFromWaylandSurface),
              "alignof mismatch for SurfaceDescriptorFromWaylandSurface");

static_assert(
    offsetof(SurfaceDescriptorFromWaylandSurface, display) ==
        offsetof(WGPUSurfaceDescriptorFromWaylandSurface, display),
    "offsetof mismatch for SurfaceDescriptorFromWaylandSurface::display");
static_assert(
    offsetof(SurfaceDescriptorFromWaylandSurface, surface) ==
        offsetof(WGPUSurfaceDescriptorFromWaylandSurface, surface),
    "offsetof mismatch for SurfaceDescriptorFromWaylandSurface::surface");

// SurfaceDescriptorFromWindowsHWND

static_assert(sizeof(SurfaceDescriptorFromWindowsHWND) ==
                  sizeof(WGPUSurfaceDescriptorFromWindowsHWND),
              "sizeof mismatch for SurfaceDescriptorFromWindowsHWND");
static_assert(alignof(SurfaceDescriptorFromWindowsHWND) ==
                  alignof(WGPUSurfaceDescriptorFromWindowsHWND),
              "alignof mismatch for SurfaceDescriptorFromWindowsHWND");

static_assert(
    offsetof(SurfaceDescriptorFromWindowsHWND, hinstance) ==
        offsetof(WGPUSurfaceDescriptorFromWindowsHWND, hinstance),
    "offsetof mismatch for SurfaceDescriptorFromWindowsHWND::hinstance");
static_assert(offsetof(SurfaceDescriptorFromWindowsHWND, hwnd) ==
                  offsetof(WGPUSurfaceDescriptorFromWindowsHWND, hwnd),
              "offsetof mismatch for SurfaceDescriptorFromWindowsHWND::hwnd");

// SurfaceDescriptorFromWindowsCoreWindow

static_assert(sizeof(SurfaceDescriptorFromWindowsCoreWindow) ==
                  sizeof(WGPUSurfaceDescriptorFromWindowsCoreWindow),
              "sizeof mismatch for SurfaceDescriptorFromWindowsCoreWindow");
static_assert(alignof(SurfaceDescriptorFromWindowsCoreWindow) ==
                  alignof(WGPUSurfaceDescriptorFromWindowsCoreWindow),
              "alignof mismatch for SurfaceDescriptorFromWindowsCoreWindow");

static_assert(
    offsetof(SurfaceDescriptorFromWindowsCoreWindow, coreWindow) ==
        offsetof(WGPUSurfaceDescriptorFromWindowsCoreWindow, coreWindow),
    "offsetof mismatch for SurfaceDescriptorFromWindowsCoreWindow::coreWindow");

// SurfaceDescriptorFromWindowsSwapChainPanel

static_assert(sizeof(SurfaceDescriptorFromWindowsSwapChainPanel) ==
                  sizeof(WGPUSurfaceDescriptorFromWindowsSwapChainPanel),
              "sizeof mismatch for SurfaceDescriptorFromWindowsSwapChainPanel");
static_assert(
    alignof(SurfaceDescriptorFromWindowsSwapChainPanel) ==
        alignof(WGPUSurfaceDescriptorFromWindowsSwapChainPanel),
    "alignof mismatch for SurfaceDescriptorFromWindowsSwapChainPanel");

static_assert(offsetof(SurfaceDescriptorFromWindowsSwapChainPanel,
                       swapChainPanel) ==
                  offsetof(WGPUSurfaceDescriptorFromWindowsSwapChainPanel,
                           swapChainPanel),
              "offsetof mismatch for "
              "SurfaceDescriptorFromWindowsSwapChainPanel::swapChainPanel");

// SurfaceDescriptorFromXlibWindow

static_assert(sizeof(SurfaceDescriptorFromXlibWindow) ==
                  sizeof(WGPUSurfaceDescriptorFromXlibWindow),
              "sizeof mismatch for SurfaceDescriptorFromXlibWindow");
static_assert(alignof(SurfaceDescriptorFromXlibWindow) ==
                  alignof(WGPUSurfaceDescriptorFromXlibWindow),
              "alignof mismatch for SurfaceDescriptorFromXlibWindow");

static_assert(offsetof(SurfaceDescriptorFromXlibWindow, display) ==
                  offsetof(WGPUSurfaceDescriptorFromXlibWindow, display),
              "offsetof mismatch for SurfaceDescriptorFromXlibWindow::display");
static_assert(offsetof(SurfaceDescriptorFromXlibWindow, window) ==
                  offsetof(WGPUSurfaceDescriptorFromXlibWindow, window),
              "offsetof mismatch for SurfaceDescriptorFromXlibWindow::window");

// SwapChainDescriptor

static_assert(sizeof(SwapChainDescriptor) == sizeof(WGPUSwapChainDescriptor),
              "sizeof mismatch for SwapChainDescriptor");
static_assert(alignof(SwapChainDescriptor) == alignof(WGPUSwapChainDescriptor),
              "alignof mismatch for SwapChainDescriptor");

static_assert(offsetof(SwapChainDescriptor, nextInChain) ==
                  offsetof(WGPUSwapChainDescriptor, nextInChain),
              "offsetof mismatch for SwapChainDescriptor::nextInChain");
static_assert(offsetof(SwapChainDescriptor, label) ==
                  offsetof(WGPUSwapChainDescriptor, label),
              "offsetof mismatch for SwapChainDescriptor::label");
static_assert(offsetof(SwapChainDescriptor, usage) ==
                  offsetof(WGPUSwapChainDescriptor, usage),
              "offsetof mismatch for SwapChainDescriptor::usage");
static_assert(offsetof(SwapChainDescriptor, format) ==
                  offsetof(WGPUSwapChainDescriptor, format),
              "offsetof mismatch for SwapChainDescriptor::format");
static_assert(offsetof(SwapChainDescriptor, width) ==
                  offsetof(WGPUSwapChainDescriptor, width),
              "offsetof mismatch for SwapChainDescriptor::width");
static_assert(offsetof(SwapChainDescriptor, height) ==
                  offsetof(WGPUSwapChainDescriptor, height),
              "offsetof mismatch for SwapChainDescriptor::height");
static_assert(offsetof(SwapChainDescriptor, presentMode) ==
                  offsetof(WGPUSwapChainDescriptor, presentMode),
              "offsetof mismatch for SwapChainDescriptor::presentMode");

// TextureBindingLayout

static_assert(sizeof(TextureBindingLayout) == sizeof(WGPUTextureBindingLayout),
              "sizeof mismatch for TextureBindingLayout");
static_assert(alignof(TextureBindingLayout) ==
                  alignof(WGPUTextureBindingLayout),
              "alignof mismatch for TextureBindingLayout");

static_assert(offsetof(TextureBindingLayout, nextInChain) ==
                  offsetof(WGPUTextureBindingLayout, nextInChain),
              "offsetof mismatch for TextureBindingLayout::nextInChain");
static_assert(offsetof(TextureBindingLayout, sampleType) ==
                  offsetof(WGPUTextureBindingLayout, sampleType),
              "offsetof mismatch for TextureBindingLayout::sampleType");
static_assert(offsetof(TextureBindingLayout, viewDimension) ==
                  offsetof(WGPUTextureBindingLayout, viewDimension),
              "offsetof mismatch for TextureBindingLayout::viewDimension");
static_assert(offsetof(TextureBindingLayout, multisampled) ==
                  offsetof(WGPUTextureBindingLayout, multisampled),
              "offsetof mismatch for TextureBindingLayout::multisampled");

// TextureBindingViewDimensionDescriptor

static_assert(sizeof(TextureBindingViewDimensionDescriptor) ==
                  sizeof(WGPUTextureBindingViewDimensionDescriptor),
              "sizeof mismatch for TextureBindingViewDimensionDescriptor");
static_assert(alignof(TextureBindingViewDimensionDescriptor) ==
                  alignof(WGPUTextureBindingViewDimensionDescriptor),
              "alignof mismatch for TextureBindingViewDimensionDescriptor");

static_assert(
    offsetof(TextureBindingViewDimensionDescriptor,
             textureBindingViewDimension) ==
        offsetof(WGPUTextureBindingViewDimensionDescriptor,
                 textureBindingViewDimension),
    "offsetof mismatch for "
    "TextureBindingViewDimensionDescriptor::textureBindingViewDimension");

// TextureDataLayout

static_assert(sizeof(TextureDataLayout) == sizeof(WGPUTextureDataLayout),
              "sizeof mismatch for TextureDataLayout");
static_assert(alignof(TextureDataLayout) == alignof(WGPUTextureDataLayout),
              "alignof mismatch for TextureDataLayout");

static_assert(offsetof(TextureDataLayout, nextInChain) ==
                  offsetof(WGPUTextureDataLayout, nextInChain),
              "offsetof mismatch for TextureDataLayout::nextInChain");
static_assert(offsetof(TextureDataLayout, offset) ==
                  offsetof(WGPUTextureDataLayout, offset),
              "offsetof mismatch for TextureDataLayout::offset");
static_assert(offsetof(TextureDataLayout, bytesPerRow) ==
                  offsetof(WGPUTextureDataLayout, bytesPerRow),
              "offsetof mismatch for TextureDataLayout::bytesPerRow");
static_assert(offsetof(TextureDataLayout, rowsPerImage) ==
                  offsetof(WGPUTextureDataLayout, rowsPerImage),
              "offsetof mismatch for TextureDataLayout::rowsPerImage");

// TextureViewDescriptor

static_assert(sizeof(TextureViewDescriptor) ==
                  sizeof(WGPUTextureViewDescriptor),
              "sizeof mismatch for TextureViewDescriptor");
static_assert(alignof(TextureViewDescriptor) ==
                  alignof(WGPUTextureViewDescriptor),
              "alignof mismatch for TextureViewDescriptor");

static_assert(offsetof(TextureViewDescriptor, nextInChain) ==
                  offsetof(WGPUTextureViewDescriptor, nextInChain),
              "offsetof mismatch for TextureViewDescriptor::nextInChain");
static_assert(offsetof(TextureViewDescriptor, label) ==
                  offsetof(WGPUTextureViewDescriptor, label),
              "offsetof mismatch for TextureViewDescriptor::label");
static_assert(offsetof(TextureViewDescriptor, format) ==
                  offsetof(WGPUTextureViewDescriptor, format),
              "offsetof mismatch for TextureViewDescriptor::format");
static_assert(offsetof(TextureViewDescriptor, dimension) ==
                  offsetof(WGPUTextureViewDescriptor, dimension),
              "offsetof mismatch for TextureViewDescriptor::dimension");
static_assert(offsetof(TextureViewDescriptor, baseMipLevel) ==
                  offsetof(WGPUTextureViewDescriptor, baseMipLevel),
              "offsetof mismatch for TextureViewDescriptor::baseMipLevel");
static_assert(offsetof(TextureViewDescriptor, mipLevelCount) ==
                  offsetof(WGPUTextureViewDescriptor, mipLevelCount),
              "offsetof mismatch for TextureViewDescriptor::mipLevelCount");
static_assert(offsetof(TextureViewDescriptor, baseArrayLayer) ==
                  offsetof(WGPUTextureViewDescriptor, baseArrayLayer),
              "offsetof mismatch for TextureViewDescriptor::baseArrayLayer");
static_assert(offsetof(TextureViewDescriptor, arrayLayerCount) ==
                  offsetof(WGPUTextureViewDescriptor, arrayLayerCount),
              "offsetof mismatch for TextureViewDescriptor::arrayLayerCount");
static_assert(offsetof(TextureViewDescriptor, aspect) ==
                  offsetof(WGPUTextureViewDescriptor, aspect),
              "offsetof mismatch for TextureViewDescriptor::aspect");

// VertexAttribute

static_assert(sizeof(VertexAttribute) == sizeof(WGPUVertexAttribute),
              "sizeof mismatch for VertexAttribute");
static_assert(alignof(VertexAttribute) == alignof(WGPUVertexAttribute),
              "alignof mismatch for VertexAttribute");

static_assert(offsetof(VertexAttribute, format) ==
                  offsetof(WGPUVertexAttribute, format),
              "offsetof mismatch for VertexAttribute::format");
static_assert(offsetof(VertexAttribute, offset) ==
                  offsetof(WGPUVertexAttribute, offset),
              "offsetof mismatch for VertexAttribute::offset");
static_assert(offsetof(VertexAttribute, shaderLocation) ==
                  offsetof(WGPUVertexAttribute, shaderLocation),
              "offsetof mismatch for VertexAttribute::shaderLocation");

// AdapterPropertiesMemoryHeaps

static_assert(sizeof(AdapterPropertiesMemoryHeaps) ==
                  sizeof(WGPUAdapterPropertiesMemoryHeaps),
              "sizeof mismatch for AdapterPropertiesMemoryHeaps");
static_assert(alignof(AdapterPropertiesMemoryHeaps) ==
                  alignof(WGPUAdapterPropertiesMemoryHeaps),
              "alignof mismatch for AdapterPropertiesMemoryHeaps");

static_assert(offsetof(AdapterPropertiesMemoryHeaps, heapCount) ==
                  offsetof(WGPUAdapterPropertiesMemoryHeaps, heapCount),
              "offsetof mismatch for AdapterPropertiesMemoryHeaps::heapCount");
static_assert(offsetof(AdapterPropertiesMemoryHeaps, heapInfo) ==
                  offsetof(WGPUAdapterPropertiesMemoryHeaps, heapInfo),
              "offsetof mismatch for AdapterPropertiesMemoryHeaps::heapInfo");

// BindGroupDescriptor

static_assert(sizeof(BindGroupDescriptor) == sizeof(WGPUBindGroupDescriptor),
              "sizeof mismatch for BindGroupDescriptor");
static_assert(alignof(BindGroupDescriptor) == alignof(WGPUBindGroupDescriptor),
              "alignof mismatch for BindGroupDescriptor");

static_assert(offsetof(BindGroupDescriptor, nextInChain) ==
                  offsetof(WGPUBindGroupDescriptor, nextInChain),
              "offsetof mismatch for BindGroupDescriptor::nextInChain");
static_assert(offsetof(BindGroupDescriptor, label) ==
                  offsetof(WGPUBindGroupDescriptor, label),
              "offsetof mismatch for BindGroupDescriptor::label");
static_assert(offsetof(BindGroupDescriptor, layout) ==
                  offsetof(WGPUBindGroupDescriptor, layout),
              "offsetof mismatch for BindGroupDescriptor::layout");
static_assert(offsetof(BindGroupDescriptor, entryCount) ==
                  offsetof(WGPUBindGroupDescriptor, entryCount),
              "offsetof mismatch for BindGroupDescriptor::entryCount");
static_assert(offsetof(BindGroupDescriptor, entries) ==
                  offsetof(WGPUBindGroupDescriptor, entries),
              "offsetof mismatch for BindGroupDescriptor::entries");

// BindGroupLayoutEntry

static_assert(sizeof(BindGroupLayoutEntry) == sizeof(WGPUBindGroupLayoutEntry),
              "sizeof mismatch for BindGroupLayoutEntry");
static_assert(alignof(BindGroupLayoutEntry) ==
                  alignof(WGPUBindGroupLayoutEntry),
              "alignof mismatch for BindGroupLayoutEntry");

static_assert(offsetof(BindGroupLayoutEntry, nextInChain) ==
                  offsetof(WGPUBindGroupLayoutEntry, nextInChain),
              "offsetof mismatch for BindGroupLayoutEntry::nextInChain");
static_assert(offsetof(BindGroupLayoutEntry, binding) ==
                  offsetof(WGPUBindGroupLayoutEntry, binding),
              "offsetof mismatch for BindGroupLayoutEntry::binding");
static_assert(offsetof(BindGroupLayoutEntry, visibility) ==
                  offsetof(WGPUBindGroupLayoutEntry, visibility),
              "offsetof mismatch for BindGroupLayoutEntry::visibility");
static_assert(offsetof(BindGroupLayoutEntry, buffer) ==
                  offsetof(WGPUBindGroupLayoutEntry, buffer),
              "offsetof mismatch for BindGroupLayoutEntry::buffer");
static_assert(offsetof(BindGroupLayoutEntry, sampler) ==
                  offsetof(WGPUBindGroupLayoutEntry, sampler),
              "offsetof mismatch for BindGroupLayoutEntry::sampler");
static_assert(offsetof(BindGroupLayoutEntry, texture) ==
                  offsetof(WGPUBindGroupLayoutEntry, texture),
              "offsetof mismatch for BindGroupLayoutEntry::texture");
static_assert(offsetof(BindGroupLayoutEntry, storageTexture) ==
                  offsetof(WGPUBindGroupLayoutEntry, storageTexture),
              "offsetof mismatch for BindGroupLayoutEntry::storageTexture");

// BlendState

static_assert(sizeof(BlendState) == sizeof(WGPUBlendState),
              "sizeof mismatch for BlendState");
static_assert(alignof(BlendState) == alignof(WGPUBlendState),
              "alignof mismatch for BlendState");

static_assert(offsetof(BlendState, color) == offsetof(WGPUBlendState, color),
              "offsetof mismatch for BlendState::color");
static_assert(offsetof(BlendState, alpha) == offsetof(WGPUBlendState, alpha),
              "offsetof mismatch for BlendState::alpha");

// CompilationInfo

static_assert(sizeof(CompilationInfo) == sizeof(WGPUCompilationInfo),
              "sizeof mismatch for CompilationInfo");
static_assert(alignof(CompilationInfo) == alignof(WGPUCompilationInfo),
              "alignof mismatch for CompilationInfo");

static_assert(offsetof(CompilationInfo, nextInChain) ==
                  offsetof(WGPUCompilationInfo, nextInChain),
              "offsetof mismatch for CompilationInfo::nextInChain");
static_assert(offsetof(CompilationInfo, messageCount) ==
                  offsetof(WGPUCompilationInfo, messageCount),
              "offsetof mismatch for CompilationInfo::messageCount");
static_assert(offsetof(CompilationInfo, messages) ==
                  offsetof(WGPUCompilationInfo, messages),
              "offsetof mismatch for CompilationInfo::messages");

// ComputePassDescriptor

static_assert(sizeof(ComputePassDescriptor) ==
                  sizeof(WGPUComputePassDescriptor),
              "sizeof mismatch for ComputePassDescriptor");
static_assert(alignof(ComputePassDescriptor) ==
                  alignof(WGPUComputePassDescriptor),
              "alignof mismatch for ComputePassDescriptor");

static_assert(offsetof(ComputePassDescriptor, nextInChain) ==
                  offsetof(WGPUComputePassDescriptor, nextInChain),
              "offsetof mismatch for ComputePassDescriptor::nextInChain");
static_assert(offsetof(ComputePassDescriptor, label) ==
                  offsetof(WGPUComputePassDescriptor, label),
              "offsetof mismatch for ComputePassDescriptor::label");
static_assert(offsetof(ComputePassDescriptor, timestampWrites) ==
                  offsetof(WGPUComputePassDescriptor, timestampWrites),
              "offsetof mismatch for ComputePassDescriptor::timestampWrites");

// DepthStencilState

static_assert(sizeof(DepthStencilState) == sizeof(WGPUDepthStencilState),
              "sizeof mismatch for DepthStencilState");
static_assert(alignof(DepthStencilState) == alignof(WGPUDepthStencilState),
              "alignof mismatch for DepthStencilState");

static_assert(offsetof(DepthStencilState, nextInChain) ==
                  offsetof(WGPUDepthStencilState, nextInChain),
              "offsetof mismatch for DepthStencilState::nextInChain");
static_assert(offsetof(DepthStencilState, format) ==
                  offsetof(WGPUDepthStencilState, format),
              "offsetof mismatch for DepthStencilState::format");
static_assert(offsetof(DepthStencilState, depthWriteEnabled) ==
                  offsetof(WGPUDepthStencilState, depthWriteEnabled),
              "offsetof mismatch for DepthStencilState::depthWriteEnabled");
static_assert(offsetof(DepthStencilState, depthCompare) ==
                  offsetof(WGPUDepthStencilState, depthCompare),
              "offsetof mismatch for DepthStencilState::depthCompare");
static_assert(offsetof(DepthStencilState, stencilFront) ==
                  offsetof(WGPUDepthStencilState, stencilFront),
              "offsetof mismatch for DepthStencilState::stencilFront");
static_assert(offsetof(DepthStencilState, stencilBack) ==
                  offsetof(WGPUDepthStencilState, stencilBack),
              "offsetof mismatch for DepthStencilState::stencilBack");
static_assert(offsetof(DepthStencilState, stencilReadMask) ==
                  offsetof(WGPUDepthStencilState, stencilReadMask),
              "offsetof mismatch for DepthStencilState::stencilReadMask");
static_assert(offsetof(DepthStencilState, stencilWriteMask) ==
                  offsetof(WGPUDepthStencilState, stencilWriteMask),
              "offsetof mismatch for DepthStencilState::stencilWriteMask");
static_assert(offsetof(DepthStencilState, depthBias) ==
                  offsetof(WGPUDepthStencilState, depthBias),
              "offsetof mismatch for DepthStencilState::depthBias");
static_assert(offsetof(DepthStencilState, depthBiasSlopeScale) ==
                  offsetof(WGPUDepthStencilState, depthBiasSlopeScale),
              "offsetof mismatch for DepthStencilState::depthBiasSlopeScale");
static_assert(offsetof(DepthStencilState, depthBiasClamp) ==
                  offsetof(WGPUDepthStencilState, depthBiasClamp),
              "offsetof mismatch for DepthStencilState::depthBiasClamp");

// DrmFormatCapabilities

static_assert(sizeof(DrmFormatCapabilities) ==
                  sizeof(WGPUDrmFormatCapabilities),
              "sizeof mismatch for DrmFormatCapabilities");
static_assert(alignof(DrmFormatCapabilities) ==
                  alignof(WGPUDrmFormatCapabilities),
              "alignof mismatch for DrmFormatCapabilities");

static_assert(offsetof(DrmFormatCapabilities, propertiesCount) ==
                  offsetof(WGPUDrmFormatCapabilities, propertiesCount),
              "offsetof mismatch for DrmFormatCapabilities::propertiesCount");
static_assert(offsetof(DrmFormatCapabilities, properties) ==
                  offsetof(WGPUDrmFormatCapabilities, properties),
              "offsetof mismatch for DrmFormatCapabilities::properties");

// ExternalTextureDescriptor

static_assert(sizeof(ExternalTextureDescriptor) ==
                  sizeof(WGPUExternalTextureDescriptor),
              "sizeof mismatch for ExternalTextureDescriptor");
static_assert(alignof(ExternalTextureDescriptor) ==
                  alignof(WGPUExternalTextureDescriptor),
              "alignof mismatch for ExternalTextureDescriptor");

static_assert(offsetof(ExternalTextureDescriptor, nextInChain) ==
                  offsetof(WGPUExternalTextureDescriptor, nextInChain),
              "offsetof mismatch for ExternalTextureDescriptor::nextInChain");
static_assert(offsetof(ExternalTextureDescriptor, label) ==
                  offsetof(WGPUExternalTextureDescriptor, label),
              "offsetof mismatch for ExternalTextureDescriptor::label");
static_assert(offsetof(ExternalTextureDescriptor, plane0) ==
                  offsetof(WGPUExternalTextureDescriptor, plane0),
              "offsetof mismatch for ExternalTextureDescriptor::plane0");
static_assert(offsetof(ExternalTextureDescriptor, plane1) ==
                  offsetof(WGPUExternalTextureDescriptor, plane1),
              "offsetof mismatch for ExternalTextureDescriptor::plane1");
static_assert(offsetof(ExternalTextureDescriptor, visibleOrigin) ==
                  offsetof(WGPUExternalTextureDescriptor, visibleOrigin),
              "offsetof mismatch for ExternalTextureDescriptor::visibleOrigin");
static_assert(offsetof(ExternalTextureDescriptor, visibleSize) ==
                  offsetof(WGPUExternalTextureDescriptor, visibleSize),
              "offsetof mismatch for ExternalTextureDescriptor::visibleSize");
static_assert(offsetof(ExternalTextureDescriptor, doYuvToRgbConversionOnly) ==
                  offsetof(WGPUExternalTextureDescriptor,
                           doYuvToRgbConversionOnly),
              "offsetof mismatch for "
              "ExternalTextureDescriptor::doYuvToRgbConversionOnly");
static_assert(offsetof(ExternalTextureDescriptor, yuvToRgbConversionMatrix) ==
                  offsetof(WGPUExternalTextureDescriptor,
                           yuvToRgbConversionMatrix),
              "offsetof mismatch for "
              "ExternalTextureDescriptor::yuvToRgbConversionMatrix");
static_assert(offsetof(ExternalTextureDescriptor,
                       srcTransferFunctionParameters) ==
                  offsetof(WGPUExternalTextureDescriptor,
                           srcTransferFunctionParameters),
              "offsetof mismatch for "
              "ExternalTextureDescriptor::srcTransferFunctionParameters");
static_assert(offsetof(ExternalTextureDescriptor,
                       dstTransferFunctionParameters) ==
                  offsetof(WGPUExternalTextureDescriptor,
                           dstTransferFunctionParameters),
              "offsetof mismatch for "
              "ExternalTextureDescriptor::dstTransferFunctionParameters");
static_assert(
    offsetof(ExternalTextureDescriptor, gamutConversionMatrix) ==
        offsetof(WGPUExternalTextureDescriptor, gamutConversionMatrix),
    "offsetof mismatch for ExternalTextureDescriptor::gamutConversionMatrix");
static_assert(offsetof(ExternalTextureDescriptor, flipY) ==
                  offsetof(WGPUExternalTextureDescriptor, flipY),
              "offsetof mismatch for ExternalTextureDescriptor::flipY");
static_assert(offsetof(ExternalTextureDescriptor, mirrored) ==
                  offsetof(WGPUExternalTextureDescriptor, mirrored),
              "offsetof mismatch for ExternalTextureDescriptor::mirrored");
static_assert(offsetof(ExternalTextureDescriptor, rotation) ==
                  offsetof(WGPUExternalTextureDescriptor, rotation),
              "offsetof mismatch for ExternalTextureDescriptor::rotation");

// FutureWaitInfo

static_assert(sizeof(FutureWaitInfo) == sizeof(WGPUFutureWaitInfo),
              "sizeof mismatch for FutureWaitInfo");
static_assert(alignof(FutureWaitInfo) == alignof(WGPUFutureWaitInfo),
              "alignof mismatch for FutureWaitInfo");

static_assert(offsetof(FutureWaitInfo, future) ==
                  offsetof(WGPUFutureWaitInfo, future),
              "offsetof mismatch for FutureWaitInfo::future");
static_assert(offsetof(FutureWaitInfo, completed) ==
                  offsetof(WGPUFutureWaitInfo, completed),
              "offsetof mismatch for FutureWaitInfo::completed");

// ImageCopyBuffer

static_assert(sizeof(ImageCopyBuffer) == sizeof(WGPUImageCopyBuffer),
              "sizeof mismatch for ImageCopyBuffer");
static_assert(alignof(ImageCopyBuffer) == alignof(WGPUImageCopyBuffer),
              "alignof mismatch for ImageCopyBuffer");

static_assert(offsetof(ImageCopyBuffer, nextInChain) ==
                  offsetof(WGPUImageCopyBuffer, nextInChain),
              "offsetof mismatch for ImageCopyBuffer::nextInChain");
static_assert(offsetof(ImageCopyBuffer, layout) ==
                  offsetof(WGPUImageCopyBuffer, layout),
              "offsetof mismatch for ImageCopyBuffer::layout");
static_assert(offsetof(ImageCopyBuffer, buffer) ==
                  offsetof(WGPUImageCopyBuffer, buffer),
              "offsetof mismatch for ImageCopyBuffer::buffer");

// ImageCopyExternalTexture

static_assert(sizeof(ImageCopyExternalTexture) ==
                  sizeof(WGPUImageCopyExternalTexture),
              "sizeof mismatch for ImageCopyExternalTexture");
static_assert(alignof(ImageCopyExternalTexture) ==
                  alignof(WGPUImageCopyExternalTexture),
              "alignof mismatch for ImageCopyExternalTexture");

static_assert(offsetof(ImageCopyExternalTexture, nextInChain) ==
                  offsetof(WGPUImageCopyExternalTexture, nextInChain),
              "offsetof mismatch for ImageCopyExternalTexture::nextInChain");
static_assert(
    offsetof(ImageCopyExternalTexture, externalTexture) ==
        offsetof(WGPUImageCopyExternalTexture, externalTexture),
    "offsetof mismatch for ImageCopyExternalTexture::externalTexture");
static_assert(offsetof(ImageCopyExternalTexture, origin) ==
                  offsetof(WGPUImageCopyExternalTexture, origin),
              "offsetof mismatch for ImageCopyExternalTexture::origin");
static_assert(offsetof(ImageCopyExternalTexture, naturalSize) ==
                  offsetof(WGPUImageCopyExternalTexture, naturalSize),
              "offsetof mismatch for ImageCopyExternalTexture::naturalSize");

// ImageCopyTexture

static_assert(sizeof(ImageCopyTexture) == sizeof(WGPUImageCopyTexture),
              "sizeof mismatch for ImageCopyTexture");
static_assert(alignof(ImageCopyTexture) == alignof(WGPUImageCopyTexture),
              "alignof mismatch for ImageCopyTexture");

static_assert(offsetof(ImageCopyTexture, nextInChain) ==
                  offsetof(WGPUImageCopyTexture, nextInChain),
              "offsetof mismatch for ImageCopyTexture::nextInChain");
static_assert(offsetof(ImageCopyTexture, texture) ==
                  offsetof(WGPUImageCopyTexture, texture),
              "offsetof mismatch for ImageCopyTexture::texture");
static_assert(offsetof(ImageCopyTexture, mipLevel) ==
                  offsetof(WGPUImageCopyTexture, mipLevel),
              "offsetof mismatch for ImageCopyTexture::mipLevel");
static_assert(offsetof(ImageCopyTexture, origin) ==
                  offsetof(WGPUImageCopyTexture, origin),
              "offsetof mismatch for ImageCopyTexture::origin");
static_assert(offsetof(ImageCopyTexture, aspect) ==
                  offsetof(WGPUImageCopyTexture, aspect),
              "offsetof mismatch for ImageCopyTexture::aspect");

// InstanceDescriptor

static_assert(sizeof(InstanceDescriptor) == sizeof(WGPUInstanceDescriptor),
              "sizeof mismatch for InstanceDescriptor");
static_assert(alignof(InstanceDescriptor) == alignof(WGPUInstanceDescriptor),
              "alignof mismatch for InstanceDescriptor");

static_assert(offsetof(InstanceDescriptor, nextInChain) ==
                  offsetof(WGPUInstanceDescriptor, nextInChain),
              "offsetof mismatch for InstanceDescriptor::nextInChain");
static_assert(offsetof(InstanceDescriptor, features) ==
                  offsetof(WGPUInstanceDescriptor, features),
              "offsetof mismatch for InstanceDescriptor::features");

// PipelineLayoutPixelLocalStorage

static_assert(sizeof(PipelineLayoutPixelLocalStorage) ==
                  sizeof(WGPUPipelineLayoutPixelLocalStorage),
              "sizeof mismatch for PipelineLayoutPixelLocalStorage");
static_assert(alignof(PipelineLayoutPixelLocalStorage) ==
                  alignof(WGPUPipelineLayoutPixelLocalStorage),
              "alignof mismatch for PipelineLayoutPixelLocalStorage");

static_assert(offsetof(PipelineLayoutPixelLocalStorage,
                       totalPixelLocalStorageSize) ==
                  offsetof(WGPUPipelineLayoutPixelLocalStorage,
                           totalPixelLocalStorageSize),
              "offsetof mismatch for "
              "PipelineLayoutPixelLocalStorage::totalPixelLocalStorageSize");
static_assert(offsetof(PipelineLayoutPixelLocalStorage,
                       storageAttachmentCount) ==
                  offsetof(WGPUPipelineLayoutPixelLocalStorage,
                           storageAttachmentCount),
              "offsetof mismatch for "
              "PipelineLayoutPixelLocalStorage::storageAttachmentCount");
static_assert(offsetof(PipelineLayoutPixelLocalStorage, storageAttachments) ==
                  offsetof(WGPUPipelineLayoutPixelLocalStorage,
                           storageAttachments),
              "offsetof mismatch for "
              "PipelineLayoutPixelLocalStorage::storageAttachments");

// ProgrammableStageDescriptor

static_assert(sizeof(ProgrammableStageDescriptor) ==
                  sizeof(WGPUProgrammableStageDescriptor),
              "sizeof mismatch for ProgrammableStageDescriptor");
static_assert(alignof(ProgrammableStageDescriptor) ==
                  alignof(WGPUProgrammableStageDescriptor),
              "alignof mismatch for ProgrammableStageDescriptor");

static_assert(offsetof(ProgrammableStageDescriptor, nextInChain) ==
                  offsetof(WGPUProgrammableStageDescriptor, nextInChain),
              "offsetof mismatch for ProgrammableStageDescriptor::nextInChain");
static_assert(offsetof(ProgrammableStageDescriptor, module) ==
                  offsetof(WGPUProgrammableStageDescriptor, module),
              "offsetof mismatch for ProgrammableStageDescriptor::module");
static_assert(offsetof(ProgrammableStageDescriptor, entryPoint) ==
                  offsetof(WGPUProgrammableStageDescriptor, entryPoint),
              "offsetof mismatch for ProgrammableStageDescriptor::entryPoint");
static_assert(
    offsetof(ProgrammableStageDescriptor, constantCount) ==
        offsetof(WGPUProgrammableStageDescriptor, constantCount),
    "offsetof mismatch for ProgrammableStageDescriptor::constantCount");
static_assert(offsetof(ProgrammableStageDescriptor, constants) ==
                  offsetof(WGPUProgrammableStageDescriptor, constants),
              "offsetof mismatch for ProgrammableStageDescriptor::constants");

// RenderPassColorAttachment

static_assert(sizeof(RenderPassColorAttachment) ==
                  sizeof(WGPURenderPassColorAttachment),
              "sizeof mismatch for RenderPassColorAttachment");
static_assert(alignof(RenderPassColorAttachment) ==
                  alignof(WGPURenderPassColorAttachment),
              "alignof mismatch for RenderPassColorAttachment");

static_assert(offsetof(RenderPassColorAttachment, nextInChain) ==
                  offsetof(WGPURenderPassColorAttachment, nextInChain),
              "offsetof mismatch for RenderPassColorAttachment::nextInChain");
static_assert(offsetof(RenderPassColorAttachment, view) ==
                  offsetof(WGPURenderPassColorAttachment, view),
              "offsetof mismatch for RenderPassColorAttachment::view");
static_assert(offsetof(RenderPassColorAttachment, depthSlice) ==
                  offsetof(WGPURenderPassColorAttachment, depthSlice),
              "offsetof mismatch for RenderPassColorAttachment::depthSlice");
static_assert(offsetof(RenderPassColorAttachment, resolveTarget) ==
                  offsetof(WGPURenderPassColorAttachment, resolveTarget),
              "offsetof mismatch for RenderPassColorAttachment::resolveTarget");
static_assert(offsetof(RenderPassColorAttachment, loadOp) ==
                  offsetof(WGPURenderPassColorAttachment, loadOp),
              "offsetof mismatch for RenderPassColorAttachment::loadOp");
static_assert(offsetof(RenderPassColorAttachment, storeOp) ==
                  offsetof(WGPURenderPassColorAttachment, storeOp),
              "offsetof mismatch for RenderPassColorAttachment::storeOp");
static_assert(offsetof(RenderPassColorAttachment, clearValue) ==
                  offsetof(WGPURenderPassColorAttachment, clearValue),
              "offsetof mismatch for RenderPassColorAttachment::clearValue");

// RenderPassStorageAttachment

static_assert(sizeof(RenderPassStorageAttachment) ==
                  sizeof(WGPURenderPassStorageAttachment),
              "sizeof mismatch for RenderPassStorageAttachment");
static_assert(alignof(RenderPassStorageAttachment) ==
                  alignof(WGPURenderPassStorageAttachment),
              "alignof mismatch for RenderPassStorageAttachment");

static_assert(offsetof(RenderPassStorageAttachment, nextInChain) ==
                  offsetof(WGPURenderPassStorageAttachment, nextInChain),
              "offsetof mismatch for RenderPassStorageAttachment::nextInChain");
static_assert(offsetof(RenderPassStorageAttachment, offset) ==
                  offsetof(WGPURenderPassStorageAttachment, offset),
              "offsetof mismatch for RenderPassStorageAttachment::offset");
static_assert(offsetof(RenderPassStorageAttachment, storage) ==
                  offsetof(WGPURenderPassStorageAttachment, storage),
              "offsetof mismatch for RenderPassStorageAttachment::storage");
static_assert(offsetof(RenderPassStorageAttachment, loadOp) ==
                  offsetof(WGPURenderPassStorageAttachment, loadOp),
              "offsetof mismatch for RenderPassStorageAttachment::loadOp");
static_assert(offsetof(RenderPassStorageAttachment, storeOp) ==
                  offsetof(WGPURenderPassStorageAttachment, storeOp),
              "offsetof mismatch for RenderPassStorageAttachment::storeOp");
static_assert(offsetof(RenderPassStorageAttachment, clearValue) ==
                  offsetof(WGPURenderPassStorageAttachment, clearValue),
              "offsetof mismatch for RenderPassStorageAttachment::clearValue");

// RequiredLimits

static_assert(sizeof(RequiredLimits) == sizeof(WGPURequiredLimits),
              "sizeof mismatch for RequiredLimits");
static_assert(alignof(RequiredLimits) == alignof(WGPURequiredLimits),
              "alignof mismatch for RequiredLimits");

static_assert(offsetof(RequiredLimits, nextInChain) ==
                  offsetof(WGPURequiredLimits, nextInChain),
              "offsetof mismatch for RequiredLimits::nextInChain");
static_assert(offsetof(RequiredLimits, limits) ==
                  offsetof(WGPURequiredLimits, limits),
              "offsetof mismatch for RequiredLimits::limits");

// SharedTextureMemoryDmaBufDescriptor

static_assert(sizeof(SharedTextureMemoryDmaBufDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryDmaBufDescriptor),
              "sizeof mismatch for SharedTextureMemoryDmaBufDescriptor");
static_assert(alignof(SharedTextureMemoryDmaBufDescriptor) ==
                  alignof(WGPUSharedTextureMemoryDmaBufDescriptor),
              "alignof mismatch for SharedTextureMemoryDmaBufDescriptor");

static_assert(
    offsetof(SharedTextureMemoryDmaBufDescriptor, size) ==
        offsetof(WGPUSharedTextureMemoryDmaBufDescriptor, size),
    "offsetof mismatch for SharedTextureMemoryDmaBufDescriptor::size");
static_assert(
    offsetof(SharedTextureMemoryDmaBufDescriptor, drmFormat) ==
        offsetof(WGPUSharedTextureMemoryDmaBufDescriptor, drmFormat),
    "offsetof mismatch for SharedTextureMemoryDmaBufDescriptor::drmFormat");
static_assert(
    offsetof(SharedTextureMemoryDmaBufDescriptor, drmModifier) ==
        offsetof(WGPUSharedTextureMemoryDmaBufDescriptor, drmModifier),
    "offsetof mismatch for SharedTextureMemoryDmaBufDescriptor::drmModifier");
static_assert(
    offsetof(SharedTextureMemoryDmaBufDescriptor, planeCount) ==
        offsetof(WGPUSharedTextureMemoryDmaBufDescriptor, planeCount),
    "offsetof mismatch for SharedTextureMemoryDmaBufDescriptor::planeCount");
static_assert(
    offsetof(SharedTextureMemoryDmaBufDescriptor, planes) ==
        offsetof(WGPUSharedTextureMemoryDmaBufDescriptor, planes),
    "offsetof mismatch for SharedTextureMemoryDmaBufDescriptor::planes");

// SharedTextureMemoryProperties

static_assert(sizeof(SharedTextureMemoryProperties) ==
                  sizeof(WGPUSharedTextureMemoryProperties),
              "sizeof mismatch for SharedTextureMemoryProperties");
static_assert(alignof(SharedTextureMemoryProperties) ==
                  alignof(WGPUSharedTextureMemoryProperties),
              "alignof mismatch for SharedTextureMemoryProperties");

static_assert(
    offsetof(SharedTextureMemoryProperties, nextInChain) ==
        offsetof(WGPUSharedTextureMemoryProperties, nextInChain),
    "offsetof mismatch for SharedTextureMemoryProperties::nextInChain");
static_assert(offsetof(SharedTextureMemoryProperties, usage) ==
                  offsetof(WGPUSharedTextureMemoryProperties, usage),
              "offsetof mismatch for SharedTextureMemoryProperties::usage");
static_assert(offsetof(SharedTextureMemoryProperties, size) ==
                  offsetof(WGPUSharedTextureMemoryProperties, size),
              "offsetof mismatch for SharedTextureMemoryProperties::size");
static_assert(offsetof(SharedTextureMemoryProperties, format) ==
                  offsetof(WGPUSharedTextureMemoryProperties, format),
              "offsetof mismatch for SharedTextureMemoryProperties::format");

// SharedTextureMemoryVkImageDescriptor

static_assert(sizeof(SharedTextureMemoryVkImageDescriptor) ==
                  sizeof(WGPUSharedTextureMemoryVkImageDescriptor),
              "sizeof mismatch for SharedTextureMemoryVkImageDescriptor");
static_assert(alignof(SharedTextureMemoryVkImageDescriptor) ==
                  alignof(WGPUSharedTextureMemoryVkImageDescriptor),
              "alignof mismatch for SharedTextureMemoryVkImageDescriptor");

static_assert(
    offsetof(SharedTextureMemoryVkImageDescriptor, vkFormat) ==
        offsetof(WGPUSharedTextureMemoryVkImageDescriptor, vkFormat),
    "offsetof mismatch for SharedTextureMemoryVkImageDescriptor::vkFormat");
static_assert(
    offsetof(SharedTextureMemoryVkImageDescriptor, vkUsageFlags) ==
        offsetof(WGPUSharedTextureMemoryVkImageDescriptor, vkUsageFlags),
    "offsetof mismatch for SharedTextureMemoryVkImageDescriptor::vkUsageFlags");
static_assert(
    offsetof(SharedTextureMemoryVkImageDescriptor, vkExtent3D) ==
        offsetof(WGPUSharedTextureMemoryVkImageDescriptor, vkExtent3D),
    "offsetof mismatch for SharedTextureMemoryVkImageDescriptor::vkExtent3D");

// SupportedLimits

static_assert(sizeof(SupportedLimits) == sizeof(WGPUSupportedLimits),
              "sizeof mismatch for SupportedLimits");
static_assert(alignof(SupportedLimits) == alignof(WGPUSupportedLimits),
              "alignof mismatch for SupportedLimits");

static_assert(offsetof(SupportedLimits, nextInChain) ==
                  offsetof(WGPUSupportedLimits, nextInChain),
              "offsetof mismatch for SupportedLimits::nextInChain");
static_assert(offsetof(SupportedLimits, limits) ==
                  offsetof(WGPUSupportedLimits, limits),
              "offsetof mismatch for SupportedLimits::limits");

// TextureDescriptor

static_assert(sizeof(TextureDescriptor) == sizeof(WGPUTextureDescriptor),
              "sizeof mismatch for TextureDescriptor");
static_assert(alignof(TextureDescriptor) == alignof(WGPUTextureDescriptor),
              "alignof mismatch for TextureDescriptor");

static_assert(offsetof(TextureDescriptor, nextInChain) ==
                  offsetof(WGPUTextureDescriptor, nextInChain),
              "offsetof mismatch for TextureDescriptor::nextInChain");
static_assert(offsetof(TextureDescriptor, label) ==
                  offsetof(WGPUTextureDescriptor, label),
              "offsetof mismatch for TextureDescriptor::label");
static_assert(offsetof(TextureDescriptor, usage) ==
                  offsetof(WGPUTextureDescriptor, usage),
              "offsetof mismatch for TextureDescriptor::usage");
static_assert(offsetof(TextureDescriptor, dimension) ==
                  offsetof(WGPUTextureDescriptor, dimension),
              "offsetof mismatch for TextureDescriptor::dimension");
static_assert(offsetof(TextureDescriptor, size) ==
                  offsetof(WGPUTextureDescriptor, size),
              "offsetof mismatch for TextureDescriptor::size");
static_assert(offsetof(TextureDescriptor, format) ==
                  offsetof(WGPUTextureDescriptor, format),
              "offsetof mismatch for TextureDescriptor::format");
static_assert(offsetof(TextureDescriptor, mipLevelCount) ==
                  offsetof(WGPUTextureDescriptor, mipLevelCount),
              "offsetof mismatch for TextureDescriptor::mipLevelCount");
static_assert(offsetof(TextureDescriptor, sampleCount) ==
                  offsetof(WGPUTextureDescriptor, sampleCount),
              "offsetof mismatch for TextureDescriptor::sampleCount");
static_assert(offsetof(TextureDescriptor, viewFormatCount) ==
                  offsetof(WGPUTextureDescriptor, viewFormatCount),
              "offsetof mismatch for TextureDescriptor::viewFormatCount");
static_assert(offsetof(TextureDescriptor, viewFormats) ==
                  offsetof(WGPUTextureDescriptor, viewFormats),
              "offsetof mismatch for TextureDescriptor::viewFormats");

// VertexBufferLayout

static_assert(sizeof(VertexBufferLayout) == sizeof(WGPUVertexBufferLayout),
              "sizeof mismatch for VertexBufferLayout");
static_assert(alignof(VertexBufferLayout) == alignof(WGPUVertexBufferLayout),
              "alignof mismatch for VertexBufferLayout");

static_assert(offsetof(VertexBufferLayout, arrayStride) ==
                  offsetof(WGPUVertexBufferLayout, arrayStride),
              "offsetof mismatch for VertexBufferLayout::arrayStride");
static_assert(offsetof(VertexBufferLayout, stepMode) ==
                  offsetof(WGPUVertexBufferLayout, stepMode),
              "offsetof mismatch for VertexBufferLayout::stepMode");
static_assert(offsetof(VertexBufferLayout, attributeCount) ==
                  offsetof(WGPUVertexBufferLayout, attributeCount),
              "offsetof mismatch for VertexBufferLayout::attributeCount");
static_assert(offsetof(VertexBufferLayout, attributes) ==
                  offsetof(WGPUVertexBufferLayout, attributes),
              "offsetof mismatch for VertexBufferLayout::attributes");

// BindGroupLayoutDescriptor

static_assert(sizeof(BindGroupLayoutDescriptor) ==
                  sizeof(WGPUBindGroupLayoutDescriptor),
              "sizeof mismatch for BindGroupLayoutDescriptor");
static_assert(alignof(BindGroupLayoutDescriptor) ==
                  alignof(WGPUBindGroupLayoutDescriptor),
              "alignof mismatch for BindGroupLayoutDescriptor");

static_assert(offsetof(BindGroupLayoutDescriptor, nextInChain) ==
                  offsetof(WGPUBindGroupLayoutDescriptor, nextInChain),
              "offsetof mismatch for BindGroupLayoutDescriptor::nextInChain");
static_assert(offsetof(BindGroupLayoutDescriptor, label) ==
                  offsetof(WGPUBindGroupLayoutDescriptor, label),
              "offsetof mismatch for BindGroupLayoutDescriptor::label");
static_assert(offsetof(BindGroupLayoutDescriptor, entryCount) ==
                  offsetof(WGPUBindGroupLayoutDescriptor, entryCount),
              "offsetof mismatch for BindGroupLayoutDescriptor::entryCount");
static_assert(offsetof(BindGroupLayoutDescriptor, entries) ==
                  offsetof(WGPUBindGroupLayoutDescriptor, entries),
              "offsetof mismatch for BindGroupLayoutDescriptor::entries");

// ColorTargetState

static_assert(sizeof(ColorTargetState) == sizeof(WGPUColorTargetState),
              "sizeof mismatch for ColorTargetState");
static_assert(alignof(ColorTargetState) == alignof(WGPUColorTargetState),
              "alignof mismatch for ColorTargetState");

static_assert(offsetof(ColorTargetState, nextInChain) ==
                  offsetof(WGPUColorTargetState, nextInChain),
              "offsetof mismatch for ColorTargetState::nextInChain");
static_assert(offsetof(ColorTargetState, format) ==
                  offsetof(WGPUColorTargetState, format),
              "offsetof mismatch for ColorTargetState::format");
static_assert(offsetof(ColorTargetState, blend) ==
                  offsetof(WGPUColorTargetState, blend),
              "offsetof mismatch for ColorTargetState::blend");
static_assert(offsetof(ColorTargetState, writeMask) ==
                  offsetof(WGPUColorTargetState, writeMask),
              "offsetof mismatch for ColorTargetState::writeMask");

// ComputePipelineDescriptor

static_assert(sizeof(ComputePipelineDescriptor) ==
                  sizeof(WGPUComputePipelineDescriptor),
              "sizeof mismatch for ComputePipelineDescriptor");
static_assert(alignof(ComputePipelineDescriptor) ==
                  alignof(WGPUComputePipelineDescriptor),
              "alignof mismatch for ComputePipelineDescriptor");

static_assert(offsetof(ComputePipelineDescriptor, nextInChain) ==
                  offsetof(WGPUComputePipelineDescriptor, nextInChain),
              "offsetof mismatch for ComputePipelineDescriptor::nextInChain");
static_assert(offsetof(ComputePipelineDescriptor, label) ==
                  offsetof(WGPUComputePipelineDescriptor, label),
              "offsetof mismatch for ComputePipelineDescriptor::label");
static_assert(offsetof(ComputePipelineDescriptor, layout) ==
                  offsetof(WGPUComputePipelineDescriptor, layout),
              "offsetof mismatch for ComputePipelineDescriptor::layout");
static_assert(offsetof(ComputePipelineDescriptor, compute) ==
                  offsetof(WGPUComputePipelineDescriptor, compute),
              "offsetof mismatch for ComputePipelineDescriptor::compute");

// DeviceDescriptor

static_assert(sizeof(DeviceDescriptor) == sizeof(WGPUDeviceDescriptor),
              "sizeof mismatch for DeviceDescriptor");
static_assert(alignof(DeviceDescriptor) == alignof(WGPUDeviceDescriptor),
              "alignof mismatch for DeviceDescriptor");

static_assert(offsetof(DeviceDescriptor, nextInChain) ==
                  offsetof(WGPUDeviceDescriptor, nextInChain),
              "offsetof mismatch for DeviceDescriptor::nextInChain");
static_assert(offsetof(DeviceDescriptor, label) ==
                  offsetof(WGPUDeviceDescriptor, label),
              "offsetof mismatch for DeviceDescriptor::label");
static_assert(offsetof(DeviceDescriptor, requiredFeatureCount) ==
                  offsetof(WGPUDeviceDescriptor, requiredFeatureCount),
              "offsetof mismatch for DeviceDescriptor::requiredFeatureCount");
static_assert(offsetof(DeviceDescriptor, requiredFeatures) ==
                  offsetof(WGPUDeviceDescriptor, requiredFeatures),
              "offsetof mismatch for DeviceDescriptor::requiredFeatures");
static_assert(offsetof(DeviceDescriptor, requiredLimits) ==
                  offsetof(WGPUDeviceDescriptor, requiredLimits),
              "offsetof mismatch for DeviceDescriptor::requiredLimits");
static_assert(offsetof(DeviceDescriptor, defaultQueue) ==
                  offsetof(WGPUDeviceDescriptor, defaultQueue),
              "offsetof mismatch for DeviceDescriptor::defaultQueue");
static_assert(offsetof(DeviceDescriptor, deviceLostCallback) ==
                  offsetof(WGPUDeviceDescriptor, deviceLostCallback),
              "offsetof mismatch for DeviceDescriptor::deviceLostCallback");
static_assert(offsetof(DeviceDescriptor, deviceLostUserdata) ==
                  offsetof(WGPUDeviceDescriptor, deviceLostUserdata),
              "offsetof mismatch for DeviceDescriptor::deviceLostUserdata");

// RenderPassDescriptor

static_assert(sizeof(RenderPassDescriptor) == sizeof(WGPURenderPassDescriptor),
              "sizeof mismatch for RenderPassDescriptor");
static_assert(alignof(RenderPassDescriptor) ==
                  alignof(WGPURenderPassDescriptor),
              "alignof mismatch for RenderPassDescriptor");

static_assert(offsetof(RenderPassDescriptor, nextInChain) ==
                  offsetof(WGPURenderPassDescriptor, nextInChain),
              "offsetof mismatch for RenderPassDescriptor::nextInChain");
static_assert(offsetof(RenderPassDescriptor, label) ==
                  offsetof(WGPURenderPassDescriptor, label),
              "offsetof mismatch for RenderPassDescriptor::label");
static_assert(
    offsetof(RenderPassDescriptor, colorAttachmentCount) ==
        offsetof(WGPURenderPassDescriptor, colorAttachmentCount),
    "offsetof mismatch for RenderPassDescriptor::colorAttachmentCount");
static_assert(offsetof(RenderPassDescriptor, colorAttachments) ==
                  offsetof(WGPURenderPassDescriptor, colorAttachments),
              "offsetof mismatch for RenderPassDescriptor::colorAttachments");
static_assert(
    offsetof(RenderPassDescriptor, depthStencilAttachment) ==
        offsetof(WGPURenderPassDescriptor, depthStencilAttachment),
    "offsetof mismatch for RenderPassDescriptor::depthStencilAttachment");
static_assert(offsetof(RenderPassDescriptor, occlusionQuerySet) ==
                  offsetof(WGPURenderPassDescriptor, occlusionQuerySet),
              "offsetof mismatch for RenderPassDescriptor::occlusionQuerySet");
static_assert(offsetof(RenderPassDescriptor, timestampWrites) ==
                  offsetof(WGPURenderPassDescriptor, timestampWrites),
              "offsetof mismatch for RenderPassDescriptor::timestampWrites");

// RenderPassPixelLocalStorage

static_assert(sizeof(RenderPassPixelLocalStorage) ==
                  sizeof(WGPURenderPassPixelLocalStorage),
              "sizeof mismatch for RenderPassPixelLocalStorage");
static_assert(alignof(RenderPassPixelLocalStorage) ==
                  alignof(WGPURenderPassPixelLocalStorage),
              "alignof mismatch for RenderPassPixelLocalStorage");

static_assert(offsetof(RenderPassPixelLocalStorage,
                       totalPixelLocalStorageSize) ==
                  offsetof(WGPURenderPassPixelLocalStorage,
                           totalPixelLocalStorageSize),
              "offsetof mismatch for "
              "RenderPassPixelLocalStorage::totalPixelLocalStorageSize");
static_assert(offsetof(RenderPassPixelLocalStorage, storageAttachmentCount) ==
                  offsetof(WGPURenderPassPixelLocalStorage,
                           storageAttachmentCount),
              "offsetof mismatch for "
              "RenderPassPixelLocalStorage::storageAttachmentCount");
static_assert(
    offsetof(RenderPassPixelLocalStorage, storageAttachments) ==
        offsetof(WGPURenderPassPixelLocalStorage, storageAttachments),
    "offsetof mismatch for RenderPassPixelLocalStorage::storageAttachments");

// VertexState

static_assert(sizeof(VertexState) == sizeof(WGPUVertexState),
              "sizeof mismatch for VertexState");
static_assert(alignof(VertexState) == alignof(WGPUVertexState),
              "alignof mismatch for VertexState");

static_assert(offsetof(VertexState, nextInChain) ==
                  offsetof(WGPUVertexState, nextInChain),
              "offsetof mismatch for VertexState::nextInChain");
static_assert(offsetof(VertexState, module) ==
                  offsetof(WGPUVertexState, module),
              "offsetof mismatch for VertexState::module");
static_assert(offsetof(VertexState, entryPoint) ==
                  offsetof(WGPUVertexState, entryPoint),
              "offsetof mismatch for VertexState::entryPoint");
static_assert(offsetof(VertexState, constantCount) ==
                  offsetof(WGPUVertexState, constantCount),
              "offsetof mismatch for VertexState::constantCount");
static_assert(offsetof(VertexState, constants) ==
                  offsetof(WGPUVertexState, constants),
              "offsetof mismatch for VertexState::constants");
static_assert(offsetof(VertexState, bufferCount) ==
                  offsetof(WGPUVertexState, bufferCount),
              "offsetof mismatch for VertexState::bufferCount");
static_assert(offsetof(VertexState, buffers) ==
                  offsetof(WGPUVertexState, buffers),
              "offsetof mismatch for VertexState::buffers");

// FragmentState

static_assert(sizeof(FragmentState) == sizeof(WGPUFragmentState),
              "sizeof mismatch for FragmentState");
static_assert(alignof(FragmentState) == alignof(WGPUFragmentState),
              "alignof mismatch for FragmentState");

static_assert(offsetof(FragmentState, nextInChain) ==
                  offsetof(WGPUFragmentState, nextInChain),
              "offsetof mismatch for FragmentState::nextInChain");
static_assert(offsetof(FragmentState, module) ==
                  offsetof(WGPUFragmentState, module),
              "offsetof mismatch for FragmentState::module");
static_assert(offsetof(FragmentState, entryPoint) ==
                  offsetof(WGPUFragmentState, entryPoint),
              "offsetof mismatch for FragmentState::entryPoint");
static_assert(offsetof(FragmentState, constantCount) ==
                  offsetof(WGPUFragmentState, constantCount),
              "offsetof mismatch for FragmentState::constantCount");
static_assert(offsetof(FragmentState, constants) ==
                  offsetof(WGPUFragmentState, constants),
              "offsetof mismatch for FragmentState::constants");
static_assert(offsetof(FragmentState, targetCount) ==
                  offsetof(WGPUFragmentState, targetCount),
              "offsetof mismatch for FragmentState::targetCount");
static_assert(offsetof(FragmentState, targets) ==
                  offsetof(WGPUFragmentState, targets),
              "offsetof mismatch for FragmentState::targets");

// RenderPipelineDescriptor

static_assert(sizeof(RenderPipelineDescriptor) ==
                  sizeof(WGPURenderPipelineDescriptor),
              "sizeof mismatch for RenderPipelineDescriptor");
static_assert(alignof(RenderPipelineDescriptor) ==
                  alignof(WGPURenderPipelineDescriptor),
              "alignof mismatch for RenderPipelineDescriptor");

static_assert(offsetof(RenderPipelineDescriptor, nextInChain) ==
                  offsetof(WGPURenderPipelineDescriptor, nextInChain),
              "offsetof mismatch for RenderPipelineDescriptor::nextInChain");
static_assert(offsetof(RenderPipelineDescriptor, label) ==
                  offsetof(WGPURenderPipelineDescriptor, label),
              "offsetof mismatch for RenderPipelineDescriptor::label");
static_assert(offsetof(RenderPipelineDescriptor, layout) ==
                  offsetof(WGPURenderPipelineDescriptor, layout),
              "offsetof mismatch for RenderPipelineDescriptor::layout");
static_assert(offsetof(RenderPipelineDescriptor, vertex) ==
                  offsetof(WGPURenderPipelineDescriptor, vertex),
              "offsetof mismatch for RenderPipelineDescriptor::vertex");
static_assert(offsetof(RenderPipelineDescriptor, primitive) ==
                  offsetof(WGPURenderPipelineDescriptor, primitive),
              "offsetof mismatch for RenderPipelineDescriptor::primitive");
static_assert(offsetof(RenderPipelineDescriptor, depthStencil) ==
                  offsetof(WGPURenderPipelineDescriptor, depthStencil),
              "offsetof mismatch for RenderPipelineDescriptor::depthStencil");
static_assert(offsetof(RenderPipelineDescriptor, multisample) ==
                  offsetof(WGPURenderPipelineDescriptor, multisample),
              "offsetof mismatch for RenderPipelineDescriptor::multisample");
static_assert(offsetof(RenderPipelineDescriptor, fragment) ==
                  offsetof(WGPURenderPipelineDescriptor, fragment),
              "offsetof mismatch for RenderPipelineDescriptor::fragment");
template <typename T> static T &AsNonConstReference(const T &value) {
  return const_cast<T &>(value);
}

// AdapterProperties
AdapterProperties::~AdapterProperties() {
  if (this->vendorName != nullptr || this->architecture != nullptr ||
      this->name != nullptr || this->driverDescription != nullptr) {
    wgpuAdapterPropertiesFreeMembers(
        *reinterpret_cast<WGPUAdapterProperties *>(this));
  }
}

static void Reset(AdapterProperties &value) {
  AdapterProperties defaultValue{};
  AsNonConstReference(value.vendorID) = defaultValue.vendorID;
  AsNonConstReference(value.vendorName) = defaultValue.vendorName;
  AsNonConstReference(value.architecture) = defaultValue.architecture;
  AsNonConstReference(value.deviceID) = defaultValue.deviceID;
  AsNonConstReference(value.name) = defaultValue.name;
  AsNonConstReference(value.driverDescription) = defaultValue.driverDescription;
  AsNonConstReference(value.adapterType) = defaultValue.adapterType;
  AsNonConstReference(value.backendType) = defaultValue.backendType;
  AsNonConstReference(value.compatibilityMode) = defaultValue.compatibilityMode;
}

AdapterProperties::AdapterProperties(AdapterProperties &&rhs)
    : vendorID(rhs.vendorID), vendorName(rhs.vendorName),
      architecture(rhs.architecture), deviceID(rhs.deviceID), name(rhs.name),
      driverDescription(rhs.driverDescription), adapterType(rhs.adapterType),
      backendType(rhs.backendType), compatibilityMode(rhs.compatibilityMode) {
  Reset(rhs);
}

AdapterProperties &AdapterProperties::operator=(AdapterProperties &&rhs) {
  if (&rhs == this) {
    return *this;
  }
  this->~AdapterProperties();
  AsNonConstReference(this->vendorID) = std::move(rhs.vendorID);
  AsNonConstReference(this->vendorName) = std::move(rhs.vendorName);
  AsNonConstReference(this->architecture) = std::move(rhs.architecture);
  AsNonConstReference(this->deviceID) = std::move(rhs.deviceID);
  AsNonConstReference(this->name) = std::move(rhs.name);
  AsNonConstReference(this->driverDescription) =
      std::move(rhs.driverDescription);
  AsNonConstReference(this->adapterType) = std::move(rhs.adapterType);
  AsNonConstReference(this->backendType) = std::move(rhs.backendType);
  AsNonConstReference(this->compatibilityMode) =
      std::move(rhs.compatibilityMode);
  Reset(rhs);
  return *this;
}

// SharedBufferMemoryEndAccessState
SharedBufferMemoryEndAccessState::~SharedBufferMemoryEndAccessState() {
  if (this->fences != nullptr || this->signaledValues != nullptr) {
    wgpuSharedBufferMemoryEndAccessStateFreeMembers(
        *reinterpret_cast<WGPUSharedBufferMemoryEndAccessState *>(this));
  }
}

static void Reset(SharedBufferMemoryEndAccessState &value) {
  SharedBufferMemoryEndAccessState defaultValue{};
  AsNonConstReference(value.initialized) = defaultValue.initialized;
  AsNonConstReference(value.fenceCount) = defaultValue.fenceCount;
  AsNonConstReference(value.fences) = defaultValue.fences;
  AsNonConstReference(value.signaledValues) = defaultValue.signaledValues;
}

SharedBufferMemoryEndAccessState::SharedBufferMemoryEndAccessState(
    SharedBufferMemoryEndAccessState &&rhs)
    : initialized(rhs.initialized), fenceCount(rhs.fenceCount),
      fences(rhs.fences), signaledValues(rhs.signaledValues) {
  Reset(rhs);
}

SharedBufferMemoryEndAccessState &SharedBufferMemoryEndAccessState::operator=(
    SharedBufferMemoryEndAccessState &&rhs) {
  if (&rhs == this) {
    return *this;
  }
  this->~SharedBufferMemoryEndAccessState();
  AsNonConstReference(this->initialized) = std::move(rhs.initialized);
  AsNonConstReference(this->fenceCount) = std::move(rhs.fenceCount);
  AsNonConstReference(this->fences) = std::move(rhs.fences);
  AsNonConstReference(this->signaledValues) = std::move(rhs.signaledValues);
  Reset(rhs);
  return *this;
}

// SharedTextureMemoryEndAccessState
SharedTextureMemoryEndAccessState::~SharedTextureMemoryEndAccessState() {
  if (this->fences != nullptr || this->signaledValues != nullptr) {
    wgpuSharedTextureMemoryEndAccessStateFreeMembers(
        *reinterpret_cast<WGPUSharedTextureMemoryEndAccessState *>(this));
  }
}

static void Reset(SharedTextureMemoryEndAccessState &value) {
  SharedTextureMemoryEndAccessState defaultValue{};
  AsNonConstReference(value.initialized) = defaultValue.initialized;
  AsNonConstReference(value.fenceCount) = defaultValue.fenceCount;
  AsNonConstReference(value.fences) = defaultValue.fences;
  AsNonConstReference(value.signaledValues) = defaultValue.signaledValues;
}

SharedTextureMemoryEndAccessState::SharedTextureMemoryEndAccessState(
    SharedTextureMemoryEndAccessState &&rhs)
    : initialized(rhs.initialized), fenceCount(rhs.fenceCount),
      fences(rhs.fences), signaledValues(rhs.signaledValues) {
  Reset(rhs);
}

SharedTextureMemoryEndAccessState &SharedTextureMemoryEndAccessState::operator=(
    SharedTextureMemoryEndAccessState &&rhs) {
  if (&rhs == this) {
    return *this;
  }
  this->~SharedTextureMemoryEndAccessState();
  AsNonConstReference(this->initialized) = std::move(rhs.initialized);
  AsNonConstReference(this->fenceCount) = std::move(rhs.fenceCount);
  AsNonConstReference(this->fences) = std::move(rhs.fences);
  AsNonConstReference(this->signaledValues) = std::move(rhs.signaledValues);
  Reset(rhs);
  return *this;
}

// AdapterPropertiesMemoryHeaps
AdapterPropertiesMemoryHeaps::~AdapterPropertiesMemoryHeaps() {
  if (this->heapInfo != nullptr) {
    wgpuAdapterPropertiesMemoryHeapsFreeMembers(
        *reinterpret_cast<WGPUAdapterPropertiesMemoryHeaps *>(this));
  }
}

static void Reset(AdapterPropertiesMemoryHeaps &value) {
  AdapterPropertiesMemoryHeaps defaultValue{};
  AsNonConstReference(value.heapCount) = defaultValue.heapCount;
  AsNonConstReference(value.heapInfo) = defaultValue.heapInfo;
}

AdapterPropertiesMemoryHeaps::AdapterPropertiesMemoryHeaps(
    AdapterPropertiesMemoryHeaps &&rhs)
    : heapCount(rhs.heapCount), heapInfo(rhs.heapInfo) {
  Reset(rhs);
}

AdapterPropertiesMemoryHeaps &
AdapterPropertiesMemoryHeaps::operator=(AdapterPropertiesMemoryHeaps &&rhs) {
  if (&rhs == this) {
    return *this;
  }
  this->~AdapterPropertiesMemoryHeaps();
  AsNonConstReference(this->heapCount) = std::move(rhs.heapCount);
  AsNonConstReference(this->heapInfo) = std::move(rhs.heapInfo);
  Reset(rhs);
  return *this;
}

// DrmFormatCapabilities
DrmFormatCapabilities::~DrmFormatCapabilities() {
  if (this->properties != nullptr) {
    wgpuDrmFormatCapabilitiesFreeMembers(
        *reinterpret_cast<WGPUDrmFormatCapabilities *>(this));
  }
}

static void Reset(DrmFormatCapabilities &value) {
  DrmFormatCapabilities defaultValue{};
  AsNonConstReference(value.propertiesCount) = defaultValue.propertiesCount;
  AsNonConstReference(value.properties) = defaultValue.properties;
}

DrmFormatCapabilities::DrmFormatCapabilities(DrmFormatCapabilities &&rhs)
    : propertiesCount(rhs.propertiesCount), properties(rhs.properties) {
  Reset(rhs);
}

DrmFormatCapabilities &
DrmFormatCapabilities::operator=(DrmFormatCapabilities &&rhs) {
  if (&rhs == this) {
    return *this;
  }
  this->~DrmFormatCapabilities();
  AsNonConstReference(this->propertiesCount) = std::move(rhs.propertiesCount);
  AsNonConstReference(this->properties) = std::move(rhs.properties);
  Reset(rhs);
  return *this;
}

// Adapter

static_assert(sizeof(Adapter) == sizeof(WGPUAdapter),
              "sizeof mismatch for Adapter");
static_assert(alignof(Adapter) == alignof(WGPUAdapter),
              "alignof mismatch for Adapter");

Device Adapter::CreateDevice(DeviceDescriptor const *descriptor) const {
  auto result = wgpuAdapterCreateDevice(
      Get(), reinterpret_cast<WGPUDeviceDescriptor const *>(descriptor));
  return Device::Acquire(result);
}
size_t Adapter::EnumerateFeatures(FeatureName *features) const {
  auto result = wgpuAdapterEnumerateFeatures(
      Get(), reinterpret_cast<WGPUFeatureName *>(features));
  return result;
}
Bool Adapter::GetFormatCapabilities(TextureFormat format,
                                    FormatCapabilities *capabilities) const {
  auto result = wgpuAdapterGetFormatCapabilities(
      Get(), static_cast<WGPUTextureFormat>(format),
      reinterpret_cast<WGPUFormatCapabilities *>(capabilities));
  return result;
}
Instance Adapter::GetInstance() const {
  auto result = wgpuAdapterGetInstance(Get());
  return Instance::Acquire(result);
}
Bool Adapter::GetLimits(SupportedLimits *limits) const {
  auto result = wgpuAdapterGetLimits(
      Get(), reinterpret_cast<WGPUSupportedLimits *>(limits));
  return result;
}
void Adapter::GetProperties(AdapterProperties *properties) const {
  *properties = AdapterProperties();
  wgpuAdapterGetProperties(
      Get(), reinterpret_cast<WGPUAdapterProperties *>(properties));
}
Bool Adapter::HasFeature(FeatureName feature) const {
  auto result =
      wgpuAdapterHasFeature(Get(), static_cast<WGPUFeatureName>(feature));
  return result;
}
void Adapter::RequestDevice(DeviceDescriptor const *descriptor,
                            RequestDeviceCallback callback,
                            void *userdata) const {
  wgpuAdapterRequestDevice(
      Get(), reinterpret_cast<WGPUDeviceDescriptor const *>(descriptor),
      callback, userdata);
}
Future Adapter::RequestDevice(DeviceDescriptor const *options,
                              RequestDeviceCallbackInfo callbackInfo) const {
  auto result = wgpuAdapterRequestDeviceF(
      Get(), reinterpret_cast<WGPUDeviceDescriptor const *>(options),
      *reinterpret_cast<WGPURequestDeviceCallbackInfo const *>(&callbackInfo));
  return Future{result.id};
}
void Adapter::WGPUReference(WGPUAdapter handle) {
  if (handle != nullptr) {
    wgpuAdapterReference(handle);
  }
}
void Adapter::WGPURelease(WGPUAdapter handle) {
  if (handle != nullptr) {
    wgpuAdapterRelease(handle);
  }
}

// BindGroup

static_assert(sizeof(BindGroup) == sizeof(WGPUBindGroup),
              "sizeof mismatch for BindGroup");
static_assert(alignof(BindGroup) == alignof(WGPUBindGroup),
              "alignof mismatch for BindGroup");

void BindGroup::SetLabel(char const *label) const {
  wgpuBindGroupSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void BindGroup::WGPUReference(WGPUBindGroup handle) {
  if (handle != nullptr) {
    wgpuBindGroupReference(handle);
  }
}
void BindGroup::WGPURelease(WGPUBindGroup handle) {
  if (handle != nullptr) {
    wgpuBindGroupRelease(handle);
  }
}

// BindGroupLayout

static_assert(sizeof(BindGroupLayout) == sizeof(WGPUBindGroupLayout),
              "sizeof mismatch for BindGroupLayout");
static_assert(alignof(BindGroupLayout) == alignof(WGPUBindGroupLayout),
              "alignof mismatch for BindGroupLayout");

void BindGroupLayout::SetLabel(char const *label) const {
  wgpuBindGroupLayoutSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void BindGroupLayout::WGPUReference(WGPUBindGroupLayout handle) {
  if (handle != nullptr) {
    wgpuBindGroupLayoutReference(handle);
  }
}
void BindGroupLayout::WGPURelease(WGPUBindGroupLayout handle) {
  if (handle != nullptr) {
    wgpuBindGroupLayoutRelease(handle);
  }
}

// Buffer

static_assert(sizeof(Buffer) == sizeof(WGPUBuffer),
              "sizeof mismatch for Buffer");
static_assert(alignof(Buffer) == alignof(WGPUBuffer),
              "alignof mismatch for Buffer");

void Buffer::Destroy() const { wgpuBufferDestroy(Get()); }
void const *Buffer::GetConstMappedRange(size_t offset, size_t size) const {
  auto result = wgpuBufferGetConstMappedRange(Get(), offset, size);
  return result;
}
BufferMapState Buffer::GetMapState() const {
  auto result = wgpuBufferGetMapState(Get());
  return static_cast<BufferMapState>(result);
}
void *Buffer::GetMappedRange(size_t offset, size_t size) const {
  auto result = wgpuBufferGetMappedRange(Get(), offset, size);
  return result;
}
uint64_t Buffer::GetSize() const {
  auto result = wgpuBufferGetSize(Get());
  return result;
}
BufferUsage Buffer::GetUsage() const {
  auto result = wgpuBufferGetUsage(Get());
  return static_cast<BufferUsage>(result);
}
void Buffer::MapAsync(MapMode mode, size_t offset, size_t size,
                      BufferMapCallback callback, void *userdata) const {
  wgpuBufferMapAsync(Get(), static_cast<WGPUMapMode>(mode), offset, size,
                     callback, userdata);
}
Future Buffer::MapAsync(MapMode mode, size_t offset, size_t size,
                        BufferMapCallbackInfo callbackInfo) const {
  auto result = wgpuBufferMapAsyncF(
      Get(), static_cast<WGPUMapMode>(mode), offset, size,
      *reinterpret_cast<WGPUBufferMapCallbackInfo const *>(&callbackInfo));
  return Future{result.id};
}
void Buffer::SetLabel(char const *label) const {
  wgpuBufferSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void Buffer::Unmap() const { wgpuBufferUnmap(Get()); }
void Buffer::WGPUReference(WGPUBuffer handle) {
  if (handle != nullptr) {
    wgpuBufferReference(handle);
  }
}
void Buffer::WGPURelease(WGPUBuffer handle) {
  if (handle != nullptr) {
    wgpuBufferRelease(handle);
  }
}

// CommandBuffer

static_assert(sizeof(CommandBuffer) == sizeof(WGPUCommandBuffer),
              "sizeof mismatch for CommandBuffer");
static_assert(alignof(CommandBuffer) == alignof(WGPUCommandBuffer),
              "alignof mismatch for CommandBuffer");

void CommandBuffer::SetLabel(char const *label) const {
  wgpuCommandBufferSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void CommandBuffer::WGPUReference(WGPUCommandBuffer handle) {
  if (handle != nullptr) {
    wgpuCommandBufferReference(handle);
  }
}
void CommandBuffer::WGPURelease(WGPUCommandBuffer handle) {
  if (handle != nullptr) {
    wgpuCommandBufferRelease(handle);
  }
}

// CommandEncoder

static_assert(sizeof(CommandEncoder) == sizeof(WGPUCommandEncoder),
              "sizeof mismatch for CommandEncoder");
static_assert(alignof(CommandEncoder) == alignof(WGPUCommandEncoder),
              "alignof mismatch for CommandEncoder");

ComputePassEncoder CommandEncoder::BeginComputePass(
    ComputePassDescriptor const *descriptor) const {
  auto result = wgpuCommandEncoderBeginComputePass(
      Get(), reinterpret_cast<WGPUComputePassDescriptor const *>(descriptor));
  return ComputePassEncoder::Acquire(result);
}
RenderPassEncoder
CommandEncoder::BeginRenderPass(RenderPassDescriptor const *descriptor) const {
  auto result = wgpuCommandEncoderBeginRenderPass(
      Get(), reinterpret_cast<WGPURenderPassDescriptor const *>(descriptor));
  return RenderPassEncoder::Acquire(result);
}
void CommandEncoder::ClearBuffer(Buffer const &buffer, uint64_t offset,
                                 uint64_t size) const {
  wgpuCommandEncoderClearBuffer(Get(), buffer.Get(), offset, size);
}
void CommandEncoder::CopyBufferToBuffer(Buffer const &source,
                                        uint64_t sourceOffset,
                                        Buffer const &destination,
                                        uint64_t destinationOffset,
                                        uint64_t size) const {
  wgpuCommandEncoderCopyBufferToBuffer(Get(), source.Get(), sourceOffset,
                                       destination.Get(), destinationOffset,
                                       size);
}
void CommandEncoder::CopyBufferToTexture(ImageCopyBuffer const *source,
                                         ImageCopyTexture const *destination,
                                         Extent3D const *copySize) const {
  wgpuCommandEncoderCopyBufferToTexture(
      Get(), reinterpret_cast<WGPUImageCopyBuffer const *>(source),
      reinterpret_cast<WGPUImageCopyTexture const *>(destination),
      reinterpret_cast<WGPUExtent3D const *>(copySize));
}
void CommandEncoder::CopyTextureToBuffer(ImageCopyTexture const *source,
                                         ImageCopyBuffer const *destination,
                                         Extent3D const *copySize) const {
  wgpuCommandEncoderCopyTextureToBuffer(
      Get(), reinterpret_cast<WGPUImageCopyTexture const *>(source),
      reinterpret_cast<WGPUImageCopyBuffer const *>(destination),
      reinterpret_cast<WGPUExtent3D const *>(copySize));
}
void CommandEncoder::CopyTextureToTexture(ImageCopyTexture const *source,
                                          ImageCopyTexture const *destination,
                                          Extent3D const *copySize) const {
  wgpuCommandEncoderCopyTextureToTexture(
      Get(), reinterpret_cast<WGPUImageCopyTexture const *>(source),
      reinterpret_cast<WGPUImageCopyTexture const *>(destination),
      reinterpret_cast<WGPUExtent3D const *>(copySize));
}
CommandBuffer
CommandEncoder::Finish(CommandBufferDescriptor const *descriptor) const {
  auto result = wgpuCommandEncoderFinish(
      Get(), reinterpret_cast<WGPUCommandBufferDescriptor const *>(descriptor));
  return CommandBuffer::Acquire(result);
}
void CommandEncoder::InjectValidationError(char const *message) const {
  wgpuCommandEncoderInjectValidationError(
      Get(), reinterpret_cast<char const *>(message));
}
void CommandEncoder::InsertDebugMarker(char const *markerLabel) const {
  wgpuCommandEncoderInsertDebugMarker(
      Get(), reinterpret_cast<char const *>(markerLabel));
}
void CommandEncoder::PopDebugGroup() const {
  wgpuCommandEncoderPopDebugGroup(Get());
}
void CommandEncoder::PushDebugGroup(char const *groupLabel) const {
  wgpuCommandEncoderPushDebugGroup(Get(),
                                   reinterpret_cast<char const *>(groupLabel));
}
void CommandEncoder::ResolveQuerySet(QuerySet const &querySet,
                                     uint32_t firstQuery, uint32_t queryCount,
                                     Buffer const &destination,
                                     uint64_t destinationOffset) const {
  wgpuCommandEncoderResolveQuerySet(Get(), querySet.Get(), firstQuery,
                                    queryCount, destination.Get(),
                                    destinationOffset);
}
void CommandEncoder::SetLabel(char const *label) const {
  wgpuCommandEncoderSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void CommandEncoder::WriteBuffer(Buffer const &buffer, uint64_t bufferOffset,
                                 uint8_t const *data, uint64_t size) const {
  wgpuCommandEncoderWriteBuffer(Get(), buffer.Get(), bufferOffset,
                                reinterpret_cast<uint8_t const *>(data), size);
}
void CommandEncoder::WriteTimestamp(QuerySet const &querySet,
                                    uint32_t queryIndex) const {
  wgpuCommandEncoderWriteTimestamp(Get(), querySet.Get(), queryIndex);
}
void CommandEncoder::WGPUReference(WGPUCommandEncoder handle) {
  if (handle != nullptr) {
    wgpuCommandEncoderReference(handle);
  }
}
void CommandEncoder::WGPURelease(WGPUCommandEncoder handle) {
  if (handle != nullptr) {
    wgpuCommandEncoderRelease(handle);
  }
}

// ComputePassEncoder

static_assert(sizeof(ComputePassEncoder) == sizeof(WGPUComputePassEncoder),
              "sizeof mismatch for ComputePassEncoder");
static_assert(alignof(ComputePassEncoder) == alignof(WGPUComputePassEncoder),
              "alignof mismatch for ComputePassEncoder");

void ComputePassEncoder::DispatchWorkgroups(uint32_t workgroupCountX,
                                            uint32_t workgroupCountY,
                                            uint32_t workgroupCountZ) const {
  wgpuComputePassEncoderDispatchWorkgroups(Get(), workgroupCountX,
                                           workgroupCountY, workgroupCountZ);
}
void ComputePassEncoder::DispatchWorkgroupsIndirect(
    Buffer const &indirectBuffer, uint64_t indirectOffset) const {
  wgpuComputePassEncoderDispatchWorkgroupsIndirect(Get(), indirectBuffer.Get(),
                                                   indirectOffset);
}
void ComputePassEncoder::End() const { wgpuComputePassEncoderEnd(Get()); }
void ComputePassEncoder::InsertDebugMarker(char const *markerLabel) const {
  wgpuComputePassEncoderInsertDebugMarker(
      Get(), reinterpret_cast<char const *>(markerLabel));
}
void ComputePassEncoder::PopDebugGroup() const {
  wgpuComputePassEncoderPopDebugGroup(Get());
}
void ComputePassEncoder::PushDebugGroup(char const *groupLabel) const {
  wgpuComputePassEncoderPushDebugGroup(
      Get(), reinterpret_cast<char const *>(groupLabel));
}
void ComputePassEncoder::SetBindGroup(uint32_t groupIndex,
                                      BindGroup const &group,
                                      size_t dynamicOffsetCount,
                                      uint32_t const *dynamicOffsets) const {
  wgpuComputePassEncoderSetBindGroup(
      Get(), groupIndex, group.Get(), dynamicOffsetCount,
      reinterpret_cast<uint32_t const *>(dynamicOffsets));
}
void ComputePassEncoder::SetLabel(char const *label) const {
  wgpuComputePassEncoderSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void ComputePassEncoder::SetPipeline(ComputePipeline const &pipeline) const {
  wgpuComputePassEncoderSetPipeline(Get(), pipeline.Get());
}
void ComputePassEncoder::WriteTimestamp(QuerySet const &querySet,
                                        uint32_t queryIndex) const {
  wgpuComputePassEncoderWriteTimestamp(Get(), querySet.Get(), queryIndex);
}
void ComputePassEncoder::WGPUReference(WGPUComputePassEncoder handle) {
  if (handle != nullptr) {
    wgpuComputePassEncoderReference(handle);
  }
}
void ComputePassEncoder::WGPURelease(WGPUComputePassEncoder handle) {
  if (handle != nullptr) {
    wgpuComputePassEncoderRelease(handle);
  }
}

// ComputePipeline

static_assert(sizeof(ComputePipeline) == sizeof(WGPUComputePipeline),
              "sizeof mismatch for ComputePipeline");
static_assert(alignof(ComputePipeline) == alignof(WGPUComputePipeline),
              "alignof mismatch for ComputePipeline");

BindGroupLayout ComputePipeline::GetBindGroupLayout(uint32_t groupIndex) const {
  auto result = wgpuComputePipelineGetBindGroupLayout(Get(), groupIndex);
  return BindGroupLayout::Acquire(result);
}
void ComputePipeline::SetLabel(char const *label) const {
  wgpuComputePipelineSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void ComputePipeline::WGPUReference(WGPUComputePipeline handle) {
  if (handle != nullptr) {
    wgpuComputePipelineReference(handle);
  }
}
void ComputePipeline::WGPURelease(WGPUComputePipeline handle) {
  if (handle != nullptr) {
    wgpuComputePipelineRelease(handle);
  }
}

// Device

static_assert(sizeof(Device) == sizeof(WGPUDevice),
              "sizeof mismatch for Device");
static_assert(alignof(Device) == alignof(WGPUDevice),
              "alignof mismatch for Device");

BindGroup Device::CreateBindGroup(BindGroupDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateBindGroup(
      Get(), reinterpret_cast<WGPUBindGroupDescriptor const *>(descriptor));
  return BindGroup::Acquire(result);
}
BindGroupLayout Device::CreateBindGroupLayout(
    BindGroupLayoutDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateBindGroupLayout(
      Get(),
      reinterpret_cast<WGPUBindGroupLayoutDescriptor const *>(descriptor));
  return BindGroupLayout::Acquire(result);
}
Buffer Device::CreateBuffer(BufferDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateBuffer(
      Get(), reinterpret_cast<WGPUBufferDescriptor const *>(descriptor));
  return Buffer::Acquire(result);
}
CommandEncoder
Device::CreateCommandEncoder(CommandEncoderDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateCommandEncoder(
      Get(),
      reinterpret_cast<WGPUCommandEncoderDescriptor const *>(descriptor));
  return CommandEncoder::Acquire(result);
}
ComputePipeline Device::CreateComputePipeline(
    ComputePipelineDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateComputePipeline(
      Get(),
      reinterpret_cast<WGPUComputePipelineDescriptor const *>(descriptor));
  return ComputePipeline::Acquire(result);
}
void Device::CreateComputePipelineAsync(
    ComputePipelineDescriptor const *descriptor,
    CreateComputePipelineAsyncCallback callback, void *userdata) const {
  wgpuDeviceCreateComputePipelineAsync(
      Get(),
      reinterpret_cast<WGPUComputePipelineDescriptor const *>(descriptor),
      callback, userdata);
}
Future Device::CreateComputePipelineAsync(
    ComputePipelineDescriptor const *descriptor,
    CreateComputePipelineAsyncCallbackInfo callbackInfo) const {
  auto result = wgpuDeviceCreateComputePipelineAsyncF(
      Get(),
      reinterpret_cast<WGPUComputePipelineDescriptor const *>(descriptor),
      *reinterpret_cast<WGPUCreateComputePipelineAsyncCallbackInfo const *>(
          &callbackInfo));
  return Future{result.id};
}
Buffer Device::CreateErrorBuffer(BufferDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateErrorBuffer(
      Get(), reinterpret_cast<WGPUBufferDescriptor const *>(descriptor));
  return Buffer::Acquire(result);
}
ExternalTexture Device::CreateErrorExternalTexture() const {
  auto result = wgpuDeviceCreateErrorExternalTexture(Get());
  return ExternalTexture::Acquire(result);
}
ShaderModule
Device::CreateErrorShaderModule(ShaderModuleDescriptor const *descriptor,
                                char const *errorMessage) const {
  auto result = wgpuDeviceCreateErrorShaderModule(
      Get(), reinterpret_cast<WGPUShaderModuleDescriptor const *>(descriptor),
      reinterpret_cast<char const *>(errorMessage));
  return ShaderModule::Acquire(result);
}
Texture Device::CreateErrorTexture(TextureDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateErrorTexture(
      Get(), reinterpret_cast<WGPUTextureDescriptor const *>(descriptor));
  return Texture::Acquire(result);
}
ExternalTexture Device::CreateExternalTexture(
    ExternalTextureDescriptor const *externalTextureDescriptor) const {
  auto result = wgpuDeviceCreateExternalTexture(
      Get(), reinterpret_cast<WGPUExternalTextureDescriptor const *>(
                 externalTextureDescriptor));
  return ExternalTexture::Acquire(result);
}
PipelineLayout
Device::CreatePipelineLayout(PipelineLayoutDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreatePipelineLayout(
      Get(),
      reinterpret_cast<WGPUPipelineLayoutDescriptor const *>(descriptor));
  return PipelineLayout::Acquire(result);
}
QuerySet Device::CreateQuerySet(QuerySetDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateQuerySet(
      Get(), reinterpret_cast<WGPUQuerySetDescriptor const *>(descriptor));
  return QuerySet::Acquire(result);
}
RenderBundleEncoder Device::CreateRenderBundleEncoder(
    RenderBundleEncoderDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateRenderBundleEncoder(
      Get(),
      reinterpret_cast<WGPURenderBundleEncoderDescriptor const *>(descriptor));
  return RenderBundleEncoder::Acquire(result);
}
RenderPipeline
Device::CreateRenderPipeline(RenderPipelineDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateRenderPipeline(
      Get(),
      reinterpret_cast<WGPURenderPipelineDescriptor const *>(descriptor));
  return RenderPipeline::Acquire(result);
}
void Device::CreateRenderPipelineAsync(
    RenderPipelineDescriptor const *descriptor,
    CreateRenderPipelineAsyncCallback callback, void *userdata) const {
  wgpuDeviceCreateRenderPipelineAsync(
      Get(), reinterpret_cast<WGPURenderPipelineDescriptor const *>(descriptor),
      callback, userdata);
}
Future Device::CreateRenderPipelineAsync(
    RenderPipelineDescriptor const *descriptor,
    CreateRenderPipelineAsyncCallbackInfo callbackInfo) const {
  auto result = wgpuDeviceCreateRenderPipelineAsyncF(
      Get(), reinterpret_cast<WGPURenderPipelineDescriptor const *>(descriptor),
      *reinterpret_cast<WGPUCreateRenderPipelineAsyncCallbackInfo const *>(
          &callbackInfo));
  return Future{result.id};
}
Sampler Device::CreateSampler(SamplerDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateSampler(
      Get(), reinterpret_cast<WGPUSamplerDescriptor const *>(descriptor));
  return Sampler::Acquire(result);
}
ShaderModule
Device::CreateShaderModule(ShaderModuleDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateShaderModule(
      Get(), reinterpret_cast<WGPUShaderModuleDescriptor const *>(descriptor));
  return ShaderModule::Acquire(result);
}
SwapChain Device::CreateSwapChain(Surface const &surface,
                                  SwapChainDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateSwapChain(
      Get(), surface.Get(),
      reinterpret_cast<WGPUSwapChainDescriptor const *>(descriptor));
  return SwapChain::Acquire(result);
}
Texture Device::CreateTexture(TextureDescriptor const *descriptor) const {
  auto result = wgpuDeviceCreateTexture(
      Get(), reinterpret_cast<WGPUTextureDescriptor const *>(descriptor));
  return Texture::Acquire(result);
}
void Device::Destroy() const { wgpuDeviceDestroy(Get()); }
size_t Device::EnumerateFeatures(FeatureName *features) const {
  auto result = wgpuDeviceEnumerateFeatures(
      Get(), reinterpret_cast<WGPUFeatureName *>(features));
  return result;
}
void Device::ForceLoss(DeviceLostReason type, char const *message) const {
  wgpuDeviceForceLoss(Get(), static_cast<WGPUDeviceLostReason>(type),
                      reinterpret_cast<char const *>(message));
}
Adapter Device::GetAdapter() const {
  auto result = wgpuDeviceGetAdapter(Get());
  return Adapter::Acquire(result);
}
Bool Device::GetLimits(SupportedLimits *limits) const {
  auto result = wgpuDeviceGetLimits(
      Get(), reinterpret_cast<WGPUSupportedLimits *>(limits));
  return result;
}
Queue Device::GetQueue() const {
  auto result = wgpuDeviceGetQueue(Get());
  return Queue::Acquire(result);
}
TextureUsage Device::GetSupportedSurfaceUsage(Surface const &surface) const {
  auto result = wgpuDeviceGetSupportedSurfaceUsage(Get(), surface.Get());
  return static_cast<TextureUsage>(result);
}
Bool Device::HasFeature(FeatureName feature) const {
  auto result =
      wgpuDeviceHasFeature(Get(), static_cast<WGPUFeatureName>(feature));
  return result;
}
SharedBufferMemory Device::ImportSharedBufferMemory(
    SharedBufferMemoryDescriptor const *descriptor) const {
  auto result = wgpuDeviceImportSharedBufferMemory(
      Get(),
      reinterpret_cast<WGPUSharedBufferMemoryDescriptor const *>(descriptor));
  return SharedBufferMemory::Acquire(result);
}
SharedFence
Device::ImportSharedFence(SharedFenceDescriptor const *descriptor) const {
  auto result = wgpuDeviceImportSharedFence(
      Get(), reinterpret_cast<WGPUSharedFenceDescriptor const *>(descriptor));
  return SharedFence::Acquire(result);
}
SharedTextureMemory Device::ImportSharedTextureMemory(
    SharedTextureMemoryDescriptor const *descriptor) const {
  auto result = wgpuDeviceImportSharedTextureMemory(
      Get(),
      reinterpret_cast<WGPUSharedTextureMemoryDescriptor const *>(descriptor));
  return SharedTextureMemory::Acquire(result);
}
void Device::InjectError(ErrorType type, char const *message) const {
  wgpuDeviceInjectError(Get(), static_cast<WGPUErrorType>(type),
                        reinterpret_cast<char const *>(message));
}
void Device::PopErrorScope(ErrorCallback oldCallback, void *userdata) const {
  wgpuDevicePopErrorScope(Get(), oldCallback, userdata);
}
Future Device::PopErrorScope(PopErrorScopeCallbackInfo callbackInfo) const {
  auto result = wgpuDevicePopErrorScopeF(
      Get(),
      *reinterpret_cast<WGPUPopErrorScopeCallbackInfo const *>(&callbackInfo));
  return Future{result.id};
}
void Device::PushErrorScope(ErrorFilter filter) const {
  wgpuDevicePushErrorScope(Get(), static_cast<WGPUErrorFilter>(filter));
}
void Device::SetDeviceLostCallback(DeviceLostCallback callback,
                                   void *userdata) const {
  wgpuDeviceSetDeviceLostCallback(Get(), callback, userdata);
}
void Device::SetLabel(char const *label) const {
  wgpuDeviceSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void Device::SetLoggingCallback(LoggingCallback callback,
                                void *userdata) const {
  wgpuDeviceSetLoggingCallback(Get(), callback, userdata);
}
void Device::SetUncapturedErrorCallback(ErrorCallback callback,
                                        void *userdata) const {
  wgpuDeviceSetUncapturedErrorCallback(Get(), callback, userdata);
}
void Device::Tick() const { wgpuDeviceTick(Get()); }
void Device::ValidateTextureDescriptor(
    TextureDescriptor const *descriptor) const {
  wgpuDeviceValidateTextureDescriptor(
      Get(), reinterpret_cast<WGPUTextureDescriptor const *>(descriptor));
}
void Device::WGPUReference(WGPUDevice handle) {
  if (handle != nullptr) {
    wgpuDeviceReference(handle);
  }
}
void Device::WGPURelease(WGPUDevice handle) {
  if (handle != nullptr) {
    wgpuDeviceRelease(handle);
  }
}

// ExternalTexture

static_assert(sizeof(ExternalTexture) == sizeof(WGPUExternalTexture),
              "sizeof mismatch for ExternalTexture");
static_assert(alignof(ExternalTexture) == alignof(WGPUExternalTexture),
              "alignof mismatch for ExternalTexture");

void ExternalTexture::Destroy() const { wgpuExternalTextureDestroy(Get()); }
void ExternalTexture::Expire() const { wgpuExternalTextureExpire(Get()); }
void ExternalTexture::Refresh() const { wgpuExternalTextureRefresh(Get()); }
void ExternalTexture::SetLabel(char const *label) const {
  wgpuExternalTextureSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void ExternalTexture::WGPUReference(WGPUExternalTexture handle) {
  if (handle != nullptr) {
    wgpuExternalTextureReference(handle);
  }
}
void ExternalTexture::WGPURelease(WGPUExternalTexture handle) {
  if (handle != nullptr) {
    wgpuExternalTextureRelease(handle);
  }
}

// Instance

static_assert(sizeof(Instance) == sizeof(WGPUInstance),
              "sizeof mismatch for Instance");
static_assert(alignof(Instance) == alignof(WGPUInstance),
              "alignof mismatch for Instance");

Surface Instance::CreateSurface(SurfaceDescriptor const *descriptor) const {
  auto result = wgpuInstanceCreateSurface(
      Get(), reinterpret_cast<WGPUSurfaceDescriptor const *>(descriptor));
  return Surface::Acquire(result);
}
size_t
Instance::EnumerateWGSLLanguageFeatures(WGSLFeatureName *features) const {
  auto result = wgpuInstanceEnumerateWGSLLanguageFeatures(
      Get(), reinterpret_cast<WGPUWGSLFeatureName *>(features));
  return result;
}
Bool Instance::HasWGSLLanguageFeature(WGSLFeatureName feature) const {
  auto result = wgpuInstanceHasWGSLLanguageFeature(
      Get(), static_cast<WGPUWGSLFeatureName>(feature));
  return result;
}
void Instance::ProcessEvents() const { wgpuInstanceProcessEvents(Get()); }
void Instance::RequestAdapter(RequestAdapterOptions const *options,
                              RequestAdapterCallback callback,
                              void *userdata) const {
  wgpuInstanceRequestAdapter(
      Get(), reinterpret_cast<WGPURequestAdapterOptions const *>(options),
      callback, userdata);
}
Future Instance::RequestAdapter(RequestAdapterOptions const *options,
                                RequestAdapterCallbackInfo callbackInfo) const {
  auto result = wgpuInstanceRequestAdapterF(
      Get(), reinterpret_cast<WGPURequestAdapterOptions const *>(options),
      *reinterpret_cast<WGPURequestAdapterCallbackInfo const *>(&callbackInfo));
  return Future{result.id};
}
WaitStatus Instance::WaitAny(size_t futureCount, FutureWaitInfo *futures,
                             uint64_t timeoutNS) const {
  auto result = wgpuInstanceWaitAny(
      Get(), futureCount, reinterpret_cast<WGPUFutureWaitInfo *>(futures),
      timeoutNS);
  return static_cast<WaitStatus>(result);
}
void Instance::WGPUReference(WGPUInstance handle) {
  if (handle != nullptr) {
    wgpuInstanceReference(handle);
  }
}
void Instance::WGPURelease(WGPUInstance handle) {
  if (handle != nullptr) {
    wgpuInstanceRelease(handle);
  }
}

// PipelineLayout

static_assert(sizeof(PipelineLayout) == sizeof(WGPUPipelineLayout),
              "sizeof mismatch for PipelineLayout");
static_assert(alignof(PipelineLayout) == alignof(WGPUPipelineLayout),
              "alignof mismatch for PipelineLayout");

void PipelineLayout::SetLabel(char const *label) const {
  wgpuPipelineLayoutSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void PipelineLayout::WGPUReference(WGPUPipelineLayout handle) {
  if (handle != nullptr) {
    wgpuPipelineLayoutReference(handle);
  }
}
void PipelineLayout::WGPURelease(WGPUPipelineLayout handle) {
  if (handle != nullptr) {
    wgpuPipelineLayoutRelease(handle);
  }
}

// QuerySet

static_assert(sizeof(QuerySet) == sizeof(WGPUQuerySet),
              "sizeof mismatch for QuerySet");
static_assert(alignof(QuerySet) == alignof(WGPUQuerySet),
              "alignof mismatch for QuerySet");

void QuerySet::Destroy() const { wgpuQuerySetDestroy(Get()); }
uint32_t QuerySet::GetCount() const {
  auto result = wgpuQuerySetGetCount(Get());
  return result;
}
QueryType QuerySet::GetType() const {
  auto result = wgpuQuerySetGetType(Get());
  return static_cast<QueryType>(result);
}
void QuerySet::SetLabel(char const *label) const {
  wgpuQuerySetSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void QuerySet::WGPUReference(WGPUQuerySet handle) {
  if (handle != nullptr) {
    wgpuQuerySetReference(handle);
  }
}
void QuerySet::WGPURelease(WGPUQuerySet handle) {
  if (handle != nullptr) {
    wgpuQuerySetRelease(handle);
  }
}

// Queue

static_assert(sizeof(Queue) == sizeof(WGPUQueue), "sizeof mismatch for Queue");
static_assert(alignof(Queue) == alignof(WGPUQueue),
              "alignof mismatch for Queue");

void Queue::CopyExternalTextureForBrowser(
    ImageCopyExternalTexture const *source, ImageCopyTexture const *destination,
    Extent3D const *copySize,
    CopyTextureForBrowserOptions const *options) const {
  wgpuQueueCopyExternalTextureForBrowser(
      Get(), reinterpret_cast<WGPUImageCopyExternalTexture const *>(source),
      reinterpret_cast<WGPUImageCopyTexture const *>(destination),
      reinterpret_cast<WGPUExtent3D const *>(copySize),
      reinterpret_cast<WGPUCopyTextureForBrowserOptions const *>(options));
}
void Queue::CopyTextureForBrowser(
    ImageCopyTexture const *source, ImageCopyTexture const *destination,
    Extent3D const *copySize,
    CopyTextureForBrowserOptions const *options) const {
  wgpuQueueCopyTextureForBrowser(
      Get(), reinterpret_cast<WGPUImageCopyTexture const *>(source),
      reinterpret_cast<WGPUImageCopyTexture const *>(destination),
      reinterpret_cast<WGPUExtent3D const *>(copySize),
      reinterpret_cast<WGPUCopyTextureForBrowserOptions const *>(options));
}
void Queue::OnSubmittedWorkDone(QueueWorkDoneCallback callback,
                                void *userdata) const {
  wgpuQueueOnSubmittedWorkDone(Get(), callback, userdata);
}
Future
Queue::OnSubmittedWorkDone(QueueWorkDoneCallbackInfo callbackInfo) const {
  auto result = wgpuQueueOnSubmittedWorkDoneF(
      Get(),
      *reinterpret_cast<WGPUQueueWorkDoneCallbackInfo const *>(&callbackInfo));
  return Future{result.id};
}
void Queue::SetLabel(char const *label) const {
  wgpuQueueSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void Queue::Submit(size_t commandCount, CommandBuffer const *commands) const {
  wgpuQueueSubmit(Get(), commandCount,
                  reinterpret_cast<WGPUCommandBuffer const *>(commands));
}
void Queue::WriteBuffer(Buffer const &buffer, uint64_t bufferOffset,
                        void const *data, size_t size) const {
  wgpuQueueWriteBuffer(Get(), buffer.Get(), bufferOffset,
                       reinterpret_cast<void const *>(data), size);
}
void Queue::WriteTexture(ImageCopyTexture const *destination, void const *data,
                         size_t dataSize, TextureDataLayout const *dataLayout,
                         Extent3D const *writeSize) const {
  wgpuQueueWriteTexture(
      Get(), reinterpret_cast<WGPUImageCopyTexture const *>(destination),
      reinterpret_cast<void const *>(data), dataSize,
      reinterpret_cast<WGPUTextureDataLayout const *>(dataLayout),
      reinterpret_cast<WGPUExtent3D const *>(writeSize));
}
void Queue::WGPUReference(WGPUQueue handle) {
  if (handle != nullptr) {
    wgpuQueueReference(handle);
  }
}
void Queue::WGPURelease(WGPUQueue handle) {
  if (handle != nullptr) {
    wgpuQueueRelease(handle);
  }
}

// RenderBundle

static_assert(sizeof(RenderBundle) == sizeof(WGPURenderBundle),
              "sizeof mismatch for RenderBundle");
static_assert(alignof(RenderBundle) == alignof(WGPURenderBundle),
              "alignof mismatch for RenderBundle");

void RenderBundle::SetLabel(char const *label) const {
  wgpuRenderBundleSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void RenderBundle::WGPUReference(WGPURenderBundle handle) {
  if (handle != nullptr) {
    wgpuRenderBundleReference(handle);
  }
}
void RenderBundle::WGPURelease(WGPURenderBundle handle) {
  if (handle != nullptr) {
    wgpuRenderBundleRelease(handle);
  }
}

// RenderBundleEncoder

static_assert(sizeof(RenderBundleEncoder) == sizeof(WGPURenderBundleEncoder),
              "sizeof mismatch for RenderBundleEncoder");
static_assert(alignof(RenderBundleEncoder) == alignof(WGPURenderBundleEncoder),
              "alignof mismatch for RenderBundleEncoder");

void RenderBundleEncoder::Draw(uint32_t vertexCount, uint32_t instanceCount,
                               uint32_t firstVertex,
                               uint32_t firstInstance) const {
  wgpuRenderBundleEncoderDraw(Get(), vertexCount, instanceCount, firstVertex,
                              firstInstance);
}
void RenderBundleEncoder::DrawIndexed(uint32_t indexCount,
                                      uint32_t instanceCount,
                                      uint32_t firstIndex, int32_t baseVertex,
                                      uint32_t firstInstance) const {
  wgpuRenderBundleEncoderDrawIndexed(Get(), indexCount, instanceCount,
                                     firstIndex, baseVertex, firstInstance);
}
void RenderBundleEncoder::DrawIndexedIndirect(Buffer const &indirectBuffer,
                                              uint64_t indirectOffset) const {
  wgpuRenderBundleEncoderDrawIndexedIndirect(Get(), indirectBuffer.Get(),
                                             indirectOffset);
}
void RenderBundleEncoder::DrawIndirect(Buffer const &indirectBuffer,
                                       uint64_t indirectOffset) const {
  wgpuRenderBundleEncoderDrawIndirect(Get(), indirectBuffer.Get(),
                                      indirectOffset);
}
RenderBundle
RenderBundleEncoder::Finish(RenderBundleDescriptor const *descriptor) const {
  auto result = wgpuRenderBundleEncoderFinish(
      Get(), reinterpret_cast<WGPURenderBundleDescriptor const *>(descriptor));
  return RenderBundle::Acquire(result);
}
void RenderBundleEncoder::InsertDebugMarker(char const *markerLabel) const {
  wgpuRenderBundleEncoderInsertDebugMarker(
      Get(), reinterpret_cast<char const *>(markerLabel));
}
void RenderBundleEncoder::PopDebugGroup() const {
  wgpuRenderBundleEncoderPopDebugGroup(Get());
}
void RenderBundleEncoder::PushDebugGroup(char const *groupLabel) const {
  wgpuRenderBundleEncoderPushDebugGroup(
      Get(), reinterpret_cast<char const *>(groupLabel));
}
void RenderBundleEncoder::SetBindGroup(uint32_t groupIndex,
                                       BindGroup const &group,
                                       size_t dynamicOffsetCount,
                                       uint32_t const *dynamicOffsets) const {
  wgpuRenderBundleEncoderSetBindGroup(
      Get(), groupIndex, group.Get(), dynamicOffsetCount,
      reinterpret_cast<uint32_t const *>(dynamicOffsets));
}
void RenderBundleEncoder::SetIndexBuffer(Buffer const &buffer,
                                         IndexFormat format, uint64_t offset,
                                         uint64_t size) const {
  wgpuRenderBundleEncoderSetIndexBuffer(
      Get(), buffer.Get(), static_cast<WGPUIndexFormat>(format), offset, size);
}
void RenderBundleEncoder::SetLabel(char const *label) const {
  wgpuRenderBundleEncoderSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void RenderBundleEncoder::SetPipeline(RenderPipeline const &pipeline) const {
  wgpuRenderBundleEncoderSetPipeline(Get(), pipeline.Get());
}
void RenderBundleEncoder::SetVertexBuffer(uint32_t slot, Buffer const &buffer,
                                          uint64_t offset,
                                          uint64_t size) const {
  wgpuRenderBundleEncoderSetVertexBuffer(Get(), slot, buffer.Get(), offset,
                                         size);
}
void RenderBundleEncoder::WGPUReference(WGPURenderBundleEncoder handle) {
  if (handle != nullptr) {
    wgpuRenderBundleEncoderReference(handle);
  }
}
void RenderBundleEncoder::WGPURelease(WGPURenderBundleEncoder handle) {
  if (handle != nullptr) {
    wgpuRenderBundleEncoderRelease(handle);
  }
}

// RenderPassEncoder

static_assert(sizeof(RenderPassEncoder) == sizeof(WGPURenderPassEncoder),
              "sizeof mismatch for RenderPassEncoder");
static_assert(alignof(RenderPassEncoder) == alignof(WGPURenderPassEncoder),
              "alignof mismatch for RenderPassEncoder");

void RenderPassEncoder::BeginOcclusionQuery(uint32_t queryIndex) const {
  wgpuRenderPassEncoderBeginOcclusionQuery(Get(), queryIndex);
}
void RenderPassEncoder::Draw(uint32_t vertexCount, uint32_t instanceCount,
                             uint32_t firstVertex,
                             uint32_t firstInstance) const {
  wgpuRenderPassEncoderDraw(Get(), vertexCount, instanceCount, firstVertex,
                            firstInstance);
}
void RenderPassEncoder::DrawIndexed(uint32_t indexCount, uint32_t instanceCount,
                                    uint32_t firstIndex, int32_t baseVertex,
                                    uint32_t firstInstance) const {
  wgpuRenderPassEncoderDrawIndexed(Get(), indexCount, instanceCount, firstIndex,
                                   baseVertex, firstInstance);
}
void RenderPassEncoder::DrawIndexedIndirect(Buffer const &indirectBuffer,
                                            uint64_t indirectOffset) const {
  wgpuRenderPassEncoderDrawIndexedIndirect(Get(), indirectBuffer.Get(),
                                           indirectOffset);
}
void RenderPassEncoder::DrawIndirect(Buffer const &indirectBuffer,
                                     uint64_t indirectOffset) const {
  wgpuRenderPassEncoderDrawIndirect(Get(), indirectBuffer.Get(),
                                    indirectOffset);
}
void RenderPassEncoder::End() const { wgpuRenderPassEncoderEnd(Get()); }
void RenderPassEncoder::EndOcclusionQuery() const {
  wgpuRenderPassEncoderEndOcclusionQuery(Get());
}
void RenderPassEncoder::ExecuteBundles(size_t bundleCount,
                                       RenderBundle const *bundles) const {
  wgpuRenderPassEncoderExecuteBundles(
      Get(), bundleCount, reinterpret_cast<WGPURenderBundle const *>(bundles));
}
void RenderPassEncoder::InsertDebugMarker(char const *markerLabel) const {
  wgpuRenderPassEncoderInsertDebugMarker(
      Get(), reinterpret_cast<char const *>(markerLabel));
}
void RenderPassEncoder::PixelLocalStorageBarrier() const {
  wgpuRenderPassEncoderPixelLocalStorageBarrier(Get());
}
void RenderPassEncoder::PopDebugGroup() const {
  wgpuRenderPassEncoderPopDebugGroup(Get());
}
void RenderPassEncoder::PushDebugGroup(char const *groupLabel) const {
  wgpuRenderPassEncoderPushDebugGroup(
      Get(), reinterpret_cast<char const *>(groupLabel));
}
void RenderPassEncoder::SetBindGroup(uint32_t groupIndex,
                                     BindGroup const &group,
                                     size_t dynamicOffsetCount,
                                     uint32_t const *dynamicOffsets) const {
  wgpuRenderPassEncoderSetBindGroup(
      Get(), groupIndex, group.Get(), dynamicOffsetCount,
      reinterpret_cast<uint32_t const *>(dynamicOffsets));
}
void RenderPassEncoder::SetBlendConstant(Color const *color) const {
  wgpuRenderPassEncoderSetBlendConstant(
      Get(), reinterpret_cast<WGPUColor const *>(color));
}
void RenderPassEncoder::SetIndexBuffer(Buffer const &buffer, IndexFormat format,
                                       uint64_t offset, uint64_t size) const {
  wgpuRenderPassEncoderSetIndexBuffer(
      Get(), buffer.Get(), static_cast<WGPUIndexFormat>(format), offset, size);
}
void RenderPassEncoder::SetLabel(char const *label) const {
  wgpuRenderPassEncoderSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void RenderPassEncoder::SetPipeline(RenderPipeline const &pipeline) const {
  wgpuRenderPassEncoderSetPipeline(Get(), pipeline.Get());
}
void RenderPassEncoder::SetScissorRect(uint32_t x, uint32_t y, uint32_t width,
                                       uint32_t height) const {
  wgpuRenderPassEncoderSetScissorRect(Get(), x, y, width, height);
}
void RenderPassEncoder::SetStencilReference(uint32_t reference) const {
  wgpuRenderPassEncoderSetStencilReference(Get(), reference);
}
void RenderPassEncoder::SetVertexBuffer(uint32_t slot, Buffer const &buffer,
                                        uint64_t offset, uint64_t size) const {
  wgpuRenderPassEncoderSetVertexBuffer(Get(), slot, buffer.Get(), offset, size);
}
void RenderPassEncoder::SetViewport(float x, float y, float width, float height,
                                    float minDepth, float maxDepth) const {
  wgpuRenderPassEncoderSetViewport(Get(), x, y, width, height, minDepth,
                                   maxDepth);
}
void RenderPassEncoder::WriteTimestamp(QuerySet const &querySet,
                                       uint32_t queryIndex) const {
  wgpuRenderPassEncoderWriteTimestamp(Get(), querySet.Get(), queryIndex);
}
void RenderPassEncoder::WGPUReference(WGPURenderPassEncoder handle) {
  if (handle != nullptr) {
    wgpuRenderPassEncoderReference(handle);
  }
}
void RenderPassEncoder::WGPURelease(WGPURenderPassEncoder handle) {
  if (handle != nullptr) {
    wgpuRenderPassEncoderRelease(handle);
  }
}

// RenderPipeline

static_assert(sizeof(RenderPipeline) == sizeof(WGPURenderPipeline),
              "sizeof mismatch for RenderPipeline");
static_assert(alignof(RenderPipeline) == alignof(WGPURenderPipeline),
              "alignof mismatch for RenderPipeline");

BindGroupLayout RenderPipeline::GetBindGroupLayout(uint32_t groupIndex) const {
  auto result = wgpuRenderPipelineGetBindGroupLayout(Get(), groupIndex);
  return BindGroupLayout::Acquire(result);
}
void RenderPipeline::SetLabel(char const *label) const {
  wgpuRenderPipelineSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void RenderPipeline::WGPUReference(WGPURenderPipeline handle) {
  if (handle != nullptr) {
    wgpuRenderPipelineReference(handle);
  }
}
void RenderPipeline::WGPURelease(WGPURenderPipeline handle) {
  if (handle != nullptr) {
    wgpuRenderPipelineRelease(handle);
  }
}

// Sampler

static_assert(sizeof(Sampler) == sizeof(WGPUSampler),
              "sizeof mismatch for Sampler");
static_assert(alignof(Sampler) == alignof(WGPUSampler),
              "alignof mismatch for Sampler");

void Sampler::SetLabel(char const *label) const {
  wgpuSamplerSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void Sampler::WGPUReference(WGPUSampler handle) {
  if (handle != nullptr) {
    wgpuSamplerReference(handle);
  }
}
void Sampler::WGPURelease(WGPUSampler handle) {
  if (handle != nullptr) {
    wgpuSamplerRelease(handle);
  }
}

// ShaderModule

static_assert(sizeof(ShaderModule) == sizeof(WGPUShaderModule),
              "sizeof mismatch for ShaderModule");
static_assert(alignof(ShaderModule) == alignof(WGPUShaderModule),
              "alignof mismatch for ShaderModule");

void ShaderModule::GetCompilationInfo(CompilationInfoCallback callback,
                                      void *userdata) const {
  wgpuShaderModuleGetCompilationInfo(Get(), callback, userdata);
}
Future ShaderModule::GetCompilationInfo(
    CompilationInfoCallbackInfo callbackInfo) const {
  auto result = wgpuShaderModuleGetCompilationInfoF(
      Get(), *reinterpret_cast<WGPUCompilationInfoCallbackInfo const *>(
                 &callbackInfo));
  return Future{result.id};
}
void ShaderModule::SetLabel(char const *label) const {
  wgpuShaderModuleSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void ShaderModule::WGPUReference(WGPUShaderModule handle) {
  if (handle != nullptr) {
    wgpuShaderModuleReference(handle);
  }
}
void ShaderModule::WGPURelease(WGPUShaderModule handle) {
  if (handle != nullptr) {
    wgpuShaderModuleRelease(handle);
  }
}

// SharedBufferMemory

static_assert(sizeof(SharedBufferMemory) == sizeof(WGPUSharedBufferMemory),
              "sizeof mismatch for SharedBufferMemory");
static_assert(alignof(SharedBufferMemory) == alignof(WGPUSharedBufferMemory),
              "alignof mismatch for SharedBufferMemory");

Bool SharedBufferMemory::BeginAccess(
    Buffer const &buffer,
    SharedBufferMemoryBeginAccessDescriptor const *descriptor) const {
  auto result = wgpuSharedBufferMemoryBeginAccess(
      Get(), buffer.Get(),
      reinterpret_cast<WGPUSharedBufferMemoryBeginAccessDescriptor const *>(
          descriptor));
  return result;
}
Buffer
SharedBufferMemory::CreateBuffer(BufferDescriptor const *descriptor) const {
  auto result = wgpuSharedBufferMemoryCreateBuffer(
      Get(), reinterpret_cast<WGPUBufferDescriptor const *>(descriptor));
  return Buffer::Acquire(result);
}
Bool SharedBufferMemory::EndAccess(
    Buffer const &buffer, SharedBufferMemoryEndAccessState *descriptor) const {
  *descriptor = SharedBufferMemoryEndAccessState();
  auto result = wgpuSharedBufferMemoryEndAccess(
      Get(), buffer.Get(),
      reinterpret_cast<WGPUSharedBufferMemoryEndAccessState *>(descriptor));
  return result;
}
void SharedBufferMemory::GetProperties(
    SharedBufferMemoryProperties *properties) const {
  wgpuSharedBufferMemoryGetProperties(
      Get(), reinterpret_cast<WGPUSharedBufferMemoryProperties *>(properties));
}
Bool SharedBufferMemory::IsDeviceLost() const {
  auto result = wgpuSharedBufferMemoryIsDeviceLost(Get());
  return result;
}
void SharedBufferMemory::SetLabel(char const *label) const {
  wgpuSharedBufferMemorySetLabel(Get(), reinterpret_cast<char const *>(label));
}
void SharedBufferMemory::WGPUReference(WGPUSharedBufferMemory handle) {
  if (handle != nullptr) {
    wgpuSharedBufferMemoryReference(handle);
  }
}
void SharedBufferMemory::WGPURelease(WGPUSharedBufferMemory handle) {
  if (handle != nullptr) {
    wgpuSharedBufferMemoryRelease(handle);
  }
}

// SharedFence

static_assert(sizeof(SharedFence) == sizeof(WGPUSharedFence),
              "sizeof mismatch for SharedFence");
static_assert(alignof(SharedFence) == alignof(WGPUSharedFence),
              "alignof mismatch for SharedFence");

void SharedFence::ExportInfo(SharedFenceExportInfo *info) const {
  wgpuSharedFenceExportInfo(
      Get(), reinterpret_cast<WGPUSharedFenceExportInfo *>(info));
}
void SharedFence::WGPUReference(WGPUSharedFence handle) {
  if (handle != nullptr) {
    wgpuSharedFenceReference(handle);
  }
}
void SharedFence::WGPURelease(WGPUSharedFence handle) {
  if (handle != nullptr) {
    wgpuSharedFenceRelease(handle);
  }
}

// SharedTextureMemory

static_assert(sizeof(SharedTextureMemory) == sizeof(WGPUSharedTextureMemory),
              "sizeof mismatch for SharedTextureMemory");
static_assert(alignof(SharedTextureMemory) == alignof(WGPUSharedTextureMemory),
              "alignof mismatch for SharedTextureMemory");

Bool SharedTextureMemory::BeginAccess(
    Texture const &texture,
    SharedTextureMemoryBeginAccessDescriptor const *descriptor) const {
  auto result = wgpuSharedTextureMemoryBeginAccess(
      Get(), texture.Get(),
      reinterpret_cast<WGPUSharedTextureMemoryBeginAccessDescriptor const *>(
          descriptor));
  return result;
}
Texture
SharedTextureMemory::CreateTexture(TextureDescriptor const *descriptor) const {
  auto result = wgpuSharedTextureMemoryCreateTexture(
      Get(), reinterpret_cast<WGPUTextureDescriptor const *>(descriptor));
  return Texture::Acquire(result);
}
Bool SharedTextureMemory::EndAccess(
    Texture const &texture,
    SharedTextureMemoryEndAccessState *descriptor) const {
  *descriptor = SharedTextureMemoryEndAccessState();
  auto result = wgpuSharedTextureMemoryEndAccess(
      Get(), texture.Get(),
      reinterpret_cast<WGPUSharedTextureMemoryEndAccessState *>(descriptor));
  return result;
}
void SharedTextureMemory::GetProperties(
    SharedTextureMemoryProperties *properties) const {
  wgpuSharedTextureMemoryGetProperties(
      Get(), reinterpret_cast<WGPUSharedTextureMemoryProperties *>(properties));
}
Bool SharedTextureMemory::IsDeviceLost() const {
  auto result = wgpuSharedTextureMemoryIsDeviceLost(Get());
  return result;
}
void SharedTextureMemory::SetLabel(char const *label) const {
  wgpuSharedTextureMemorySetLabel(Get(), reinterpret_cast<char const *>(label));
}
void SharedTextureMemory::WGPUReference(WGPUSharedTextureMemory handle) {
  if (handle != nullptr) {
    wgpuSharedTextureMemoryReference(handle);
  }
}
void SharedTextureMemory::WGPURelease(WGPUSharedTextureMemory handle) {
  if (handle != nullptr) {
    wgpuSharedTextureMemoryRelease(handle);
  }
}

// Surface

static_assert(sizeof(Surface) == sizeof(WGPUSurface),
              "sizeof mismatch for Surface");
static_assert(alignof(Surface) == alignof(WGPUSurface),
              "alignof mismatch for Surface");

TextureFormat Surface::GetPreferredFormat(Adapter const &adapter) const {
  auto result = wgpuSurfaceGetPreferredFormat(Get(), adapter.Get());
  return static_cast<TextureFormat>(result);
}
void Surface::WGPUReference(WGPUSurface handle) {
  if (handle != nullptr) {
    wgpuSurfaceReference(handle);
  }
}
void Surface::WGPURelease(WGPUSurface handle) {
  if (handle != nullptr) {
    wgpuSurfaceRelease(handle);
  }
}

// SwapChain

static_assert(sizeof(SwapChain) == sizeof(WGPUSwapChain),
              "sizeof mismatch for SwapChain");
static_assert(alignof(SwapChain) == alignof(WGPUSwapChain),
              "alignof mismatch for SwapChain");

Texture SwapChain::GetCurrentTexture() const {
  auto result = wgpuSwapChainGetCurrentTexture(Get());
  return Texture::Acquire(result);
}
TextureView SwapChain::GetCurrentTextureView() const {
  auto result = wgpuSwapChainGetCurrentTextureView(Get());
  return TextureView::Acquire(result);
}
void SwapChain::Present() const { wgpuSwapChainPresent(Get()); }
void SwapChain::WGPUReference(WGPUSwapChain handle) {
  if (handle != nullptr) {
    wgpuSwapChainReference(handle);
  }
}
void SwapChain::WGPURelease(WGPUSwapChain handle) {
  if (handle != nullptr) {
    wgpuSwapChainRelease(handle);
  }
}

// Texture

static_assert(sizeof(Texture) == sizeof(WGPUTexture),
              "sizeof mismatch for Texture");
static_assert(alignof(Texture) == alignof(WGPUTexture),
              "alignof mismatch for Texture");

TextureView
Texture::CreateErrorView(TextureViewDescriptor const *descriptor) const {
  auto result = wgpuTextureCreateErrorView(
      Get(), reinterpret_cast<WGPUTextureViewDescriptor const *>(descriptor));
  return TextureView::Acquire(result);
}
TextureView Texture::CreateView(TextureViewDescriptor const *descriptor) const {
  auto result = wgpuTextureCreateView(
      Get(), reinterpret_cast<WGPUTextureViewDescriptor const *>(descriptor));
  return TextureView::Acquire(result);
}
void Texture::Destroy() const { wgpuTextureDestroy(Get()); }
uint32_t Texture::GetDepthOrArrayLayers() const {
  auto result = wgpuTextureGetDepthOrArrayLayers(Get());
  return result;
}
TextureDimension Texture::GetDimension() const {
  auto result = wgpuTextureGetDimension(Get());
  return static_cast<TextureDimension>(result);
}
TextureFormat Texture::GetFormat() const {
  auto result = wgpuTextureGetFormat(Get());
  return static_cast<TextureFormat>(result);
}
uint32_t Texture::GetHeight() const {
  auto result = wgpuTextureGetHeight(Get());
  return result;
}
uint32_t Texture::GetMipLevelCount() const {
  auto result = wgpuTextureGetMipLevelCount(Get());
  return result;
}
uint32_t Texture::GetSampleCount() const {
  auto result = wgpuTextureGetSampleCount(Get());
  return result;
}
TextureUsage Texture::GetUsage() const {
  auto result = wgpuTextureGetUsage(Get());
  return static_cast<TextureUsage>(result);
}
uint32_t Texture::GetWidth() const {
  auto result = wgpuTextureGetWidth(Get());
  return result;
}
void Texture::SetLabel(char const *label) const {
  wgpuTextureSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void Texture::WGPUReference(WGPUTexture handle) {
  if (handle != nullptr) {
    wgpuTextureReference(handle);
  }
}
void Texture::WGPURelease(WGPUTexture handle) {
  if (handle != nullptr) {
    wgpuTextureRelease(handle);
  }
}

// TextureView

static_assert(sizeof(TextureView) == sizeof(WGPUTextureView),
              "sizeof mismatch for TextureView");
static_assert(alignof(TextureView) == alignof(WGPUTextureView),
              "alignof mismatch for TextureView");

void TextureView::SetLabel(char const *label) const {
  wgpuTextureViewSetLabel(Get(), reinterpret_cast<char const *>(label));
}
void TextureView::WGPUReference(WGPUTextureView handle) {
  if (handle != nullptr) {
    wgpuTextureViewReference(handle);
  }
}
void TextureView::WGPURelease(WGPUTextureView handle) {
  if (handle != nullptr) {
    wgpuTextureViewRelease(handle);
  }
}

// Function

Instance CreateInstance(InstanceDescriptor const *descriptor) {
  auto result = wgpuCreateInstance(
      reinterpret_cast<WGPUInstanceDescriptor const *>(descriptor));
  return Instance::Acquire(result);
}
Bool GetInstanceFeatures(InstanceFeatures *features) {
  auto result = wgpuGetInstanceFeatures(
      reinterpret_cast<WGPUInstanceFeatures *>(features));
  return result;
}
Proc GetProcAddress(Device device, char const *procName) {
  auto result = wgpuGetProcAddress(device.Get(),
                                   reinterpret_cast<char const *>(procName));
  return reinterpret_cast<Proc>(result);
}

} // namespace wgpu
