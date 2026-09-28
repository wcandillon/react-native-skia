package com.reactnative.skia;

import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.viewmanagers.SkiaPictureViewManagerDelegate;
import com.facebook.react.viewmanagers.SkiaPictureViewManagerInterface;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public class SkiaPictureViewManager extends SkiaBaseViewManager<SkiaPictureView> implements SkiaPictureViewManagerInterface<SkiaPictureView> {


    protected SkiaPictureViewManagerDelegate mDelegate;

    SkiaPictureViewManager() {
        mDelegate = new SkiaPictureViewManagerDelegate(this);
    }

    protected SkiaPictureViewManagerDelegate getDelegate() {
        return mDelegate;
    }

    @NonNull
    @Override
    public String getName() {
        return "SkiaPictureView";
    }

    @NonNull
    @Override
    public SkiaPictureView createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new SkiaPictureView(reactContext);
    }

    @Override
    public void setColorSpace(SkiaPictureView view, @Nullable String value) {
        // nothing to do here at the moment
    }

    @Override
    public void setAndroidWarmup(SkiaPictureView view, boolean value) {
        view.setAndroidWarmup(value);
    }
}
