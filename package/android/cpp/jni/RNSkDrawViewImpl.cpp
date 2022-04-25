#include <RNSkDrawViewImpl.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkSurface.h>
#include <SkCanvas.h>

#pragma clang diagnostic pop

#include <RNSkLog.h>

namespace RNSkia {
    RNSkDrawViewImpl::RNSkDrawViewImpl(std::shared_ptr <RNSkia::RNSkPlatformContext> context) :
            _context(context), RNSkia::RNSkDrawView(context) {
    }

    void RNSkDrawViewImpl::surfaceAvailable(ANativeWindow* surface, int width, int height) {
        _width = width;
        _height = height;

        if (_renderer == nullptr)
        {
            // Create renderer!
            _renderer = new SkiaOpenGLRenderer(surface, getNativeId());

            // Set the draw function
            setNativeDrawFunc(std::bind(&RNSkDrawViewImpl::drawFrame, this, std::placeholders::_1));

            // Redraw
            requestRedraw();
        }
    }

    void RNSkDrawViewImpl::surfaceDestroyed() {
        if (_renderer != nullptr)
        {
            // Turn off drawing
            setNativeDrawFunc(nullptr);

            // Start teardown
            _renderer->teardown();

            // Ask for a redraw to tear down the render pipeline. This
            // needs to be done on the render thread since OpenGL demands
            // same thread access for OpenGL contexts.
            getPlatformContext()->runOnRenderThread([this]()
                                                    {
                                                        if(_renderer != nullptr) {
                                                            _renderer->run(nullptr, 0, 0);
                                                        } });

            // Wait until the above render has finished.
            _renderer->waitForTeardown();

            // Delete renderer. All resources should be released during teardown.
            delete _renderer;
            _renderer = nullptr;
        }
    }

    void RNSkDrawViewImpl::surfaceSizeChanged(int width, int height) {
        _width = width;
        _height = height;

        // Redraw after size change
        requestRedraw();
    }

    void RNSkDrawViewImpl::drawFrame(const sk_sp <SkPicture> picture) {
        // No need to check if the renderer is nullptr since we only get here if it is not.
        _renderer->run(picture, _width, _height);
    }
}
