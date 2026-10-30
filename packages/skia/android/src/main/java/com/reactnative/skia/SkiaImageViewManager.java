package com.reactnative.skia;

import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.views.view.ReactViewGroup;
import com.facebook.react.views.view.ReactViewManager;

import androidx.annotation.NonNull;

/**
 * The props reach the view through their @ReactProp setters, ReactViewManager's
 * own (overflow, borders, the border radius) among them, rather than through
 * the codegen delegate, which takes every prop and drops those.
 */
public class SkiaImageViewManager extends ReactViewManager {

    @NonNull
    @Override
    public String getName() {
        return "SkiaImageView";
    }

    @NonNull
    @Override
    public SkiaImageView createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new SkiaImageView(reactContext);
    }

    @ReactProp(name = "presentedImageId")
    public void setPresentedImageId(SkiaImageView view, double value) {
        view.setPresentedImageId((long) value);
    }

    // React drops the view for good: it stops observing its image, whose
    // bitmap the store keeps until JS releases the image.
    @Override
    public void onDropViewInstance(@NonNull ReactViewGroup view) {
        super.onDropViewInstance(view);
        ((SkiaImageView) view).setPresentedImageId(0);
    }
}
