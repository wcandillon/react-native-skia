# react-native-skia.podspec

require "json"
require "fileutils"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Resolve a node package directory using Node's own module resolution
# (mirrors `require.resolve(pkg/package.json)`). Returns nil if it can't be found.
# Defined as a lambda (not a `def`) because CocoaPods evaluates the podspec inside
# the `Pod` module, where top-level methods are not reachable at the call site.
resolve_node_package = lambda do |name, base_dir|
  script = "process.stdout.write(require('path').dirname(require.resolve('#{name}/package.json')))"
  dir = Dir.chdir(base_dir) { `node -e "#{script}" 2>/dev/null`.strip }
  dir.empty? ? nil : dir
end

# Copy the prebuilt xcframeworks from the Skia npm packages into libs/<platform>.
#
# This replaces what the old npm `postinstall` script used to do. We do it here, at
# `pod install` time, so we no longer rely on a lifecycle script. CocoaPods always
# re-evaluates the podspec for path-based pods, so this runs on every install; to keep
# it cache-friendly we stamp the copied package version into libs/<platform>/.version
# and skip the copy when it already matches. On a version bump the frameworks are
# re-copied and CocoaPods picks up the change. This is best-effort: if `pod install`
# does not detect the change, a clean reinstall fixes it (acceptable until the upcoming
# Swift Package Manager migration).
install_apple_skia_libs = lambda do |base_dir, packages|
  packages.each do |platform, pkg_name|
    pkg_dir = resolve_node_package.call(pkg_name, base_dir)
    next if pkg_dir.nil?

    src = File.join(pkg_dir, 'libs')
    next unless Dir.exist?(src) && !Dir.glob(File.join(src, '*.xcframework')).empty?

    # Graphite packages carry the Dawn release tag they ship (libs/.dawn-version),
    # used below for the react-native-webgpu version check.
    dawn_version = File.join(src, '.dawn-version')
    if File.exist?(dawn_version)
      FileUtils.mkdir_p(File.join(base_dir, 'libs'))
      FileUtils.cp(dawn_version, File.join(base_dir, 'libs', '.dawn-version'))
    end

    version = JSON.parse(File.read(File.join(pkg_dir, 'package.json')))['version'].to_s
    dest = File.join(base_dir, 'libs', platform)
    marker = File.join(dest, '.version')

    # Frameworks without a .version stamp were built locally (`yarn build-skia`):
    # keep them instead of overwriting them with the npm package.
    if !File.exist?(marker) && !Dir.glob(File.join(dest, '*.xcframework')).empty?
      Pod::UI.puts "react-native-skia: using locally built #{platform} Skia frameworks"
      next
    end

    # Already up to date: leave the files untouched so CocoaPods keeps its cache.
    next if File.exist?(marker) && File.read(marker).strip == version

    Pod::UI.puts "react-native-skia: installing #{platform} Skia frameworks (#{version})"
    FileUtils.rm_rf(dest)
    FileUtils.mkdir_p(dest)
    Dir.glob(File.join(src, '*.xcframework')).each { |xcf| FileUtils.cp_r(xcf, dest) }
    File.write(marker, version)
  end
end

# The Graphite binaries ship in the react-native-skia-graphite-apple-* npm
# packages (no tvOS), together with the shared Dawn (libwebgpu_dawn.xcframework).
apple_skia_packages = {
  'ios' => 'react-native-skia-graphite-apple-ios',
  'macos' => 'react-native-skia-graphite-apple-macos'
}
install_apple_skia_libs.call(__dir__, apple_skia_packages)

preprocessor_defs = '$(inherited) SK_GRAPHITE=1 SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API=1 SK_DISABLE_LEGACY_SHAPER_FACTORY=1'

# Define framework names
framework_names = ['libskia', 'libsvg', 'libskshaper', 'libskparagraph',
                   'libskunicode_core', 'libskunicode_libgrapheme',
                   'libskottie', 'libsksg']

# Add Dawn library for Graphite builds (contains dawn::native symbols).
# libwebgpu_dawn is the same artifact react-native-webgpu vendors. When
# react-native-webgpu is installed, it provides Dawn for the whole app and
# vendoring the framework here as well would fail CocoaPods'
# duplicate-framework-name check, so Skia only vendors it when alone. The
# skia pod's dawn::native references resolve from webgpu's copy at app link.
# An app that installs react-native-webgpu but keeps it out of a platform's
# Pods (e.g. a macOS target that filters it out of autolinking) sets
# RNSKIA_VENDOR_DAWN=1 before `pod install` so Skia vendors Dawn itself there.
webgpu_pkg_dir = resolve_node_package.call('react-native-webgpu', __dir__)
has_webgpu_pkg = !webgpu_pkg_dir.nil? && ENV['RNSKIA_VENDOR_DAWN'] != '1'
if has_webgpu_pkg
  Pod::UI.puts 'react-native-skia: react-native-webgpu detected, Dawn is provided by its libwebgpu_dawn'

  # Both packages must link the exact same Dawn artifact. Compare the release
  # tag the Skia binaries were packaged with (libs/.dawn-version, copied in from
  # the binary package above) against the tag react-native-webgpu declares in
  # its package.json `dawn` field.
  dawn_marker = File.join(__dir__, 'libs', '.dawn-version')
  if File.exist?(dawn_marker)
    skia_dawn = File.read(dawn_marker).strip
    webgpu_pkg = JSON.parse(File.read(File.join(webgpu_pkg_dir, 'package.json')))
    webgpu_dawn_field = webgpu_pkg['dawn'].to_s
    if webgpu_dawn_field.empty?
      raise "react-native-skia: the installed react-native-webgpu " \
            "(#{webgpu_pkg['version']}) does not declare a `dawn` field in its " \
            "package.json, so it predates shared-Dawn support and cannot be " \
            "paired with this Graphite build (which links #{skia_dawn}). " \
            "Upgrade react-native-webgpu."
    end
    webgpu_dawn = "dawn-#{webgpu_dawn_field.tr('/', '-')}"
    unless skia_dawn == webgpu_dawn
      raise "react-native-skia: Dawn version mismatch. This Graphite build " \
            "links #{skia_dawn} but react-native-webgpu links #{webgpu_dawn}. " \
            "Align the two packages so the app contains exactly one Dawn."
    end
    Pod::UI.puts "react-native-skia: Dawn versions match (#{skia_dawn})"
  end
end
unless has_webgpu_pkg
  # CocoaPods silently skips missing vendored frameworks, which would surface
  # later as undefined dawn::native symbols at link time. Fail early instead.
  %w[ios macos].each do |platform|
    platform_dir = File.join(__dir__, 'libs', platform)
    # A missing libs/<platform> is reported by the prebuilt binaries check below.
    next if !Dir.exist?(platform_dir) || Dir.exist?(File.join(platform_dir, 'libwebgpu_dawn.xcframework'))
    raise "react-native-skia: libwebgpu_dawn.xcframework not found in libs/#{platform}. " \
          "The installed #{apple_skia_packages[platform]} package does not ship the shared " \
          "Dawn library this Graphite build links against. Upgrade it, then run `pod install` again."
  end
  framework_names += ['libwebgpu_dawn']
end

# Verify that the prebuilt binaries are available (copied in above from the npm
# packages, or built locally with `yarn build-skia`).
unless Dir.exist?(File.join(__dir__, 'libs', 'ios')) && Dir.exist?(File.join(__dir__, 'libs', 'macos'))
  expected_packages = apple_skia_packages.values.join(', ')
  Pod::UI.warn "#{'-' * 72}"
  Pod::UI.warn "react-native-skia: Skia prebuilt binaries not found in libs/!"
  Pod::UI.warn ""
  Pod::UI.warn "Make sure dependencies are installed (yarn install / npm install) so that"
  Pod::UI.warn "the #{expected_packages} packages are present, then run `pod install` again."
  Pod::UI.warn "#{'-' * 72}"
  raise "react-native-skia: Skia prebuilt binaries not found. Run `yarn install` then `pod install` to fix this."
end

# Build platform-specific framework paths (relative to pod's libs directory)
# xcframeworks are copied into libs/ by install_apple_skia_libs above.
ios_frameworks = framework_names.map { |f| "libs/ios/#{f}.xcframework" }
osx_frameworks = framework_names.map { |f| "libs/macos/#{f}.xcframework" }

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
  s.platforms    = { :ios => "15.1", :osx => "11" }
  s.source       = { :git => "https://github.com/wcandillon/react-native-skia.git", :tag => "#{s.version}" }

  s.requires_arc = true
  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => preprocessor_defs,
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'DEFINES_MODULE' => 'YES',
    "HEADER_SEARCH_PATHS" => '"$(PODS_TARGET_SRCROOT)/cpp"/** "$(PODS_TARGET_SRCROOT)/cpp" "$(PODS_TARGET_SRCROOT)/cpp/skia" "$(PODS_TARGET_SRCROOT)/cpp/dawn/include"'
  }

  s.frameworks = ['MetalKit', 'AVFoundation', 'AVKit', 'CoreMedia']

  # Platform-specific vendored frameworks (copied into libs/)
  s.ios.vendored_frameworks = ios_frameworks
  s.osx.vendored_frameworks = osx_frameworks

  # Preserve the copied libs directory
  s.preserve_paths = ["libs/**/*"]

  # All iOS cpp/h files
  s.source_files = [
    "apple/**/*.{h,c,cc,cpp,m,mm,swift}",
    "cpp/**/*.{h,cpp}"
  ]

  install_modules_dependencies(s)
  s.dependency "React"
  s.dependency "React-callinvoker"
  s.dependency "React-Core"
end
