package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.View;

import com.facebook.react.uimanager.PointerEvents;
import com.facebook.react.views.view.ReactViewGroup;

public abstract class SkiaBaseView extends ReactViewGroup implements SkiaViewAPI {
    private View mView;

    private boolean mHighBitDepth = false;

    private final boolean debug = false;
    private final String tag = "SkiaView";

    public SkiaBaseView(Context context) {
        super(context);
        mView = new SkiaTextureView(context, this, debug);
        addView(mView);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        // When pointerEvents is "none" or "box-none", make this view completely
        // transparent to touch dispatch so events pass through to views behind it
        if (!PointerEvents.canBeTouchTarget(getPointerEvents())) {
            return false;
        }
        return super.dispatchTouchEvent(ev);
    }

    public void setOpaque(boolean value) {
        if (value && mView instanceof SkiaTextureView) {
            recreateView(true);
        } else if (!value && mView instanceof SkiaSurfaceView) {
            recreateView(false);
        }
    }

    public void setHighBitDepth(boolean value) {
        if (mHighBitDepth == value) {
            return;
        }
        mHighBitDepth = value;
        // The flag only affects the opaque SurfaceView path (see
        // highBitDepthIfOpaque), so only that surface needs to be recreated
        // with the new buffer format.
        if (mView instanceof SkiaSurfaceView) {
            recreateView(true);
        }
    }

    private void recreateView(boolean useSurfaceView) {
        removeView(mView);
        mView = useSurfaceView
                ? new SkiaSurfaceView(getContext(), this, debug)
                : new SkiaTextureView(getContext(), this, debug);
        addView(mView);
        // React Native sizes native children explicitly through onLayout, so
        // the requestLayout triggered by addView is ignored; size the new
        // child ourselves or it stays 0x0 and never gets a surface.
        if (getWidth() > 0 || getHeight() > 0) {
            mView.layout(0, 0, getWidth(), getHeight());
        }
    }

    private boolean highBitDepthIfOpaque(boolean opaque) {
        if (mHighBitDepth && !opaque) {
            // The 10-bit buffer format only has 2 bits of alpha, which would
            // visibly break translucency; the extra precision would also be
            // lost in the 8-bit composition pass.
            Log.w(tag, "highBitDepth requires the opaque prop on Android, falling back to the 8-bit format");
            return false;
        }
        return mHighBitDepth;
    }

    void dropInstance() {
        if (!RNSkiaModule.isModuleValid()) {
            return;
        }
        unregisterView();
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        mView.layout(0, 0, right - left, bottom - top);
    }

    @Override
    public void onSurfaceCreated(Surface surface, int width, int height) {
        surfaceAvailable(surface, width, height, true, mHighBitDepth);
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(surface, width, height, true, mHighBitDepth);
    }

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        surfaceAvailable(surface, width, height, false, highBitDepthIfOpaque(false));
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(surface, width, height, false, highBitDepthIfOpaque(false));
    }

    @Override
    public void onSurfaceDestroyed() {
        surfaceDestroyed();
    }

    protected abstract void surfaceAvailable(Object surface, int width, int height, boolean opaque, boolean highBitDepth);

    protected abstract void surfaceSizeChanged(Object surface, int width, int height, boolean opaque, boolean highBitDepth);

    protected abstract void surfaceDestroyed();

    protected abstract void setDebugMode(boolean show);

    protected abstract void registerView(int nativeId);

    protected abstract void unregisterView();

    protected abstract int[] getBitmap(int width, int height);
}
