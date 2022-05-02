#pragma once

#include <RNSkLog.h>
#include <chrono>
#include <sstream>
#include <iomanip>

#define NUMBER_OF_DURATION_SAMPLES 60

namespace RNSkia {

using namespace std::chrono;
using frame = duration<int32_t, std::ratio<1, 60>>;
using ms = duration<float, std::milli>;

class RNSkTimingInfo {
public:
  RNSkTimingInfo(const std::string &name): _name(std::move(name)) {
    reset();
  }

  ~RNSkTimingInfo() {}

  void reset() {
    _lastDurationIndex = 0;
    _lastDurationsCount = 0;
    _lastDuration = 0;
    _didSkip = false;
  }
  
  void beginTiming() {
    _start = high_resolution_clock::now();
  }
  
  void stopTiming() {
    time_point<steady_clock> stop = high_resolution_clock::now();
    addLastDuration(duration_cast<milliseconds>(stop - _start).count());
    if(_didSkip) {
      _didSkip = false;
      RNSkLogger::logToConsole("%s: Skipped frame. Previous frame time: %lldms", _name.c_str(), _lastDuration);
    }
  }

  void markSkipped() {
    _didSkip = true;
  }
  
  static std::string valueToStr(double v) {
    // Create an output string stream
    std::ostringstream ss;
    // Set Fixed -Point Notation
    ss << std::fixed;
    ss << std::setprecision(2);
    //Add double to stream
    ss << v;
    // Get string from output string stream
    return ss.str();
  }
  
  double getAverage() { return _average; }

  void addLastDuration(long duration) {
    _lastDuration = duration;

    // Average duration
    _lastDurations[_lastDurationIndex++] = _lastDuration;

    if (_lastDurationIndex == NUMBER_OF_DURATION_SAMPLES) {
      _lastDurationIndex = 0;
    }

    if (_lastDurationsCount < NUMBER_OF_DURATION_SAMPLES) {
      _lastDurationsCount++;
    }

    _average = 0;
    for (size_t i = 0; i < _lastDurationsCount; i++) {
      _average = _average + _lastDurations[i];
    }
    _average = _average / static_cast<double>(_lastDurationsCount);
  }

private:
  
  double _lastTimeStamp;
  long _lastDurations[NUMBER_OF_DURATION_SAMPLES];
  int _lastDurationIndex;
  int _lastDurationsCount;
  long _lastDuration;
  std::atomic<double> _average;
  time_point<steady_clock> _start;
  double _didSkip;
  std::string _name;
};

} // namespace RNSkia
