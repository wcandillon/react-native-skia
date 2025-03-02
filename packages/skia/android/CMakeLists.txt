project(RNSkia)
cmake_minimum_required(VERSION 3.4.1)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 17)
set(SK_GRAPHITE OFF)
set (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DSK_BUILD_FOR_ANDROID -DSK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API -DFOLLY_NO_CONFIG=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_MEMRCHR=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_MOBILE=1 -DON_ANDROID -DONANDROID")
set (PACKAGE_NAME "rnskia")
set (SKIA_LIB "skia")
set (SKIA_SVG_LIB "svg")
set (SKIA_SKSHAPER_LIB "skshaper")
set (SKIA_SKPARAGRAPH_LIB "skparagraph")
set (SKIA_SKUNICODE_CORE_LIB "skunicode_core")
set (SKIA_SKUNICODE_ICU_LIB "skunicode_icu")

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

# Import prebuilt SKIA libraries
set (SKIA_LIBS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../libs/android/${ANDROID_ABI}")

if(SK_GRAPHITE)
    add_definitions(-DSK_GRAPHITE)
    set(DAWN_NATIVE_LIB "libdawn_native_static")
    set(DAWN_PLATFORM_LIB "libdawn_platform_static")
    set(DAWN_PROC_LIB "libdawn_proc_static")
    set(BACKEND_SOURCES
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/DawnWindowContext.cpp"
    )
    add_library(libdawn_native_static STATIC IMPORTED)
    set_property(TARGET libdawn_native_static PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libdawn_native_static.a")

    add_library(libdawn_platform_static STATIC IMPORTED)
    set_property(TARGET libdawn_platform_static PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libdawn_platform_static.a")

    add_library(libdawn_proc_static STATIC IMPORTED)
    set_property(TARGET libdawn_proc_static PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libdawn_proc_static.a")
else()
    add_definitions(-DSK_GL -DSK_GANESH)
    set(BACKEND_SOURCES
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/OpenGLWindowContext.cpp"
        "${PROJECT_SOURCE_DIR}/cpp/rnskia-android/GrAHardwareBufferUtils.cpp"
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
        ${BACKEND_SOURCES}
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
        ../cpp/utils

        ${libfbjni_include_DIRS}
)

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

find_library(
        LOG_LIB
        log
)
message("-- LOG     : " ${LOG_LIB})

# Find the required packages for RN 0.78+
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

# Set JSI library for RN 0.78+
set (JSI_LIB ReactAndroid::jsi)
message("-- JSI     : " ${JSI_LIB})

# Set React library for RN 0.78+
set (REACT_LIB ReactAndroid::reactnative)
message("-- REACT   : " ${REACT_LIB})

# Set FBJNI library for RN 0.78+
set (FBJNI_LIBRARY fbjni::fbjni)
message("-- FBJNI   : " ${FBJNI_LIBRARY})

# Define React Native version
add_definitions(-DREACT_NATIVE_VERSION=78)

# Link libraries for RN 0.78+
set(COMMON_LIBS
    ${LOG_LIB}
    ${REACT_LIB}  # This is ReactAndroid::reactnative which includes all needed components
    ${FBJNI_LIBRARY}
    ${JSI_LIB}
    ${SKIA_SVG_LIB}
    ${SKIA_SKSHAPER_LIB}
    ${SKIA_SKPARAGRAPH_LIB}
    ${SKIA_SKUNICODE_CORE_LIB}
    ${SKIA_SKUNICODE_ICU_LIB}
    ${SKIA_LIB}
    -ljnigraphics
    -lGLESv2
    -lEGL
    -landroid
)

if(SK_GRAPHITE)
    target_link_libraries(${PACKAGE_NAME}
        ${COMMON_LIBS}
        ${DAWN_NATIVE_LIB}
        ${DAWN_PLATFORM_LIB}
        ${DAWN_PROC_LIB}
    )
else()
    target_link_libraries(${PACKAGE_NAME}
        ${COMMON_LIBS}
        -lGLESv2
        -lEGL
    )
endif()