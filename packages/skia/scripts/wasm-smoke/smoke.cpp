/*
 * Smoke test of the Skia wasm archives: one module that links all of them and
 * draws a tile with each through Graphite on the browser's WebGPU.
 *
 * The page (main.js) owns the GPUDevice and the target texture. It hands both
 * over, then reads the texture back and checks every tile. This is a check of
 * the prebuilt archives, not the start of an API.
 */
#include <cstdint>
#include <memory>

#include <emscripten/emscripten.h>
#include <webgpu/webgpu_cpp.h>

#include "include/core/SkBitmap.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkData.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkImage.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPathBuilder.h"
#include "include/core/SkRRect.h"
#include "include/core/SkStream.h"
#include "include/core/SkString.h"
#include "include/core/SkSurface.h"
#include "include/core/SkTypeface.h"
#include "include/effects/SkRuntimeEffect.h"
#include "include/encode/SkPngEncoder.h"
#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Context.h"
#include "include/gpu/graphite/ContextOptions.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/Image.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"
#include "include/ports/SkFontMgr_empty.h"
#include "modules/skottie/include/Skottie.h"
#include "modules/skparagraph/include/FontCollection.h"
#include "modules/skparagraph/include/Paragraph.h"
#include "modules/skparagraph/include/ParagraphBuilder.h"
#include "modules/skparagraph/include/ParagraphStyle.h"
#include "modules/skparagraph/include/TextStyle.h"
#include "modules/skparagraph/include/TypefaceFontProvider.h"
#include "modules/skunicode/include/SkUnicode_libgrapheme.h"
#include "modules/svg/include/SkSVGDOM.h"

// WebGPU.importJsDevice and importJsTexture, which the page calls, create
// their C++ counterparts through these.
EM_JS_DEPS(smoke,
           "$WebGPU,emwgpuCreateDevice,emwgpuCreateQueue,emwgpuCreateTexture");

namespace {

// main.js lays the same grid over the texture: three tiles a row.
constexpr float kTile = 128;
constexpr int kColumns = 3;

std::unique_ptr<skgpu::graphite::Context> gContext;
std::unique_ptr<skgpu::graphite::Recorder> gRecorder;
sk_sp<SkTypeface> gTypeface;

// Core and Graphite: a solid fill, an anti-aliased stroke and a filled path.
// The center of the tile keeps the fill color.
bool drawShapes(SkCanvas* canvas) {
  SkPaint fill;
  fill.setColor(SkColorSetRGB(0, 128, 255));
  canvas->drawRect(SkRect::MakeWH(kTile, kTile), fill);

  SkPaint stroke;
  stroke.setAntiAlias(true);
  stroke.setStyle(SkPaint::kStroke_Style);
  stroke.setStrokeWidth(6);
  stroke.setColor(SK_ColorWHITE);
  canvas->drawRRect(
      SkRRect::MakeRectXY(SkRect::MakeLTRB(12, 12, 116, 116), 16, 16), stroke);

  SkPaint white;
  white.setAntiAlias(true);
  white.setColor(SK_ColorWHITE);
  SkPathBuilder star;
  star.moveTo(96, 80).lineTo(102, 98).lineTo(84, 87).lineTo(108, 87).lineTo(90,
                                                                              98);
  star.close();
  canvas->drawPath(star.detach(), white);
  return true;
}

// SkSL compiled to WGSL at runtime, with a uniform.
bool drawRuntimeEffect(SkCanvas* canvas) {
  auto result = SkRuntimeEffect::MakeForShader(SkString(
      "uniform half4 color; half4 main(float2 p) { return color; }"));
  if (!result.effect) {
    return false;
  }
  SkRuntimeShaderBuilder builder(result.effect);
  builder.uniform("color") = SkV4{1, 0, 0.5f, 1};
  SkPaint paint;
  paint.setShader(builder.makeShader());
  canvas->drawRect(SkRect::MakeWH(kTile, kTile), paint);
  return true;
}

// The PNG encoder and decoder, then a CPU image uploaded to a texture.
// Graphite only draws GPU images: without an image provider on the recorder,
// the upload is the caller's to make.
bool drawImage(SkCanvas* canvas) {
  SkBitmap bitmap;
  bitmap.allocPixels(SkImageInfo::Make(16, 16, kRGBA_8888_SkColorType,
                                       kPremul_SkAlphaType));
  bitmap.eraseColor(SkColorSetRGB(128, 0, 255));
  sk_sp<SkData> png =
      SkPngEncoder::Encode(bitmap.pixmap(), SkPngEncoder::Options());
  if (!png) {
    return false;
  }
  sk_sp<SkImage> decoded = SkImages::DeferredFromEncodedData(png);
  if (!decoded) {
    return false;
  }
  sk_sp<SkImage> image =
      SkImages::TextureFromImage(gRecorder.get(), decoded.get());
  if (!image) {
    return false;
  }
  canvas->drawImageRect(image, SkRect::MakeWH(kTile, kTile),
                        SkSamplingOptions(SkFilterMode::kNearest));
  return true;
}

// The SVG module and its XML parser.
bool drawSVG(SkCanvas* canvas) {
  static const char kSVG[] =
      R"(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">)"
      R"(<rect width="100" height="100" fill="#00a050"/>)"
      R"(<circle cx="20" cy="20" r="10" fill="#fff"/></svg>)";
  SkMemoryStream stream(kSVG, sizeof(kSVG) - 1);
  sk_sp<SkSVGDOM> dom = SkSVGDOM::Builder().make(stream);
  if (!dom) {
    return false;
  }
  dom->setContainerSize(SkSize::Make(kTile, kTile));
  dom->render(canvas);
  return true;
}

// Skottie with its scene graph and JSON reader: one solid layer.
bool drawSkottie(SkCanvas* canvas) {
  static const char kLottie[] =
      R"({"v":"5.7.0","fr":30,"ip":0,"op":30,"w":100,"h":100,"layers":[)"
      R"({"ty":1,"ind":1,"sw":100,"sh":100,"sc":"#ff8000","ip":0,"op":30,)"
      R"("st":0,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},)"
      R"("p":{"a":0,"k":[50,50,0]},"a":{"a":0,"k":[50,50,0]},)"
      R"("s":{"a":0,"k":[100,100,100]}}}]})";
  sk_sp<skottie::Animation> animation =
      skottie::Animation::Make(kLottie, sizeof(kLottie) - 1);
  if (!animation) {
    return false;
  }
  animation->seekFrame(0);
  const SkRect destination = SkRect::MakeWH(kTile, kTile);
  animation->render(canvas, &destination);
  return true;
}

// Paragraph, the shaper, libgrapheme and FreeType, with the page's font.
bool drawParagraph(SkCanvas* canvas) {
  if (!gTypeface) {
    return false;
  }
  using namespace skia::textlayout;
  auto provider = sk_make_sp<TypefaceFontProvider>();
  provider->registerTypeface(gTypeface, SkString("Smoke"));
  auto fonts = sk_make_sp<FontCollection>();
  fonts->setAssetFontManager(provider);
  fonts->disableFontFallback();

  sk_sp<SkUnicode> unicode = SkUnicodes::Libgrapheme::Make();
  if (!unicode) {
    return false;
  }
  TextStyle text;
  text.setColor(SK_ColorBLACK);
  text.setFontSize(40);
  text.setFontFamilies({SkString("Smoke")});
  ParagraphStyle style;
  style.setTextStyle(text);

  std::unique_ptr<ParagraphBuilder> builder =
      ParagraphBuilder::make(style, fonts, unicode);
  builder->pushStyle(text);
  builder->addText("Skia");
  std::unique_ptr<Paragraph> paragraph = builder->Build();
  paragraph->layout(kTile);
  paragraph->paint(canvas, 16, 36);
  return paragraph->getLongestLine() > 0;
}

} // namespace

extern "C" {

// `device` comes from WebGPU.importJsDevice(), whose reference is taken over.
EMSCRIPTEN_KEEPALIVE int smoke_init(WGPUDevice cDevice) {
  wgpu::Device device = wgpu::Device::Acquire(cDevice);
  skgpu::graphite::DawnBackendContext backendContext;
  backendContext.fInstance = wgpu::CreateInstance();
  backendContext.fDevice = device;
  backendContext.fQueue = device.GetQueue();
  // fTick stays null: without Asyncify or JSPI nothing can wait on the GPU, so
  // Graphite never blocks and work completes from the browser's event loop.
  gContext = skgpu::graphite::ContextFactory::MakeDawn(
      backendContext, skgpu::graphite::ContextOptions());
  if (!gContext) {
    return 0;
  }
  gRecorder = gContext->makeRecorder();
  return gRecorder ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE int smoke_set_font(const uint8_t* bytes, size_t length) {
  gTypeface = SkFontMgr_New_Custom_Empty()->makeFromData(
      SkData::MakeWithCopy(bytes, length));
  return gTypeface ? 1 : 0;
}

// Draws every tile into `texture` (from WebGPU.importJsTexture(), whose
// reference is taken over) and submits. Returns a bit per tile that had
// something to draw, in grid order, or a negative step number on failure.
EMSCRIPTEN_KEEPALIVE int smoke_draw(WGPUTexture cTexture) {
  wgpu::Texture texture = wgpu::Texture::Acquire(cTexture);
  if (!gRecorder) {
    return -1;
  }
  sk_sp<SkSurface> surface = SkSurfaces::WrapBackendTexture(
      gRecorder.get(),
      skgpu::graphite::BackendTextures::MakeDawn(texture.Get()),
      SkColorSpace::MakeSRGB(), nullptr);
  if (!surface) {
    return -2;
  }

  bool (*const tiles[])(SkCanvas*) = {drawShapes, drawRuntimeEffect, drawImage,
                                      drawSVG,    drawSkottie,       drawParagraph};
  SkCanvas* canvas = surface->getCanvas();
  canvas->clear(SK_ColorWHITE);
  int drawn = 0;
  int index = 0;
  for (auto draw : tiles) {
    SkAutoCanvasRestore restore(canvas, true);
    canvas->translate((index % kColumns) * kTile, (index / kColumns) * kTile);
    canvas->clipRect(SkRect::MakeWH(kTile, kTile));
    if (draw(canvas)) {
      drawn |= 1 << index;
    }
    index++;
  }

  std::unique_ptr<skgpu::graphite::Recording> recording = gRecorder->snap();
  if (!recording) {
    return -3;
  }
  skgpu::graphite::InsertRecordingInfo info;
  info.fRecording = recording.get();
  if (gContext->insertRecording(info) !=
      skgpu::graphite::InsertStatus::kSuccess) {
    return -4;
  }
  if (!gContext->submit()) {
    return -5;
  }
  return drawn;
}

// Lets Graphite notice finished GPU work. Returns whether some is pending.
EMSCRIPTEN_KEEPALIVE int smoke_tick() {
  if (!gContext) {
    return 0;
  }
  gContext->checkAsyncWorkCompletion();
  return gContext->hasUnfinishedGpuWork() ? 1 : 0;
}

// A context that cannot wait must only be destroyed once its work is done.
EMSCRIPTEN_KEEPALIVE void smoke_shutdown() {
  gTypeface.reset();
  gRecorder.reset();
  gContext.reset();
}

} // extern "C"
