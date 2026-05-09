import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khanago.customer',
  appName: 'Order Kro',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
