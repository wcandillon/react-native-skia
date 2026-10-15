#!/usr/bin/env bash
# Opens a screen of the example app on the agent's device and screenshots it.
#
#   .github/scripts/agent-screen.sh <route> [seconds]
#
# <route> is a path of the app's linking config (apps/example/src/App.tsx):
# "" or "home" for the Home list, "breathe" for a top-level example,
# "api/shapes" for a screen of the API stack (apps/example/src/Examples/API/
# linking.ts). The app first goes back to Home, so each screen is opened
# fresh from the same state, then the route is opened, the script waits
# [seconds] (default 4) for the screen to render and writes
# $AGENT_OUTPUT/<route>.png, printing its path. If the app is gone after the
# wait, the script prints "crashed" and relaunches it for the next call.
#
# The device is headless and the agent cannot tap, so navigation goes
# through deep links. On iOS react-native-test-app registers its bundle id
# as URL scheme (the app's linking config lists it as a prefix), and
# `simctl openurl` delivers it to the running app. On Android the test app
# has no intent filter and its ComponentActivity is not exported: the URL
# is sent as an explicit intent to that activity, which needs adbd running
# as root (the workflow does `adb root` on the emulator), and
# FLAG_ACTIVITY_SINGLE_TOP so it reaches the running instance's onNewIntent
# instead of creating a second one.
#
# Environment, set by the workflow: AGENT_PLATFORM (ios|android),
# AGENT_OUTPUT, and IOS_SIMULATOR_UDID + BUNDLE_ID or ANDROID_PACKAGE.
set -euo pipefail

route="${1:-}"
seconds="${2:-4}"
route="${route#/}"
[ "$route" = "home" ] && route=""
name="${route:-home}"
name="${name//\//-}"
out="$AGENT_OUTPUT/$name.png"
mkdir -p "$AGENT_OUTPUT"

case "$AGENT_PLATFORM" in
  ios)
    running() {
      xcrun simctl spawn "$IOS_SIMULATOR_UDID" launchctl list 2>/dev/null \
        | grep -q "UIKitApplication:$BUNDLE_ID\["
    }
    launch() {
      xcrun simctl launch "$IOS_SIMULATOR_UDID" "$BUNDLE_ID" > /dev/null
      sleep 15
    }
    # A cold launch through openurl drops the URL (the test app's scene
    # delegate ignores the connection options), so the app must be running.
    open_url() {
      xcrun simctl openurl "$IOS_SIMULATOR_UDID" "$BUNDLE_ID://$1"
    }
    screenshot() {
      xcrun simctl io "$IOS_SIMULATOR_UDID" screenshot "$1" > /dev/null
    }
    ;;
  android)
    running() {
      [ -n "$(adb shell pidof "$ANDROID_PACKAGE" 2>/dev/null | tr -d '\r')" ]
    }
    launch() {
      adb shell am start -W -n "$ANDROID_PACKAGE/.MainActivity" > /dev/null
      sleep 15
    }
    open_url() {
      adb shell am start -a android.intent.action.VIEW -d "rnskia://$1" \
        --activity-single-top \
        -n "$ANDROID_PACKAGE/.component.ComponentActivity" > /dev/null
    }
    screenshot() {
      adb exec-out screencap -p > "$1"
    }
    ;;
  *)
    echo "AGENT_PLATFORM must be ios or android" >&2
    exit 2
    ;;
esac

running || launch
open_url ""
sleep 1
if [ -n "$route" ]; then
  open_url "$route"
fi
sleep "$seconds"

if running; then
  screenshot "$out"
  echo "$out"
else
  echo "crashed: the app is no longer running after opening $name; relaunching it"
  launch
  exit 1
fi
