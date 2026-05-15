package com.khanago.customer;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Intercept back button at the native level — post a custom DOM event
        // to the WebView so Angular can handle navigation and the exit toast.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().post(() ->
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('androidBackButton'));",
                        null
                    )
                );
            }
        });
    }
}
