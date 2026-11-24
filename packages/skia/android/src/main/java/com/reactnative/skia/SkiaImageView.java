package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RecordingCanvas;
import android.graphics.Rect;
import android.graphics.RenderNode;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

import com.facebook.react.views.view.ReactViewGroup;

/**
 * The Android view behind <SkiaImageView>: a React Native view that draws its
 * image's bitmap, shared with every view showing the same image, inside the
 * window's own drawing, or the smaller level of it its size asks for (see
 * PresentedImage). It has no surface, swapchain or native Skia view: it mounts
 * and unmounts as any view does, and composites, clips, fades and transforms
 * like one.
 */
@SuppressLint("ViewConstructor")
public class SkiaImageView extends ReactViewGroup implements PresentedImageStore.Observer<PresentedImage> {

    private final Paint mPaint = new Paint(Paint.FILTER_BITMAP_FLAG);
    private final Rect mSource = new Rect();
    private final Rect mDestination = new Rect();
    // The bitmap is drawn through a node force dark leaves alone, as it leaves a canvas's window: the view's own
    // background and border still follow force dark, as a canvas's do (Android 10 and later).
    @Nullable
    private final RenderNode mBitmapNode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? makeBitmapNode() : null;

    // The content box's insets in pixels, its padding and border, as Fabric hands them over (see
    // SkiaImageViewManager#setPadding): the image fills the content box, as React Native's Image does.
    private int mContentLeft = 0;
    private int mContentTop = 0;
    private int mContentRight = 0;
    private int mContentBottom = 0;
    // 0 shows nothing; see RNSkPresentedImages::idOf for the others.
    private long mImageId = 0;
    @Nullable
    private PresentedImage mPublishedImage;
    private int mLevelForSize = 0;
    // Kept while a level or an image is on its way.
    @Nullable
    private Bitmap mDrawnBitmap;

    public SkiaImageView(Context context) {
        super(context);
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private static RenderNode makeBitmapNode() {
        RenderNode node = new RenderNode("SkiaImageView");
        node.setForceDarkAllowed(false);
        return node;
    }

    void setPresentedImageId(long id) {
        if (id == mImageId) {
            return;
        }
        if (mImageId != 0) {
            SkiaPresentedImages.unobserve(mImageId, this);
        }
        mImageId = id;
        mPublishedImage = null;
        if (id == 0) {
            stopDrawing();
            return;
        }
        // The view keeps the bitmap it shows until the new image is published,
        // or is told it failed, a failure the store keeps through a retry.
        SkiaPresentedImages.observe(id, this);
    }

    void setContentInsets(int left, int top, int right, int bottom) {
        if (left == mContentLeft && top == mContentTop && right == mContentRight && bottom == mContentBottom) {
            return;
        }
        mContentLeft = left;
        mContentTop = top;
        mContentRight = right;
        mContentBottom = bottom;
        PresentedImage image = mPublishedImage;
        if (image != null) {
            show(image);
        }
        invalidate();
    }

    @Override
    public void onImagePublished(@NonNull PresentedImage image) {
        show(image);
    }

    // As React Native's Image shows nothing when its source fails.
    @Override
    public void onImageFailed() {
        mPublishedImage = null;
        stopDrawing();
    }

    private void stopDrawing() {
        mDrawnBitmap = null;
        invalidate();
    }

    @Override
    public void onLevelMade() {
        takeLevel();
    }

    // A level that could not be made while the device was lost is asked for again.
    @Override
    public void onGpuDeviceReplaced() {
        PresentedImage image = mPublishedImage;
        if (image != null) {
            show(image);
        }
    }

    @Override
    protected void onSizeChanged(int width, int height, int oldWidth, int oldHeight) {
        super.onSizeChanged(width, height, oldWidth, oldHeight);
        PresentedImage image = mPublishedImage;
        if (image != null) {
            show(image);
        }
    }

    private int contentWidth() {
        return getWidth() - mContentLeft - mContentRight;
    }

    private int contentHeight() {
        return getHeight() - mContentTop - mContentBottom;
    }

    // Before layout the view has no size to pick a level by: it asks once it is laid out.
    private void show(@NonNull PresentedImage image) {
        mPublishedImage = image;
        if (contentWidth() <= 0 || contentHeight() <= 0) {
            return;
        }
        Bitmap bitmap = image.bitmap();
        mLevelForSize = PresentedImage.levelFor(bitmap.getWidth(), bitmap.getHeight(), contentWidth(), contentHeight());
        image.request(mLevelForSize);
        takeLevel();
    }

    // A view that is not laid out has no level yet (see show).
    private void takeLevel() {
        PresentedImage image = mPublishedImage;
        if (image == null || contentWidth() <= 0 || contentHeight() <= 0) {
            return;
        }
        Bitmap level = image.takeLevel(mLevelForSize);
        if (level != null && level != mDrawnBitmap) {
            mDrawnBitmap = level;
            invalidate();
        }
    }

    // After ReactViewGroup's own drawing, inside the clip it sets for overflow
    // and the border radius, where its children would be.
    @Override
    protected void dispatchDraw(@NonNull Canvas canvas) {
        super.dispatchDraw(canvas);
        Bitmap bitmap = mDrawnBitmap;
        if (bitmap == null || contentWidth() <= 0 || contentHeight() <= 0) {
            return;
        }
        // The image fills the content box: one laid out at the image's size in
        // pixels draws it unscaled.
        mSource.set(0, 0, bitmap.getWidth(), bitmap.getHeight());
        mDestination.set(mContentLeft, mContentTop, getWidth() - mContentRight, getHeight() - mContentBottom);
        if (mBitmapNode != null && canvas.isHardwareAccelerated()) {
            drawThroughNode(canvas, mBitmapNode, bitmap);
            return;
        }
        // A software canvas, as a snapshot of the view has, cannot draw a hardware bitmap: it draws a copy, freed
        // once drawn, as such draws are rare.
        boolean copied = !canvas.isHardwareAccelerated() && bitmap.getConfig() == Bitmap.Config.HARDWARE;
        Bitmap drawable = copied ? bitmap.copy(Bitmap.Config.ARGB_8888, false) : bitmap;
        if (drawable == null) {
            return;
        }
        canvas.drawBitmap(drawable, mSource, mDestination, mPaint);
        if (copied) {
            drawable.recycle();
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private void drawThroughNode(@NonNull Canvas canvas, @NonNull RenderNode node, @NonNull Bitmap bitmap) {
        node.setPosition(0, 0, getWidth(), getHeight());
        RecordingCanvas recording = node.beginRecording();
        try {
            recording.drawBitmap(bitmap, mSource, mDestination, mPaint);
        } finally {
            node.endRecording();
        }
        canvas.drawRenderNode(node);
    }
}
