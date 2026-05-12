import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khanago.customer',
  appName: 'Order Kro',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Ensures WebView draws behind system bars so env(safe-area-inset-*) returns correct values
    edgeToEdge: true
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
      overlaysWebView: false  // status bar does NOT overlap content — content starts below it
    }
  }
};

export default config;
