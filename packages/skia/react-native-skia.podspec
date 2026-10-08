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
# packages.
apple_skia_packages = {
  'ios' => 'react-native-skia-graphite-apple-ios',
  'tvos' => 'react-native-skia-graphite-apple-tvos',
  'macos' => 'react-native-skia-graphite-apple-macos'
}
install_apple_skia_libs.call(__dir__, apple_skia_packages)

preprocessor_defs = '$(inherited) SK_GRAPHITE=1 SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API=1 SK_DISABLE_LEGACY_SHAPER_FACTORY=1'

# Define framework names
framework_names = ['libskia', 'libsvg', 'libskshaper', 'libskparagraph',
                   'libskunicode_core', 'libskunicode_libgrapheme',
                   'libskottie', 'libsksg']

# Dawn, the WebGPU implementation Graphite renders with, ships in the
# react-native-webgpu-dawn npm package: the one react-native-webgpu depends on
# too, built from the Dawn commit this Skia release pins. A Dawn built locally
# with `yarn build-dawn` (libs/dawn/apple/libwebgpu_dawn.xcframework, no
# .version stamp) takes precedence over the package.
dawn_pkg_dir = resolve_node_package.call('react-native-webgpu-dawn', __dir__)
if dawn_pkg_dir.nil?
  raise "react-native-skia: the react-native-webgpu-dawn package was not found. " \
        "It ships the Dawn library this Graphite build links against; make sure " \
        "dependencies are installed (yarn install / npm install), then run `pod install` again."
end
dawn_pkg = JSON.parse(File.read(File.join(dawn_pkg_dir, 'package.json')))
dawn_version = dawn_pkg['version'].to_s
dawn_commit = dawn_pkg.dig('dawn', 'commit').to_s
dawn_libs = File.join(__dir__, 'libs', 'dawn', 'apple')
dawn_framework = File.join(dawn_libs, 'libwebgpu_dawn.xcframework')
dawn_marker = File.join(dawn_libs, '.version')
if !File.exist?(dawn_marker) && Dir.exist?(dawn_framework)
  Pod::UI.puts 'react-native-skia: using locally built Dawn (libs/dawn)'
elsif !File.exist?(dawn_marker) || File.read(dawn_marker).strip != dawn_version
  Pod::UI.puts "react-native-skia: installing Dawn (react-native-webgpu-dawn #{dawn_version})"
  FileUtils.rm_rf(dawn_libs)
  FileUtils.mkdir_p(dawn_libs)
  FileUtils.cp_r(File.join(dawn_pkg_dir, 'libs', 'apple', 'libwebgpu_dawn.xcframework'), dawn_libs)
  File.write(dawn_marker, dawn_version)
end

# When react-native-webgpu is installed, it provides Dawn for the whole app
# and vendoring the framework here as well would fail CocoaPods'
# duplicate-framework-name check, so Skia only vendors it when alone. The
# skia pod's dawn::native references resolve from webgpu's copy at app link.
# An app that installs react-native-webgpu but keeps it out of a platform's
# Pods (e.g. a macOS target that filters it out of autolinking) sets
# RNSKIA_VENDOR_DAWN=1 before `pod install` so Skia vendors Dawn itself there.
webgpu_pkg_dir = resolve_node_package.call('react-native-webgpu', __dir__)
has_webgpu_pkg = !webgpu_pkg_dir.nil? && ENV['RNSKIA_VENDOR_DAWN'] != '1'
if has_webgpu_pkg
  Pod::UI.puts 'react-native-skia: react-native-webgpu detected, Dawn is provided by its libwebgpu_dawn'

  # Both packages must link the exact same Dawn. react-native-webgpu depends on
  # react-native-webgpu-dawn too: the version it resolves must be the one this
  # package resolves. Older releases vendor their own Dawn and record the Dawn
  # commit it was built from (`dawnCommit`), which must then be the commit this
  # Graphite build's Dawn package was built from.
  webgpu_pkg = JSON.parse(File.read(File.join(webgpu_pkg_dir, 'package.json')))
  if webgpu_pkg.dig('dependencies', 'react-native-webgpu-dawn')
    webgpu_dawn_dir = resolve_node_package.call('react-native-webgpu-dawn', webgpu_pkg_dir)
    webgpu_dawn_version = webgpu_dawn_dir.nil? ? nil : JSON.parse(File.read(File.join(webgpu_dawn_dir, 'package.json')))['version'].to_s
    unless webgpu_dawn_version == dawn_version
      raise "react-native-skia: Dawn version mismatch. This Graphite build links " \
            "react-native-webgpu-dawn #{dawn_version} but react-native-webgpu resolves " \
            "#{webgpu_dawn_version || 'none'}. Align the two packages so the app contains exactly one Dawn."
    end
    Pod::UI.puts "react-native-skia: Dawn versions match (react-native-webgpu-dawn #{dawn_version})"
  elsif webgpu_pkg['dawnCommit'].to_s.empty?
    raise "react-native-skia: the installed react-native-webgpu (#{webgpu_pkg['version']}) " \
          "neither depends on react-native-webgpu-dawn nor declares the Dawn commit it " \
          "vendors, so it cannot be paired with this Graphite build. Upgrade react-native-webgpu."
  elsif webgpu_pkg['dawnCommit'] != dawn_commit
    raise "react-native-skia: Dawn version mismatch. This Graphite build links Dawn " \
          "#{dawn_commit[0, 10]} (react-native-webgpu-dawn #{dawn_version}) but react-native-webgpu " \
          "#{webgpu_pkg['version']} vendors Dawn #{webgpu_pkg['dawnCommit'][0, 10]}. " \
          "Align the two packages so the app contains exactly one Dawn."
  else
    Pod::UI.puts "react-native-skia: Dawn versions match (commit #{dawn_commit[0, 10]})"
  end
end
dawn_frameworks = has_webgpu_pkg ? [] : ['libs/dawn/apple/libwebgpu_dawn.xcframework']

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
ios_frameworks = framework_names.map { |f| "libs/ios/#{f}.xcframework" } + dawn_frameworks
tvos_frameworks = framework_names.map { |f| "libs/tvos/#{f}.xcframework" } + dawn_frameworks
osx_frameworks = framework_names.map { |f| "libs/macos/#{f}.xcframework" } + dawn_frameworks

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
  s.platforms    = { :ios => "15.1", :tvos => "15.1", :osx => "11" }
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
  s.tvos.vendored_frameworks = tvos_frameworks
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
