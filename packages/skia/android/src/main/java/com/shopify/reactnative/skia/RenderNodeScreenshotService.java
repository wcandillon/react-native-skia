package com.shopify.reactnative.skia;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.HardwareRenderer;
import android.graphics.PixelFormat;
import android.graphics.RenderNode;
import android.hardware.HardwareBuffer;
import android.media.Image;
import android.media.ImageReader;
import android.os.Build;
import android.util.Log;
import android.view.View;

import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.uimanager.UIManagerHelper;

/**
 * API 29+ snapshot path. Records the view's draw into a RenderNode, then
 * drives a HardwareRenderer connected to an ImageReader Surface so HWUI's
 * own Skia rasterizes the view directly into a HardwareBuffer. The buffer
 * is then materialized to a software Bitmap before any of the HWUI plumbing
 * (HardwareRenderer / ImageReader) is torn down, so its lifetime is fully
 * decoupled from the buffer queue. We trade GPU residency for safety and
 * API parity with the legacy ViewScreenshotService path while still gaining
 * HWUI rendering correctness (shadows, hardware bitmaps, outline clipping).
 */
@RequiresApi(Build.VERSION_CODES.Q)
public class RenderNodeScreenshotService {
    private static final String TAG = "SkiaSnapshotHWUI";

    public static Bitmap makeViewSnapshot(ReactContext context, int tag) {
        UIManager uiManager = UIManagerHelper.getUIManagerForReactTag(context, tag);
        View view;
        try {
            view = uiManager.resolveView(tag);
        } catch (RuntimeException e) {
            context.handleException(e);
            return null;
        }
        if (view == null) {
            return null;
        }
        Bitmap result = snapshot(view);
        if (result != null) {
            Log.i(TAG, "Used HWUI snapshot path for view tag " + tag);
        }
        return result;
    }

    private static Bitmap snapshot(View view) {
        int width = view.getWidth();
        int height = view.getHeight();
        if (width <= 0 || height <= 0) {
            return null;
        }

        RenderNode renderNode = new RenderNode("rn-skia-snapshot");
        renderNode.setPosition(0, 0, width, height);
        Canvas canvas = renderNode.beginRecording(width, height);
        try {
            view.draw(canvas);
        } finally {
            renderNode.endRecording();
        }

        ImageReader reader = ImageReader.newInstance(
                width,
                height,
                PixelFormat.RGBA_8888,
                /* maxImages */ 1,
                HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE
                        | HardwareBuffer.USAGE_GPU_COLOR_OUTPUT);

        HardwareRenderer renderer = new HardwareRenderer();
        try {
            renderer.setSurface(reader.getSurface());
            renderer.setContentRoot(renderNode);

            // HardwareRenderer defaults to zero lighting, which renders
            // elevation shadows invisible. These values mirror the shell
            // defaults used by the system framework.
            float density =
                    view.getResources().getDisplayMetrics().density;
            renderer.setLightSourceGeometry(
                    width / 2f,
                    0f,
                    600f * density,
                    800f * density);
            renderer.setLightSourceAlpha(0.039f, 0.19f);

            int result = renderer.createRenderRequest()
                    .setWaitForPresent(true)
                    .syncAndDraw();
            if (result == HardwareRenderer.SYNC_LOST_SURFACE_REWARD_IF_FOUND
                    || result == HardwareRenderer.SYNC_CONTEXT_IS_STOPPED) {
                Log.w(TAG, "HardwareRenderer.syncAndDraw returned " + result);
                return null;
            }

            Image image = reader.acquireLatestImage();
            if (image == null) {
                Log.w(TAG, "ImageReader produced no image after syncAndDraw");
                return null;
            }
            try {
                HardwareBuffer hwBuffer = image.getHardwareBuffer();
                if (hwBuffer == null) {
                    return null;
                }
                try {
                    Bitmap hwBitmap = Bitmap.wrapHardwareBuffer(hwBuffer, null);
                    if (hwBitmap == null) {
                        Log.w(TAG, "wrapHardwareBuffer returned null");
                        return null;
                    }
                    // Copy into a software bitmap whose pixels are owned by
                    // the JVM heap, fully independent of the HardwareBuffer
                    // queue we are about to tear down below.
                    Bitmap softBitmap =
                            hwBitmap.copy(Bitmap.Config.ARGB_8888, false);
                    hwBitmap.recycle();
                    return softBitmap;
                } finally {
                    hwBuffer.close();
                }
            } finally {
                image.close();
            }
        } finally {
            renderer.destroy();
            renderNode.discardDisplayList();
            reader.close();
        }
    }
}
