package com.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.View;

import com.facebook.react.uimanager.PointerEvents;
import com.facebook.react.views.view.ReactViewGroup;

public abstract class SkiaBaseView extends ReactViewGroup implements SkiaViewAPI {
    // Backing view kinds, see updateView().
    private static final int KIND_SURFACE_VIEW = 0;
    private static final int KIND_TEXTURE_VIEW = 1;

    private View mView;

    // Props, applied together in updateView().
    private boolean mOpaque = false;
    private String mSurfaceType = "auto";
    private boolean mZOrderOnTop = false;
    private boolean mHighBitDepth = false;

    // What the current backing view was created with.
    private int mAppliedKind = -1;
    private boolean mAppliedZOrderOnTop;
    private boolean mAppliedHighBitDepth;

    private final boolean debug = false;
    private final String tag = "SkiaView";

    public SkiaBaseView(Context context) {
        super(context);
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
        mOpaque = value;
    }

    public void setSurfaceType(String value) {
        mSurfaceType = value == null ? "auto" : value;
    }

    public void setZOrderOnTop(boolean value) {
        mZOrderOnTop = value;
    }

    public void setHighBitDepth(boolean value) {
        mHighBitDepth = value;
    }

    // Resolve the backing view from the props. "auto" picks SurfaceView for an
    // opaque canvas and TextureView for a non-opaque one.
    private int resolveKind() {
        if ("SurfaceView".equals(mSurfaceType)) {
            return KIND_SURFACE_VIEW;
        }
        if ("TextureView".equals(mSurfaceType)) {
            return KIND_TEXTURE_VIEW;
        }
        return mOpaque ? KIND_SURFACE_VIEW : KIND_TEXTURE_VIEW;
    }

    // The 10-bit buffer format only has 2 bits of alpha, which would visibly
    // break translucency, and the extra precision would be lost in the 8-bit
    // composition pass of a TextureView anyway. So the flag only applies to an
    // opaque SurfaceView.
    private boolean resolveHighBitDepth(int kind) {
        if (!mHighBitDepth) {
            return false;
        }
        if (kind != KIND_SURFACE_VIEW || !mOpaque) {
            Log.w(tag, "highBitDepth requires an opaque SurfaceView on Android, falling back to the 8-bit format");
            return false;
        }
        return true;
    }

    // Apply the complete prop transaction once, after every prop has arrived.
    // Only a change of backing view, or of a setting the view must know before
    // it attaches (zOrderOnTop, the buffer format), replaces the child; opacity
    // is applied in place.
    void updateView() {
        int kind = resolveKind();
        boolean zOrderOnTop = kind == KIND_SURFACE_VIEW && mZOrderOnTop;
        boolean highBitDepth = resolveHighBitDepth(kind);
        if (mView == null
                || kind != mAppliedKind
                || zOrderOnTop != mAppliedZOrderOnTop
                || highBitDepth != mAppliedHighBitDepth) {
            if (mView != null) {
                removeView(mView);
            }
            mAppliedKind = kind;
            mAppliedZOrderOnTop = zOrderOnTop;
            mAppliedHighBitDepth = highBitDepth;
            mView = kind == KIND_SURFACE_VIEW
                    ? new SkiaSurfaceView(getContext(), this, debug, zOrderOnTop, mOpaque)
                    : new SkiaTextureView(getContext(), this, debug, mOpaque);
            addView(mView);
            // React Native sizes native children explicitly through onLayout, so
            // the requestLayout triggered by addView is ignored; size the new
            // child ourselves or it stays 0x0 and never gets a surface.
            if (getWidth() > 0 || getHeight() > 0) {
                mView.layout(0, 0, getWidth(), getHeight());
            }
        } else if (kind == KIND_SURFACE_VIEW) {
            ((SkiaSurfaceView) mView).setOpaque(mOpaque);
        } else {
            ((SkiaTextureView) mView).setOpaque(mOpaque);
        }
    }

    void dropInstance() {
        unregisterView();
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        if (mView != null) {
            mView.layout(0, 0, right - left, bottom - top);
        }
        // After a display density change React Native lays the view out
        // again. A new size reaches the native side with the surface, along
        // with its density (see surfaceDensity()); a surface that keeps its
        // size gets the new density here.
        float density = getResources().getDisplayMetrics().density;
        if (mSurfaceDensity > 0 && density != mSurfaceDensity
                && right - left == mSurfaceWidth && bottom - top == mSurfaceHeight) {
            mSurfaceDensity = density;
            setPixelDensity(density);
        }
    }

    // The size and density the native side knows the surface with: frames are
    // scaled by the density of the layout the surface has the size of, never
    // by a density that layout is not made for yet.
    private int mSurfaceWidth;
    private int mSurfaceHeight;
    private float mSurfaceDensity;

    private float surfaceDensity(int width, int height) {
        mSurfaceWidth = width;
        mSurfaceHeight = height;
        mSurfaceDensity = getResources().getDisplayMetrics().density;
        return mSurfaceDensity;
    }

    // SurfaceView callbacks: the native side receives an android.view.Surface.

    @Override
    public void onSurfaceCreated(Surface surface, int width, int height) {
        surfaceAvailable(surface, width, height, surfaceDensity(width, height), true,
                mAppliedHighBitDepth);
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(tag, "onSurfaceChanged " + width + "/" + height);
        surfaceSizeChanged(surface, width, height, surfaceDensity(width, height), true,
                mAppliedHighBitDepth);
    }

    // TextureView callbacks: the native side receives the SurfaceTexture and
    // creates the Surface it draws into. The 10-bit format is never used here.

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        surfaceAvailable(surface, width, height, surfaceDensity(width, height), false, false);
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(surface, width, height, surfaceDensity(width, height), false, false);
    }

    @Override
    public void onSurfaceDestroyed() {
        surfaceDestroyed();
    }

    // isSurface tells the native side whether `surface` is an
    // android.view.Surface (SurfaceView) or a SurfaceTexture (TextureView).
    protected abstract void surfaceAvailable(Object surface, int width, int height, float pixelDensity, boolean isSurface, boolean highBitDepth);

    protected abstract void surfaceSizeChanged(Object surface, int width, int height, float pixelDensity, boolean isSurface, boolean highBitDepth);

    // The density changed while the surface kept its size.
    protected abstract void setPixelDensity(float pixelDensity);

    protected abstract void surfaceDestroyed();

    protected abstract void setDebugMode(boolean show);

    protected abstract void registerView(int nativeId);

    protected abstract void unregisterView();

    protected abstract int[] getBitmap(int width, int height);
}
