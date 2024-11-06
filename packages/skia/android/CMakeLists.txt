project(RNSkia)
cmake_minimum_required(VERSION 3.4.1)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 17)
# TODO: remove SK_GANESH=1 SK_METAL=1
set (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DSK_GL -DSK_GANESH -DSK_GRAPHITE -DSK_BUILD_FOR_ANDROID -DFOLLY_NO_CONFIG=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_MEMRCHR=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_MOBILE=1 -DON_ANDROID -DONANDROID")

set (PACKAGE_NAME "rnskia")
set (SKIA_LIB "skia")
set (SKIA_SVG_LIB "svg")
set (SKIA_SKSHAPER_LIB "skshaper")
set (SKIA_SKPARAGRAPH_LIB "skparagraph")
set (SKIA_SKUNICODE_CORE_LIB "skunicode_core")
set (SKIA_SKUNICODE_ICU_LIB "skunicode_icu")
set (DAWN_NATIVE_LIB "libdawn_native_static")
set (DAWN_PLATFORM_LIB "libdawn_platform_static")
set (DAWN_PROC_LIB "libdawn_proc_static")

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

link_directories(../libs/android/${ANDROID_ABI}/)

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
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/RNSkOpenGLCanvasProvider.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/RNSkAndroidVideo.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JsiHostObject.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JsiValue.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/RuntimeLifecycleMonitor.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/RuntimeAwareCache.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JsiPromises.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNSkManager.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNSkDomView.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNSkDispatchQueue.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/dom/base/DrawingContext.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/dom/base/ConcatablePaint.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/CSSColorParser.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/base64.cpp"

)

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
        ../cpp/rnskia/dom
        ../cpp/rnskia/dom/base
        ../cpp/rnskia/dom/nodes
        ../cpp/rnskia/dom/props
        ../cpp/utils

        ${libfbjni_include_DIRS}
)

# Import prebuilt SKIA libraries
set (SKIA_LIBS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../libs/android/${ANDROID_ABI}")

add_library(skia STATIC IMPORTED)
set_property(TARGET skia PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskia.a")

add_library(svg STATIC IMPORTED)
set_property(TARGET svg PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libsvg.a")

add_library(skshaper STATIC IMPORTED)
set_property(TARGET skshaper PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskshaper.a")

add_library(skparagraph STATIC IMPORTED)
set_property(TARGET skparagraph PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskparagraph.a")

add_library(skunicode_core STATIC IMPORTED)
set_property(TARGET skunicode_core PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskunicode_core.a")

add_library(skunicode_icu STATIC IMPORTED)
set_property(TARGET skunicode_icu PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libskunicode_icu.a")

add_library(libdawn_native_static STATIC IMPORTED)
set_property(TARGET libdawn_native_static PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libdawn_native_static.a")

add_library(libdawn_platform_static STATIC IMPORTED)
set_property(TARGET libdawn_platform_static PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libdawn_platform_static.a")

add_library(libdawn_proc_static STATIC IMPORTED)
set_property(TARGET libdawn_proc_static PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libdawn_proc_static.a")

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

# Link
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
    target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        ${REACT_LIB}
        ${FBJNI_LIBRARY}
        ${JSI_LIB}
        ${SKIA_SVG_LIB}
        ${SKIA_SKSHAPER_LIB}
        ${SKIA_SKPARAGRAPH_LIB}
        ${SKIA_SKUNICODE_CORE_LIB}
        ${SKIA_SKUNICODE_ICU_LIB}
        ${SKIA_LIB}
        ${DAWN_NATIVE_LIB}
        ${DAWN_PLATFORM_LIB}
        ${DAWN_PROC_LIB}
        -ljnigraphics
        -landroid
    )
else()
    target_link_libraries(
        ${PACKAGE_NAME}
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
        ${SKIA_LIB}
        ${DAWN_NATIVE_LIB}
        ${DAWN_PLATFORM_LIB}
        ${DAWN_PROC_LIB}
        -ljnigraphics
        -landroid
    )
endif()