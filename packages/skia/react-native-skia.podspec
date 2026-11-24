# react-native-skia.podspec

require "json"
require "open3"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Resolve Dawn ownership once, sharing the version checks with the SwiftPM path.
# This command reads package metadata only; pod install never downloads binaries.
stdout, stderr, status = Open3.capture3(
  '/bin/bash', File.join(__dir__, 'scripts', 'prepare-apple-binaries.sh'),
  '--config', '--project-root', Pod::Config.instance.installation_root.to_s
)
raise "react-native-skia: #{stderr.strip}" unless status.success?
binary_config = JSON.parse(stdout)

preprocessor_defs = '$(inherited) SK_GRAPHITE=1 SK_RELEASE=1 SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API=1 SK_DISABLE_LEGACY_SHAPER_FACTORY=1'
binary_search_path = '$(inherited) "$(PODS_CONFIGURATION_BUILD_DIR)/ReactNativeSkiaBinaries"'

Pod::Spec.new do |s|
  s.name         = "react-native-skia"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  react-native-skia
                   DESC
  s.homepage     = "https://github.com/wcandillon/react-native-skia"
  s.license      = "MIT"
  s.license    = { :type => "MIT", :file => "LICENSE.md" }
  s.authors      = {
    "Christian Falch" => "christian.falch@gmail.com",
    "William Candillon" => "wcandillon@gmail.com"
  }
  s.platforms    = { :ios => "15.1", :tvos => "15.1", :osx => "14.0" }
  s.source       = { :git => "https://github.com/wcandillon/react-native-skia.git", :tag => "#{s.version}" }

  s.requires_arc = true
  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => preprocessor_defs,
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'DEFINES_MODULE' => 'YES',
    # Preparation reads local overrides and writes a shared download cache.
    'ENABLE_USER_SCRIPT_SANDBOXING' => 'NO',
    'LIBRARY_SEARCH_PATHS' => binary_search_path,
    "HEADER_SEARCH_PATHS" => '"$(PODS_TARGET_SRCROOT)/cpp"/** "$(PODS_TARGET_SRCROOT)/cpp" "$(PODS_TARGET_SRCROOT)/cpp/skia" "$(PODS_TARGET_SRCROOT)/cpp/dawn/include"'
  }

  # Nothing references rnskia_getWGPUInstance, so the linker never loads its
  # object file from the static library. Without it, react-native-webgpu's
  # dlsym lookup fails and it creates a second Dawn instance.
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '$(inherited) -Wl,-u,_rnskia_getWGPUInstance',
    'LIBRARY_SEARCH_PATHS' => binary_search_path
  }

  s.frameworks = ['MetalKit', 'AVFoundation', 'AVKit', 'CoreMedia']

  # Headers ship in npm; the phase prepares only the current SDK's static libraries.
  # Link directly from build products so no placeholder XCFramework is needed at install.
  s.libraries = ['c++'] + binary_config['linkNames']
  s.script_phase = {
    :name => 'Prepare React Native Skia binaries',
    :shell_path => '/bin/bash',
    :execution_position => :before_compile,
    :always_out_of_date => '1',
    :script => <<-SCRIPT
      /bin/bash "${PODS_TARGET_SRCROOT}/scripts/prepare-apple-binaries.sh" \
        --project-root "${PODS_ROOT}/.." \
        --output "${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeSkiaBinaries" \
        --assembly-root "${OBJROOT}/ReactNativeSkiaBinaries" \
        --dawn #{binary_config['dawn']}
    SCRIPT
  }
  s.preserve_paths = ['scripts/*.{js,sh}', 'libs/apple/**/*', 'libs/dawn/apple/**/*']

  # All iOS cpp/h files
  s.source_files = [
    "apple/**/*.{h,c,cc,cpp,m,mm,swift}",
    "cpp/**/*.{h,cpp}"
  ]

  # Keep nested header paths to prevent collisions between headers with the same name.
  s.header_mappings_dir = "."

  install_modules_dependencies(s)
  s.dependency "React"
  s.dependency "React-callinvoker"
  s.dependency "React-Core"
end
