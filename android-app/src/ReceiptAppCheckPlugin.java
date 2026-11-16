package io.github.sytrius.meufluxo;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

@CapacitorPlugin(name = "ReceiptAppCheck")
public class ReceiptAppCheckPlugin extends Plugin {
    private FirebaseAppCheck check;
    private synchronized FirebaseAppCheck instance() {
        if (check == null) {
            check = FirebaseAppCheck.getInstance();
            check.installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance());
            check.setTokenAutoRefreshEnabled(true);
        }
        return check;
    }
    @PluginMethod
    public void getOptions(PluginCall call) {
        try {
            FirebaseOptions options = FirebaseApp.getInstance().getOptions();
            JSObject result = new JSObject();
            result.put("apiKey", options.getApiKey());
            result.put("appId", options.getApplicationId());
            result.put("projectId", options.getProjectId());
            result.put("messagingSenderId", options.getGcmSenderId());
            result.put("storageBucket", options.getStorageBucket());
            call.resolve(result);
        } catch (Exception error) { call.reject("Configuração Firebase Android indisponível.", error); }
    }
    @PluginMethod
    public void getToken(PluginCall call) {
        try {
            instance().getAppCheckToken(false).addOnSuccessListener(token -> {
                JSObject result = new JSObject();
                result.put("token", token.getToken());
                result.put("expireTimeMillis", token.getExpireTimeMillis());
                call.resolve(result);
            }).addOnFailureListener(error -> call.reject("O Play Integrity não autorizou este APK. Confira o registro Android no App Check e a configuração para instalação fora da Play Store.", error));
        } catch (Exception error) { call.reject("App Check Android indisponível.", error); }
    }
}
