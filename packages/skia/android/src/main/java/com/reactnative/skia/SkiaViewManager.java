package com.reactnative.skia;

import com.facebook.react.uimanager.PointerEvents;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewProps;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.viewmanagers.SkiaViewManagerDelegate;
import com.facebook.react.viewmanagers.SkiaViewManagerInterface;
import com.facebook.react.views.view.ReactViewGroup;
import com.facebook.react.views.view.ReactViewManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public class SkiaViewManager extends ReactViewManager implements SkiaViewManagerInterface<SkiaView> {

    protected SkiaViewManagerDelegate mDelegate;

    SkiaViewManager() {
        mDelegate = new SkiaViewManagerDelegate(this);
    }

    protected SkiaViewManagerDelegate getDelegate() {
        return mDelegate;
    }

    @NonNull
    @Override
    public String getName() {
        return "SkiaView";
    }

    @NonNull
    @Override
    public SkiaView createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new SkiaView(reactContext);
    }

    @Override
    public void setNativeId(@NonNull ReactViewGroup view, @Nullable String nativeId) {
        super.setNativeId(view, nativeId);
        int nativeIdResolved = Integer.parseInt(nativeId);
        ((SkiaView) view).registerView(nativeIdResolved);
    }

    @ReactProp(name = "opaque")
    public void setOpaque(SkiaView view, boolean value) {
        view.setOpaque(value);
    }

    @ReactProp(name = "highBitDepth")
    public void setHighBitDepth(SkiaView view, boolean value) {
        view.setHighBitDepth(value);
    }

    @ReactProp(name = "androidSurfaceType")
    public void setAndroidSurfaceType(SkiaView view, @Nullable String value) {
        view.setSurfaceType(value);
    }

    @ReactProp(name = "androidZOrderOnTop")
    public void setAndroidZOrderOnTop(SkiaView view, boolean value) {
        view.setZOrderOnTop(value);
    }

    @ReactProp(name = ViewProps.POINTER_EVENTS)
    public void setPointerEvents(SkiaView view, @Nullable String pointerEventsStr) {
        view.setPointerEvents(PointerEvents.parsePointerEvents(pointerEventsStr));
    }

    // The backing view depends on several props (opaque, androidSurfaceType,
    // androidZOrderOnTop, highBitDepth), so it is resolved once per transaction
    // rather than in each setter.
    @Override
    protected void onAfterUpdateTransaction(@NonNull ReactViewGroup view) {
        super.onAfterUpdateTransaction(view);
        ((SkiaView) view).updateView();
    }

    @Override
    public void onDropViewInstance(@NonNull ReactViewGroup view) {
        super.onDropViewInstance(view);
        ((SkiaView) view).dropInstance();
    }
}
