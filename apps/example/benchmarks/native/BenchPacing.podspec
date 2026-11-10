require 'digest'

Pod::Spec.new do |s|
  s.name = 'BenchPacing'
  s.version = '1.0.0'
  s.summary = 'Drawable presentation feedback for the example pacing benchmark only'
  s.homepage = 'https://github.com/wcandillon/react-native-skia'
  s.license = { :type => 'MIT' }
  s.author = 'React Native Skia contributors'
  s.source = { :git => 'https://github.com/wcandillon/react-native-skia.git' }
  s.platform = :ios, '15.1'
  s.source_files = 'BenchPacing.mm'
  s.requires_arc = true
  s.frameworks = 'Metal', 'QuartzCore', 'UIKit'
  s.dependency 'React-Core'
  # A stale pod build must not silently claim to use the current observer.
  digest = Digest::SHA256.file(File.join(__dir__, 'BenchPacing.mm')).hexdigest
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GCC_PREPROCESSOR_DEFINITIONS' => "$(inherited) BENCH_PACING_NATIVE_HASH=\\\"#{digest}\\\""
  }
end
