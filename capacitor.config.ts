import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.favorite.gom',
  appName: '곰브릭',
  webDir: 'www',
  server: {
    url: 'https://gom.favorite.kr',
    cleartext: false
  },
  ios: {
    contentInset: 'never'
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false
      }
    }
  }
};

export default config;
