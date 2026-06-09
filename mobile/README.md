# TikTok Map — Mobile App

React Native (Expo) mobile app for iOS and Android.

## Setup

1. Install dependencies:
   ```
   cd mobile
   npm install
   ```

2. Set your Railway URL in `config.js`:
   ```js
   export const API_BASE = 'https://YOUR-APP.up.railway.app';
   ```

3. Install Expo Go on your phone (App Store / Google Play)

4. Start the dev server:
   ```
   npm start
   ```

5. Scan the QR code with your phone camera (iOS) or the Expo Go app (Android)

## Building for App Store / Google Play

```
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```
