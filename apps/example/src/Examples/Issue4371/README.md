# Issue 4371 diagnostics (PowerVR, Pixel 10 and 11)

Temporary branch `issue-4371-powervr-diagnostics` for
https://github.com/wcandillon/react-native-skia/issues/4371. Nothing in this
folder, nor the system-property switch it adds to `RNDawnUtils.h` and
`RNDawnContext.h`, is meant to land on main.

## 1. The screen, no native change needed

`Issue4371.tsx` imports only `react-native` and `react-native-skia`. Copy it
into your app, render `<Issue4371 />`, and run it on the unpatched
react-native-skia (3.8.1). Take a screenshot of the whole screen (scroll and
take a second one for the rest) and attach both to the issue, together with
`adb logcat -s RNSkia`.

Every box should show a red background with a blue shape:

| Case | What it draws | Render path |
| --- | --- | --- |
| A | fill + stroked path onscreen | MSAA pass, resolved into the swapchain image |
| B | fill + bars onscreen (control) | single-sampled pass into the swapchain image |
| C | fill + stroked rounded rect onscreen | analytic stroke, single-sampled pass |
| D | fill + stroked path in a layer onscreen | MSAA pass into a layer texture, composited single-sampled |
| E | fill + stroked path on an offscreen GPU surface | MSAA pass into an ordinary texture, read back and counted |
| F | fill + bars on an offscreen GPU surface (control) | single-sampled pass into a texture, read back |
| G | fill + stroked path on a CPU surface (control) | no GPU |
| H | E at the onscreen pixel size | MSAA attachment of the same size as A's |
| I | fill + stroked path in a layer on an offscreen GPU surface | two passes in one recording like D, no swapchain, no render thread |
| J | I at the onscreen pixel size | as I, with D's attachment size |
| K | fill + bars in a layer onscreen (control) | a layer whose pass has no MSAA draw |

How to read it (F and G must PASS, otherwise the other verdicts cannot be
trusted):

| A | C | D | E | Meaning |
| --- | --- | --- | --- | --- |
| blank | ok | ok | PASS | the failure needs the swapchain image as the resolve target |
| blank | ok | blank | BLANK | the MSAA attachment plus resolve path fails for every target; Dawn's own transient attachment tests should reproduce it |
| blank | ok | blank | PASS | onscreen frames fail even into layer textures but a standalone surface works (the Pixel 11 result on 2026-11-01, see below) |
| red, no line | ok | any | RED ONLY | the MSAA draw itself is lost, not the resolve: a different bug |
| blank | blank | any | any | not limited to MSAA passes |

The Pixel 11 gave the third row: A and D blank, B, C, E, F, G fine. D is
the telling one: its main pass has no MSAA draw at all, yet the whole canvas
is lost, so the loss happens at the level of the recording (one Dawn command
buffer per recording) rather than of the MSAA pass. Cases H to K split what
else is needed:

| H | I | J | K | Meaning |
| --- | --- | --- | --- | --- |
| BLANK | PASS | any | ok | the attachment size is the trigger (E is 300x80, A is the onscreen pixel size) |
| PASS | BLANK | BLANK | ok | a second pass in the same recording is enough: reproducible in a Dawn end2end test with two passes and no surface |
| PASS | PASS | PASS | ok | the remaining ingredients are the swapchain image and the render thread; next is a Dawn surface test |
| any | any | any | blank | layers fail on their own, not an MSAA problem |

On the property runs: `dawn.drop loadresolve` with TransientAttachments still
on makes Graphite load and sample a transient MSAA attachment, which Dawn
rejects with validation errors on any GPU (Graphite's caps only switch to the
emulated resolve when transient attachments are off as well). That run says
nothing about PowerVR; it is a Graphite inconsistency that no shipped
configuration reaches.

## 2. Dawn feature variants without rebuilding

`react-native-skia+3.8.1.patch` adds a switch read from Android system
properties when the GPU device is created. Save it as
`patches/react-native-skia+3.8.1.patch`, run `npx patch-package`, rebuild the
Android app once, then:

```sh
adb shell setprop debug.rnskia.dawn.drop transient
adb shell am force-stop <your.application.id>
# relaunch the app and open the screen
```

Tokens for `debug.rnskia.dawn.drop`, comma separated: `transient`
(TransientAttachments), `loadresolve` (DawnLoadResolveTexture and
DawnPartialLoadResolveTexture), `msrtss` (MSAARenderToSingleSampled).
`adb shell setprop debug.rnskia.graphite.msaa 1` turns Graphite's internal
MSAA off instead. Clear both with `setprop debug.rnskia.dawn.drop '""'` and
`setprop debug.rnskia.graphite.msaa '""'`. Each launch logs what it did:

```
RNSkia: debug.rnskia.dawn.drop=transient applied
RNSkia: Dawn feature MSAARenderToSingleSampled: adapter=1 device=0
RNSkia: Dawn feature TransientAttachments: adapter=1 device=0
RNSkia: Dawn feature DawnLoadResolveTexture: adapter=1 device=1
RNSkia: Dawn feature DawnPartialLoadResolveTexture: adapter=0 device=0
```

Runs worth collecting (screenshots plus the RNSkia logcat lines):

1. default (no property set)
2. `debug.rnskia.dawn.drop transient`
3. `debug.rnskia.graphite.msaa 1`
4. optional: `debug.rnskia.dawn.drop loadresolve`

Note for run 2: Dawn's Vulkan backend never advertises
DawnPartialLoadResolveTexture, so without TransientAttachments Graphite
switches to its emulated load/store resolve (the MSAA texture gets
TextureBinding usage and the resolve is a draw in a separate pass). The
variant therefore bypasses Vulkan resolve attachments entirely, which is why
it has to be read together with E and D rather than on its own.

## 3. Vulkan validation layers (only if 1 and 2 do not settle it)

On a retail Pixel the layer cannot be dropped into `/data/local/debug/vulkan`,
so pack `arm64-v8a/libVkLayer_khronos_validation.so` from the Khronos
`android-binaries-<version>.zip` release into a minimal APK (manifest only,
`lib/arm64-v8a/` stored uncompressed, zipalign, apksigner with the debug
keystore) and install it with `adb install --force-queryable`. Then:

```sh
adb shell settings put global enable_gpu_debug_layers 1
adb shell settings put global gpu_debug_app <your.application.id>
adb shell settings put global gpu_debug_layers VK_LAYER_KHRONOS_validation
adb shell settings put global gpu_debug_layer_app <layer.package.id>
```

Validation messages arrive in logcat under the `Dawn` tag. Reset the four
settings and uninstall the layer app afterwards.
