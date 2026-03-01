project(RNSkia)
cmake_minimum_required(VERSION 3.4.1)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 20)

# SKIA_LIBS_PATH is passed from Gradle (resolved via Node.js package resolution)
# Append the ABI to get the full path
set (SKIA_LIBS_PATH "${SKIA_LIBS_PATH}/${ANDROID_ABI}")

# Check if Skia prebuilt binaries are installed
if(NOT EXISTS "${SKIA_LIBS_PATH}/libskia.a")
    message("")
    message("┌─────────────────────────────────────────────────────────────────────────────┐")
    message("│                                                                             │")
    message("│  ERROR: Skia prebuilt binaries not found!                                   │")
    message("│                                                                             │")
    message("│  Could not find libskia.a at: ${SKIA_LIBS_PATH}                             │")
    message("│                                                                             │")
    message("│  Make sure react-native-skia-android is installed:                          │")
    message("│    yarn add react-native-skia-android                                       │")
    message("│                                                                             │")
    message("│  See: https://shopify.github.io/react-native-skia/docs/getting-started/installation │")
    message("│                                                                             │")
    message("└─────────────────────────────────────────────────────────────────────────────┘")
    message("")
    message(FATAL_ERROR "Skia prebuilt binaries not found at ${SKIA_LIBS_PATH}")
endif()

# Import libskia
add_library(skia STATIC IMPORTED)
set_property(TARGET skia PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskia.a")

# SK_GRAPHITE is passed from Gradle
message("-- SKIA_LIBS_PATH: ${SKIA_LIBS_PATH}")
message("-- SK_GRAPHITE: ${SK_GRAPHITE}")

string(APPEND CMAKE_CXX_FLAGS " -DSK_BUILD_FOR_ANDROID -DSK_DISABLE_LEGACY_SHAPER_FACTORY -DSK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API -DFOLLY_NO_CONFIG=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_MEMRCHR=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_MOBILE=1 -DON_ANDROID -DONANDROID")

set (PACKAGE_NAME "rnskia")
set (SKIA_LIB "skia")
set (SKIA_SVG_LIB "svg")
set (SKIA_SKSHAPER_LIB "skshaper")
set (SKIA_SKPARAGRAPH_LIB "skparagraph")
set (SKIA_SKUNICODE_CORE_LIB "skunicode_core")
set (SKIA_SKUNICODE_ICU_LIB "skunicode_icu")
set (SKIA_SKOTTIE_LIB "skottie")
set (SKIA_SKSG_LIB "sksg")
set (SKIA_JSONREADER_LIB "jsonreader")


# Clear some variables
unset(LIBRN_DIR CACHE)
unset(libfbjni_link_DIRS CACHE)
unset(libfbjni_include_DIRS CACHE)

set(build_DIR ${CMAKE_SOURCE_DIR}/build)
file(GLOB LIBRN_DIR "${PREBUILT_DIR}/${ANDROID_ABI}")
file(GLOB libfbjni_link_DIRS "${build_DIR}/fbjni*.aar/jni/${ANDROID_ABI}")
file(GLOB libfbjni_include_DIRS "${build_DIR}/fbjni-*-headers.jar/")

message("-- ABI     : " ${ANDROID_ABI})
message("-- PREBUILT: " ${PREBUILT_DIR})
message("-- BUILD   : " ${build_DIR})
message("-- LIBRN   : " ${LIBRN_DIR})

link_directories(${SKIA_LIBS_PATH}/)

if(SK_GRAPHITE)
    add_definitions(-DSK_GRAPHITE)
    set(BACKEND_SOURCES
    #TODO: is this source needed to be added?
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNDawnWindowContext.cpp"
    )
else()
    add_definitions(-DSK_GL -DSK_GANESH)
    set(BACKEND_SOURCES
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/OpenGLWindowContext.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/GrAHardwareBufferUtils.cpp"
    )
endif()

if(${REACT_NATIVE_VERSION} LESS 66)
        file(
                TO_CMAKE_PATH
                "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi/jsi/jsi.cpp"
                INCLUDE_JSI_CPP
        )
endif()

add_library(
        ${PACKAGE_NAME}
        SHARED
        "${PROJECT_SOURCE_DIR}/cpp/jni/JniLoad.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/jni/JniSkiaManager.cpp"

        "${PROJECT_SOURCE_DIR}/cpp/jni/JniPlatformContext.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/gl/Error.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/RNSkOpenGLCanvasProvider.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/AHardwareBufferUtils.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/RNSkAndroidVideo.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JsiHostObject.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/RuntimeLifecycleMonitor.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/RuntimeAwareCache.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JsiPromises.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNSkManager.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/CSSColorParser.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/base64.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/SkottieUtils.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/api/JsiSkDispatcher.cpp"
        ${BACKEND_SOURCES}
)

if(SK_GRAPHITE)
    # WebGPU JSI infrastructure (jsi2)
    target_sources(${PACKAGE_NAME} PRIVATE
        "${PROJECT_SOURCE_DIR}/../cpp/jsi2/Promise.cpp"

        # WebGPU async system
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/async/AsyncRunner.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/async/AsyncTaskHandle.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/async/JSIMicrotaskDispatcher.cpp"

        # WebGPU API
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPU.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUAdapter.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUBindGroup.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUBuffer.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUCommandEncoder.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUComputePassEncoder.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUComputePipeline.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUDevice.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUDeviceLostInfo.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUQuerySet.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUQueue.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPURenderBundleEncoder.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPURenderPassEncoder.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPURenderPipeline.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUShaderModule.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUSupportedLimits.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnwgpu/api/GPUTexture.cpp"
    )
endif()


target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE

        "${NODE_MODULES_DIR}/react-native/ReactCommon/callinvoker"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi"
        "${NODE_MODULES_DIR}/react-native/ReactCommon"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/react/nativemodule/core"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/runtimeexecutor"
        "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/jni"
        "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni"

        cpp/jni/include
        cpp/rnskia-android

        # Skia headers have to be included with "fully"-qualified paths,
        # so "include/core/SkRef.h" instead of "SkRef.h", as otherwise
        # the prefab cannot be shipped.
        ../cpp/skia
        ../cpp/dawn/include

        ../cpp/api
        ../cpp/jsi
        ../cpp/rnskia
        ../cpp/rnskia/values
        ../cpp/utils

        # WebGPU bindings
        ../cpp
        ../cpp/jsi2
        ../cpp/rnwgpu
        ../cpp/rnwgpu/api
        ../cpp/rnwgpu/api/descriptors
        ../cpp/rnwgpu/async

        ${libfbjni_include_DIRS}
)

add_library(svg STATIC IMPORTED)
set_property(TARGET svg PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libsvg.a")

add_library(skshaper STATIC IMPORTED)
set_property(TARGET skshaper PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskshaper.a")

add_library(skottie STATIC IMPORTED)
set_property(TARGET skottie PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskottie.a")

add_library(sksg STATIC IMPORTED)
set_property(TARGET sksg PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libsksg.a")

add_library(skparagraph STATIC IMPORTED)
set_property(TARGET skparagraph PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskparagraph.a")

add_library(skunicode_core STATIC IMPORTED)
set_property(TARGET skunicode_core PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskunicode_core.a")

add_library(skunicode_icu STATIC IMPORTED)
set_property(TARGET skunicode_icu PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskunicode_icu.a")

add_library(pathops STATIC IMPORTED)
set_property(TARGET pathops PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libpathops.a")

add_library(jsonreader STATIC IMPORTED)
set_property(TARGET jsonreader PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libjsonreader.a")

find_library(
        LOG_LIB
        log
)
message("-- LOG     : " ${LOG_LIB})

if(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # We need to find packages since from RN 0.71 binaries are prebuilt
    find_package(fbjni REQUIRED CONFIG)
    find_package(ReactAndroid REQUIRED CONFIG)
endif()

unset(JSI_LIB CACHE)
if(${REACT_NATIVE_VERSION} LESS 66)
    # JSI lib didn't exist on RN 0.65 and before. Simply omit it.
    set (JSI_LIB "")
elseif(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # RN 0.71 distributes prebuilt binaries.
    set (JSI_LIB ReactAndroid::jsi)
else()
    # RN 0.66 distributes libjsi.so, can be used instead of compiling jsi.cpp manually.
    find_library(
        JSI_LIB
        jsi
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
    )
endif()
message("-- JSI     : " ${JSI_LIB})

unset(REACT_LIB CACHE)
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
    # RN 0.76 packs react_nativemodule_core into ReactAndroid::reactnative
    set (REACT_LIB ReactAndroid::reactnative)
elseif(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # RN 0.71 distributes prebuilt binaries.
    set (REACT_LIB ReactAndroid::react_nativemodule_core)
    else()
    find_library(
            REACT_LIB
            react_nativemodule_core
            PATHS ${LIBRN_DIR}
            NO_CMAKE_FIND_ROOT_PATH
    )
endif()
message("-- REACT   : " ${REACT_LIB})

unset(FBJNI_LIBRARY CACHE)
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # RN 0.71 distributes prebuilt binaries.
    set (FBJNI_LIBRARY fbjni::fbjni)
else()
    find_library(
            FBJNI_LIBRARY
            fbjni
            PATHS ${libfbjni_link_DIRS}
            NO_CMAKE_FIND_ROOT_PATH
    )
endif()
message("-- FBJNI   : " ${FBJNI_LIBRARY})

unset(REACTNATIVEJNI_LIB CACHE)
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
    # RN 0.76 doesn't have reactnativejni
    # DO NOTHING, we'll not link these libraries
elseif(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # RN 0.71 distributes prebuilt binaries.
    set (REACTNATIVEJNI_LIB "ReactAndroid::reactnativejni")
else()
    find_library(
            REACTNATIVEJNI_LIB
            reactnativejni
            PATHS ${LIBRN_DIR}
            NO_CMAKE_FIND_ROOT_PATH
    )
endif()
message("-- REACTNATIVEJNI   : " ${REACTNATIVEJNI_LIB})

unset(RUNTIMEEXECUTOR_LIB CACHE)
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
    # RN 0.76 doesn't have runtimeexecutor
    # DO NOTHING, we'll not link these libraries
elseif(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # RN 0.71 distributes prebuilt binaries.
    set (RUNTIMEEXECUTOR_LIB "ReactAndroid::runtimeexecutor")
else()
    find_library(
            RUNTIMEEXECUTOR_LIB
            runtimeexecutor
            PATHS ${LIBRN_DIR}
            NO_CMAKE_FIND_ROOT_PATH
    )
endif()
message("-- RUNTIMEEXECUTOR   : " ${RUNTIMEEXECUTOR_LIB})

unset(TURBOMODULES_LIB CACHE)
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
    # RN 0.76 doesn't have turbomodulejsijni
    # DO NOTHING, we'll not link these libraries
elseif(${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
    # RN 0.71 distributes prebuilt binaries.
    set (TURBOMODULES_LIB "ReactAndroid::turbomodulejsijni")
else()
    find_library(
            TURBOMODULES_LIB
            turbomodulejsijni
            PATHS ${LIBRN_DIR}
            NO_CMAKE_FIND_ROOT_PATH
    )
endif()
message("-- TURBO   : " ${TURBOMODULES_LIB})

add_definitions(-DREACT_NATIVE_VERSION=${REACT_NATIVE_VERSION})

# Set RN_SERIALIZABLE_STATE and C++ flags for React Native 0.81+
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 80)
    include("${REACT_NATIVE_DIR}/ReactCommon/cmake-utils/react-native-flags.cmake")
    target_compile_reactnative_options(${PACKAGE_NAME} PRIVATE)
else()
  string(APPEND CMAKE_CXX_FLAGS
         "  -fexceptions -frtti -std=c++${CMAKE_CXX_STANDARD} -Wall -Werror -Wunused-function -Wunused-private-field -Woverloaded-virtual -Wreorder-ctor -Wdelete-non-abstract-non-virtual-dtor -Wmismatched-tags -Wunused-variable -Wpessimizing-move -Wswitch -Wdeprecated-declarations -Werror=deprecated-this-capture")
endif()

# Link
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
    set(COMMON_LIBS
        ${LOG_LIB}
        ${REACT_LIB}
        ${FBJNI_LIBRARY}
        ${JSI_LIB}
        ${SKIA_SVG_LIB}
        ${SKIA_SKSHAPER_LIB}
        ${SKIA_SKPARAGRAPH_LIB}
        ${SKIA_SKUNICODE_CORE_LIB}
        ${SKIA_SKUNICODE_ICU_LIB}
        ${SKIA_SKOTTIE_LIB}
        ${SKIA_SKSG_LIB}
        ${SKIA_JSONREADER_LIB}
        ${SKIA_LIB}
        -ljnigraphics
        -lGLESv2
        -lEGL
        -landroid
    )
else()
    set(COMMON_LIBS
        ${LOG_LIB}
        ${FBJNI_LIBRARY}
        ${REACT_LIB}
        ${JSI_LIB}
        ${REACTNATIVEJNI_LIB}
        ${RUNTIMEEXECUTOR_LIB}
        ${TURBOMODULES_LIB}
        ${SKIA_SVG_LIB}
        ${SKIA_SKSHAPER_LIB}
        ${SKIA_SKPARAGRAPH_LIB}
        ${SKIA_SKUNICODE_CORE_LIB}
        ${SKIA_SKUNICODE_ICU_LIB}
        ${SKIA_SKOTTIE_LIB}
        ${SKIA_SKSG_LIB}
        ${SKIA_JSONREADER_LIB}
        ${SKIA_LIB}
        -ljnigraphics
        -lGLESv2
        -lEGL
        -landroid
    )
endif()

if(SK_GRAPHITE)
    target_link_libraries(${PACKAGE_NAME}
        ${COMMON_LIBS}
    )
else()
    target_link_libraries(${PACKAGE_NAME}
        ${COMMON_LIBS}
        -lGLESv2
        -lEGL
    )
endif()

# Enable Android 16kb native library alignment
if(CMAKE_ANDROID_NDK_VERSION VERSION_LESS "27")
    target_link_options(${PACKAGE_NAME} PRIVATE "-Wl,-z,max-page-size=16384")
endif()
