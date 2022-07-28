# @shopify/react-native-skia.podspec

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED']

Pod::Spec.new do |s|
  s.name         = "react-native-skia"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  @shopify/react-native-skia
                   DESC
  s.homepage     = "https://github.com/shopify/react-native-skia"
  # brief license entry:
  s.license      = "MIT"
  # optional - use expanded license entry instead:
  # s.license    = { :type => "MIT", :file => "LICENSE" }
  s.authors      = { "Your Name" => "yourname@email.com" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/shopify/react-native-skia/react-native-skia.git", :tag => "#{s.version}" }

  s.requires_arc = true
  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) SK_GL=1 SK_METAL=1',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17'
  }

  s.frameworks = 'GLKit', 'MetalKit'

  s.ios.vendored_frameworks = [
    'libs/ios/libskia.xcframework', 
    'libs/ios/libsvg.xcframework', 
    'libs/ios/libskshaper.xcframework'
  ]

  if fabric_enabled

    # folly_version must match the version used in React Native
    # See folly_version in react-native/React/FBReactNativeSpec/FBReactNativeSpec.podspec
    folly_version = '2021.06.28.00-v2'
    folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

    # All common iOS cpp/h files
    s.source_files = [
      "ios/*.{h,c,cc,cpp,m,mm,swift}",
      "ios/RNSkia-iOS/*.{h,c,cc,cpp,m,mm,swift}",
      "ios/RNSkia-iOS-Fabric/*.{h,c,cc,cpp,m,mm,swift}",
    ]

    s.dependency "React"
    s.dependency "React-RCTFabric"
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly", folly_version
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"

    s.compiler_flags  = folly_compiler_flags
    s.pod_target_xcconfig = {
      'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/boost" "$(PODS_ROOT)/boost-for-react-native"  "$(PODS_ROOT)/RCT-Folly"',      
    }
  else
    # All common iOS cpp/h files
    s.source_files = [
      "ios/*.{h,c,cc,cpp,m,mm,swift}",
      "ios/RNSkia-iOS/*.{h,c,cc,cpp,m,mm,swift}",
    ]

    s.dependency "React"
    s.dependency "React-callinvoker"
    s.dependency "React-Core"
  end
end

