package com.reactnative.skia;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;

/** onLayoutSize: the size a SkiaView is laid out at, in points. */
final class LayoutSizeEvent extends Event<LayoutSizeEvent> {
    static final String EVENT_NAME = "topLayoutSize";
    static final String REGISTRATION_NAME = "onLayoutSize";

    private final float mWidth;
    private final float mHeight;

    LayoutSizeEvent(int surfaceId, int viewTag, float width, float height) {
        super(surfaceId, viewTag);
        mWidth = width;
        mHeight = height;
    }

    @Override
    public String getEventName() {
        return EVENT_NAME;
    }

    @Nullable
    @Override
    protected WritableMap getEventData() {
        WritableMap data = Arguments.createMap();
        data.putDouble("width", mWidth);
        data.putDouble("height", mHeight);
        return data;
    }
}
