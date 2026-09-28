project(RNSkia)
cmake_minimum_required(VERSION 3.4.1)

set (CMAKE_CXX_STANDARD 20)

# SKIA_LIBS_PATH is passed from Gradle (pointing at the prebuilt Skia binaries,
# read straight from the react-native-skia-android npm package, or libs/android for Graphite)
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
    message("│  Make sure dependencies are installed:                                       │")
    message("│    yarn install   (or npm install)                                          │")
    message("│                                                                             │")
    message("└─────────────────────────────────────────────────────────────────────────────┘")
    message("")
    message(FATAL_ERROR "Skia prebuilt binaries not found. Run `yarn install` to fix this.")
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


message("-- ABI     : " ${ANDROID_ABI})

link_directories(${SKIA_LIBS_PATH}/)

if(SK_GRAPHITE)
    add_definitions(-DSK_GRAPHITE)
    set(BACKEND_SOURCES
    #TODO: is this source needed to be added?
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNDawnWindowContext.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNDawnInterop.cpp"
    )
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

        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JSICache.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/JsiPromises.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/jsi/Promise.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/rnskia/RNSkManager.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/CSSColorParser.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/base64.cpp"
        "${PROJECT_SOURCE_DIR}/../cpp/api/third_party/SkottieUtils.cpp"

        "${PROJECT_SOURCE_DIR}/../cpp/api/JsiSkDispatcher.cpp"
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

        # Shared JSI infrastructure (cpp/jsi) via prefix-qualified includes
        ../cpp
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

if(SK_GRAPHITE)
    # Dawn is a shared library, the same artifact react-native-webgpu links, so
    # an app that installs both packages loads exactly one Dawn copy.
    add_library(webgpu_dawn SHARED IMPORTED)
    set_property(TARGET webgpu_dawn PROPERTY IMPORTED_LOCATION "${SKIA_LIBS_PATH}/libwebgpu_dawn.so")
endif()

find_library(
        LOG_LIB
        log
)
message("-- LOG     : " ${LOG_LIB})

# React Native distributes prebuilt binaries via prefab.
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

# Set RN_SERIALIZABLE_STATE and C++ flags for React Native 0.81+
if(${REACT_NATIVE_VERSION} GREATER_EQUAL 80)
    include("${REACT_NATIVE_DIR}/ReactCommon/cmake-utils/react-native-flags.cmake")
    target_compile_reactnative_options(${PACKAGE_NAME} PRIVATE)
else()
  string(APPEND CMAKE_CXX_FLAGS
         "  -fexceptions -frtti -std=c++${CMAKE_CXX_STANDARD} -Wall -Werror -Wunused-function -Wunused-private-field -Woverloaded-virtual -Wreorder-ctor -Wdelete-non-abstract-non-virtual-dtor -Wmismatched-tags -Wunused-variable -Wpessimizing-move -Wswitch -Wdeprecated-declarations -Werror=deprecated-this-capture")
endif()

# Link
set(COMMON_LIBS
    ${LOG_LIB}
    ReactAndroid::reactnative
    fbjni::fbjni
    ReactAndroid::jsi
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

if(SK_GRAPHITE)
    target_link_libraries(${PACKAGE_NAME}
        ${COMMON_LIBS}
        webgpu_dawn
    )
else()
    target_link_libraries(${PACKAGE_NAME}
        ${COMMON_LIBS}
    )
endif()

# Enable Android 16kb native library alignment
if(CMAKE_ANDROID_NDK_VERSION VERSION_LESS "27")
    target_link_options(${PACKAGE_NAME} PRIVATE "-Wl,-z,max-page-size=16384")
endif()
