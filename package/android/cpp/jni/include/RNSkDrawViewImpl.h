#pragma once

#include <RNSkDrawView.h>

#include <SkiaOpenGLRenderer.h>
#include <android/native_window.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkPicture.h>
#include <SkRefCnt.h>

#pragma clang diagnostic pop

namespace RNSkia {
    class RNSkDrawViewImpl : public RNSkia::RNSkDrawView {
    public:
        RNSkDrawViewImpl(std::shared_ptr <RNSkia::RNSkPlatformContext> context);

        virtual ~RNSkDrawViewImpl() {}

        void surfaceAvailable(ANativeWindow* surface, int, int);
        void surfaceDestroyed();
        void surfaceSizeChanged(int, int);

        float getPixelDensity() {
            return getPlatformContext()->getPixelDensity();
        }

    protected:
        int getWidth() override { return _width * _context->getPixelDensity(); };

        int getHeight() override { return _height * _context->getPixelDensity(); };

        void onInvalidated() override {
            setNativeDrawFunc(nullptr);
        };

    private:
        void drawFrame(const sk_sp <SkPicture> picture);

        bool createSkiaSurface();

        SkiaOpenGLRenderer *_renderer = nullptr;

        int _nativeId;
        int _width = -1;
        int _height = -1;

        std::shared_ptr <RNSkia::RNSkPlatformContext> _context;
    };
}
