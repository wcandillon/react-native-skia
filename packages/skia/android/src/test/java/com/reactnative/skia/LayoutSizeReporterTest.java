package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class LayoutSizeReporterTest {
    private final List<String> mReports = new ArrayList<>();
    private final LayoutSizeReporter mReporter =
            new LayoutSizeReporter((width, height) -> mReports.add(width + "x" + height));

    private List<String> takeReports() {
        List<String> taken = new ArrayList<>(mReports);
        mReports.clear();
        return taken;
    }

    @Test
    public void reportsNothingUntilAsked() {
        mReporter.onLayout(48f, 89f);
        mReporter.onLayout(60f, 89f);
        assertEquals(Arrays.asList(), takeReports());
    }

    @Test
    public void reportsTheSizeTheViewHasWhenAsked() {
        mReporter.onLayout(48f, 89f);
        mReporter.setReporting(true);
        assertEquals(Arrays.asList("48.0x89.0"), takeReports());
    }

    @Test
    public void reportsTheFirstLayoutWhenAskedBeforeIt() {
        mReporter.setReporting(true);
        assertEquals(Arrays.asList(), takeReports());

        mReporter.onLayout(48f, 89f);
        assertEquals(Arrays.asList("48.0x89.0"), takeReports());
    }

    @Test
    public void reportsEachChangeOfSizeOnce() {
        mReporter.setReporting(true);
        mReporter.onLayout(48f, 89f);
        mReporter.onLayout(48f, 89f);
        mReporter.onLayout(60f, 89f);
        mReporter.setReporting(true);
        assertEquals(Arrays.asList("48.0x89.0", "60.0x89.0"), takeReports());
    }

    @Test
    public void reportsAFractionalSize() {
        mReporter.setReporting(true);
        mReporter.onLayout(102.333336f, 72.666664f);
        mReporter.onLayout(102.333336f, 72.666664f);
        assertEquals(Arrays.asList("102.333336x72.666664"), takeReports());
    }

    @Test
    public void reportsAnEmptyLayout() {
        mReporter.setReporting(true);
        mReporter.onLayout(48f, 89f);
        mReporter.onLayout(0f, 0f);
        assertEquals(Arrays.asList("48.0x89.0", "0.0x0.0"), takeReports());
    }

    @Test
    public void reportsAnUnchangedSizeAgainWhenAskedAgain() {
        mReporter.setReporting(true);
        mReporter.onLayout(48f, 89f);
        mReporter.setReporting(false);
        mReporter.setReporting(true);
        assertEquals(Arrays.asList("48.0x89.0", "48.0x89.0"), takeReports());
    }

    @Test
    public void reportsTheCurrentSizeAgainWhenAskedAgain() {
        mReporter.setReporting(true);
        mReporter.onLayout(48f, 89f);
        mReporter.setReporting(false);
        mReporter.onLayout(60f, 89f);
        assertEquals(Arrays.asList("48.0x89.0"), takeReports());

        mReporter.setReporting(true);
        assertEquals(Arrays.asList("60.0x89.0"), takeReports());
    }
}
