# @shopify/react-native-skia.podspec

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Resolve npm package path using Node.js resolution (handles monorepos, pnpm, etc.)
def resolve_skia_package(package_name, required: true)
  begin
    # Use node to resolve the package - this handles all edge cases:
    # - Hoisted packages in monorepos
    # - pnpm symlinked packages
    # - Yarn PnP
    # - Different node_modules structures
    result = `node -e "console.log(require.resolve('#{package_name}/package.json'))" 2>/dev/null`.strip
    if $?.success? && !result.empty?
      return File.dirname(result)
    end
  rescue => e
    # Node resolution failed
  end

  # Fallback: walk up directories looking for node_modules
  current = __dir__
  while current != "/"
    candidate = File.join(current, "node_modules", package_name)
    if File.exist?(File.join(candidate, "package.json"))
      return candidate
    end
    current = File.dirname(current)
  end

  if required
    Pod::UI.puts "\n"
    Pod::UI.puts "ERROR: Could not find #{package_name}".red
    Pod::UI.puts "Make sure you have run 'yarn install' or 'npm install'".red
    Pod::UI.puts "\n"
    raise "#{package_name} not found. Please install dependencies."
  end

  nil
end

# Check if Graphite is enabled
use_graphite = false
if ENV['SK_GRAPHITE']
  use_graphite = ENV['SK_GRAPHITE'] == '1' || ENV['SK_GRAPHITE'].downcase == 'true'
  puts "-- SK_GRAPHITE: using environment variable (#{use_graphite ? 'ON' : 'OFF'})"
else
  puts "-- SK_GRAPHITE: OFF (set SK_GRAPHITE=1 to enable)"
end

# Resolve Skia binary packages
prefix = use_graphite ? "react-native-skia-graphite" : "react-native-skia"

ios_package = resolve_skia_package("#{prefix}-apple-ios")
macos_package = resolve_skia_package("#{prefix}-apple-macos")
tvos_package = use_graphite ? nil : resolve_skia_package("#{prefix}-apple-tvos", required: false)

puts "-- Skia iOS package: #{ios_package}"
puts "-- Skia macOS package: #{macos_package}"
puts "-- Skia tvOS package: #{tvos_package}" if tvos_package

# Verify the packages contain the expected files
ios_libs_path = File.join(ios_package, "libs")
unless File.exist?(ios_libs_path) && Dir.glob(File.join(ios_libs_path, "*.xcframework")).any?
  Pod::UI.puts "\n"
  Pod::UI.puts "┌─────────────────────────────────────────────────────────────────────────────┐".red
  Pod::UI.puts "│                                                                             │".red
  Pod::UI.puts "│  ERROR: Skia prebuilt binaries not found in #{prefix}-apple-ios!            │".red
  Pod::UI.puts "│                                                                             │".red
  Pod::UI.puts "│  The package was found but doesn't contain the expected xcframeworks.      │".red
  Pod::UI.puts "│  Try reinstalling: yarn add #{prefix}-apple-ios                             │".red
  Pod::UI.puts "│                                                                             │".red
  Pod::UI.puts "└─────────────────────────────────────────────────────────────────────────────┘".red
  Pod::UI.puts "\n"
  raise "Skia xcframeworks not found in #{ios_libs_path}"
end

# Set preprocessor definitions based on GRAPHITE flag
preprocessor_defs = use_graphite ?
  '$(inherited) SK_GRAPHITE=1 SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API=1 SK_DISABLE_LEGACY_SHAPER_FACTORY=1' :
  '$(inherited) SK_METAL=1 SK_GANESH=1 SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API=1 SK_DISABLE_LEGACY_SHAPER_FACTORY=1'

# Define framework names
framework_names = ['libskia', 'libsvg', 'libskshaper', 'libskparagraph',
                   'libskunicode_core', 'libskunicode_libgrapheme',
                   'libskottie', 'libsksg']

# Build platform-specific framework paths (absolute paths to npm packages)
ios_frameworks = framework_names.map { |f| "#{ios_package}/libs/#{f}.xcframework" }
osx_frameworks = framework_names.map { |f| "#{macos_package}/libs/#{f}.xcframework" }
tvos_frameworks = tvos_package ? framework_names.map { |f| "#{tvos_package}/libs/#{f}.xcframework" } : []

Pod::Spec.new do |s|
  s.name         = "react-native-skia"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  @shopify/react-native-skia
                   DESC
  s.homepage     = "https://github.com/shopify/react-native-skia"
  s.license      = "MIT"
  s.license    = { :type => "MIT", :file => "LICENSE.md" }
  s.authors      = {
    "Christian Falch" => "christian.falch@gmail.com",
    "William Candillon" => "wcandillon@gmail.com"
  }
  s.platforms    = { :ios => "14.0", :tvos => "13.0", :osx => "11" }
  s.source       = { :git => "https://github.com/shopify/react-native-skia/react-native-skia.git", :tag => "#{s.version}" }

  s.requires_arc = true
  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => preprocessor_defs,
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'DEFINES_MODULE' => 'YES',
    "HEADER_SEARCH_PATHS" => '"$(PODS_TARGET_SRCROOT)/cpp/"/** "$(PODS_TARGET_SRCROOT)/cpp" "$(PODS_TARGET_SRCROOT)/cpp/jsi2" "$(PODS_TARGET_SRCROOT)/cpp/rnwgpu" "$(PODS_TARGET_SRCROOT)/cpp/rnwgpu/api" "$(PODS_TARGET_SRCROOT)/cpp/rnwgpu/api/descriptors" "$(PODS_TARGET_SRCROOT)/cpp/rnwgpu/async" "$(PODS_TARGET_SRCROOT)/cpp/dawn/include"'
  }

  s.frameworks = ['MetalKit', 'AVFoundation', 'AVKit', 'CoreMedia']

  # Platform-specific vendored frameworks (absolute paths to npm packages)
  s.ios.vendored_frameworks = ios_frameworks
  s.osx.vendored_frameworks = osx_frameworks

  # tvOS frameworks only available for non-Graphite builds
  unless use_graphite
    s.tvos.vendored_frameworks = tvos_frameworks
  end

  # All iOS cpp/h files
  s.source_files = [
    "apple/**/*.{h,c,cc,cpp,m,mm,swift}",
    "cpp/**/*.{h,cpp}"
  ]

  graphite_exclusions = [
    'cpp/rnskia/RNDawnContext.h',
    'cpp/rnskia/RNDawnUtils.h',
    'cpp/rnskia/RNDawnWindowContext.h',
    'cpp/rnskia/RNDawnWindowContext.cpp',
    'cpp/rnskia/RNImageProvider.h',
    'cpp/rnwgpu/**/*.{h,cpp}'
  ]
  s.exclude_files = graphite_exclusions unless use_graphite

  if defined?(install_modules_dependencies()) != nil
    install_modules_dependencies(s)
    s.dependency "React"
    s.dependency "React-callinvoker"
    s.dependency "React-Core"
  else
    s.dependency "React"
    s.dependency "React-callinvoker"
    s.dependency "React-Core"
  end
end
