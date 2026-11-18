package io.github.sytrius.meufluxo;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Rect;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebView;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

@CapacitorPlugin(name = "HomeAds")
public class HomeAdsPlugin extends Plugin {
    private static final String DEMO_BANNER = "ca-app-pub-3940256099942544/6300978111";
    private ConsentInformation consent;
    private String unitId;
    private AdView banner;
    private Slot slot;
    private boolean consentStarted;
    private boolean initializing;
    private boolean initialized;
    private boolean loaded;
    private boolean unavailable;
    private boolean paused;
    private boolean destroyed;

    private record Slot(double x, double y, double width, double height, double viewport) {}

    @Override
    public void load() {
        try {
            Bundle data = getContext().getPackageManager()
                .getApplicationInfo(getContext().getPackageName(), PackageManager.GET_META_DATA).metaData;
            unitId = data.getString("io.github.sytrius.meufluxo.BANNER_AD_UNIT");
            consent = UserMessagingPlatform.getConsentInformation(getContext());
        } catch (Exception error) {
            unavailable = true;
        }
    }

    @PluginMethod
    public void setSlot(PluginCall call) {
        Double x = call.getDouble("x"), y = call.getDouble("y");
        Double width = call.getDouble("width"), height = call.getDouble("height");
        Double viewport = call.getDouble("viewport");
        getActivity().runOnUiThread(() -> {
            boolean visible = Boolean.TRUE.equals(call.getBoolean("visible", false));
            boolean valid = x != null && y != null && width != null && height != null && viewport != null
                && x >= 0 && y >= 0 && width >= 320 && height >= 50 && viewport >= width && x + width <= viewport + 1;
            slot = visible && valid ? new Slot(x, y, width, height, viewport) : null;
            if (slot == null || paused || destroyed) {
                refreshPosition();
            } else if (unavailable || unitId == null || consent == null) {
                reportUnavailable();
            } else {
                startIfNeeded();
                refreshPosition();
            }
            call.resolve();
        });
    }

    private void startIfNeeded() {
        if (DEMO_BANNER.equals(unitId)) {
            initializeAds();
            return;
        }
        if (consentStarted) {
            if (consent.canRequestAds()) initializeAds();
            return;
        }
        consentStarted = true;
        Activity activity = getActivity();
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> afterConsent()),
            error -> afterConsent());
    }

    private void afterConsent() {
        if (destroyed) return;
        if (consent.canRequestAds()) initializeAds();
        else reportUnavailable();
    }

    private void initializeAds() {
        if (initializing || destroyed || paused || slot == null) return;
        if (initialized) {
            if (banner == null) loadBanner();
            return;
        }
        initializing = true;
        new Thread(() -> {
            try {
                MobileAds.initialize(getContext().getApplicationContext(), status -> getActivity().runOnUiThread(() -> {
                    initializing = false;
                    initialized = true;
                    if (!destroyed && !paused && slot != null && (DEMO_BANNER.equals(unitId) || consent.canRequestAds())) loadBanner();
                }));
            } catch (RuntimeException error) {
                getActivity().runOnUiThread(this::reportUnavailable);
            }
        }, "meu-fluxo-ads-init").start();
    }

    private void loadBanner() {
        if (banner != null) return;
        if (!(getBridge().getWebView().getParent() instanceof CoordinatorLayout host)) {
            reportUnavailable();
            return;
        }
        AdView view = new AdView(getActivity());
        banner = view;
        view.setVisibility(View.INVISIBLE);
        view.setAdSize(AdSize.BANNER);
        view.setAdUnitId(unitId);
        view.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                if (banner != view || destroyed) return;
                loaded = true;
                refreshPosition();
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                if (banner == view && !loaded && !destroyed) reportUnavailable();
            }
        });
        host.addView(view, new CoordinatorLayout.LayoutParams(
            AdSize.BANNER.getWidthInPixels(getContext()), AdSize.BANNER.getHeightInPixels(getContext())));
        Bundle extras = new Bundle();
        extras.putString("npa", "1");
        try {
            view.loadAd(new AdRequest.Builder().addNetworkExtrasBundle(AdMobAdapter.class, extras).build());
        } catch (RuntimeException error) {
            destroyBanner();
            reportUnavailable();
        }
    }

    private void refreshPosition() {
        if (banner == null) return;
        if (slot == null || !loaded || unavailable || paused || destroyed) {
            banner.setVisibility(View.INVISIBLE);
            return;
        }
        WebView web = getBridge().getWebView();
        View host = (View) web.getParent();
        int[] start = new int[2], container = new int[2];
        web.getLocationInWindow(start);
        host.getLocationInWindow(container);
        double scale = (double) web.getWidth() / slot.viewport();
        int availableWidth = (int) Math.round(slot.width() * scale);
        int availableHeight = (int) Math.round(slot.height() * scale);
        int width = AdSize.BANNER.getWidthInPixels(getContext());
        int height = AdSize.BANNER.getHeightInPixels(getContext());
        int top = (int) Math.round(slot.y() * scale);
        if (availableWidth < width || availableHeight < height || top + availableHeight > web.getHeight() + 2) {
            banner.setVisibility(View.INVISIBLE);
            return;
        }
        int left = start[0] - container[0] - host.getPaddingLeft()
            + (int) Math.round(slot.x() * scale) + (availableWidth - width) / 2;
        int offset = start[1] - container[1] - host.getPaddingTop() + top + (availableHeight - height) / 2;
        CoordinatorLayout.LayoutParams layout = (CoordinatorLayout.LayoutParams) banner.getLayoutParams();
        layout.gravity = Gravity.TOP | Gravity.LEFT;
        layout.leftMargin = left;
        layout.topMargin = offset;
        banner.setLayoutParams(layout);
        banner.setVisibility(View.VISIBLE);
    }

    private void reportUnavailable() {
        unavailable = true;
        refreshPosition();
        notifyListeners("bannerUnavailable", new JSObject());
    }

    @PluginMethod
    public void openPrivacy(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            if (DEMO_BANNER.equals(unitId)) {
                result.put("status", "test");
                call.resolve(result);
            } else if (consent == null || consent.getPrivacyOptionsRequirementStatus()
                       != ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) {
                result.put("status", "notRequired");
                call.resolve(result);
            } else {
                UserMessagingPlatform.showPrivacyOptionsForm(getActivity(), error -> {
                    if (error != null) {
                        call.reject("Não foi possível abrir as opções de privacidade dos anúncios.");
                        return;
                    }
                    destroyBanner();
                    unavailable = !consent.canRequestAds();
                    if (!unavailable) initializeAds();
                    notifyListeners("privacyUpdated", new JSObject().put("allowed", !unavailable));
                    call.resolve();
                });
            }
        });
    }

    @Override
    protected void handleOnPause() {
        paused = true;
        refreshPosition();
        if (banner != null) banner.pause();
    }

    @Override
    protected void handleOnResume() {
        paused = false;
        if (banner != null) banner.resume();
        if (slot != null && !unavailable) startIfNeeded();
        refreshPosition();
    }

    @Override
    protected void handleOnDestroy() {
        destroyed = true;
        destroyBanner();
    }

    private void destroyBanner() {
        if (banner == null) return;
        if (banner.getParent() instanceof CoordinatorLayout host) host.removeView(banner);
        banner.destroy();
        banner = null;
        loaded = false;
    }
}
