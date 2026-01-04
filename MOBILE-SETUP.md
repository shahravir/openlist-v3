# Mobile App Setup Guide

This guide will help you convert OpenList into native iOS and Android apps using Capacitor.

## Prerequisites

### For iOS Development:
- macOS (required)
- Xcode 14+ (install from App Store)
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Account (for device testing and App Store distribution)

### For Android Development:
- Android Studio (download from [developer.android.com](https://developer.android.com/studio))
- Java Development Kit (JDK) 17 or higher
- Android SDK (installed via Android Studio)
- Set up environment variables:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  export PATH=$PATH:$ANDROID_HOME/tools
  export PATH=$PATH:$ANDROID_HOME/tools/bin
  ```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install Capacitor and all required plugins.

### 2. Initialize Capacitor (First Time Only)

```bash
npx cap init
```

When prompted:
- **App name**: OpenList
- **App ID**: com.openlist.app (or your own reverse domain)
- **Web dir**: dist

### 3. Add iOS Platform

```bash
npx cap add ios
```

### 4. Add Android Platform

```bash
npx cap add android
```

## Development Workflow

### Building and Syncing

1. **Build your web app:**
   ```bash
   npm run build
   ```

2. **Sync with native projects:**
   ```bash
   npm run mobile:sync
   ```
   
   Or use the combined command:
   ```bash
   npm run mobile:build
   ```

### Running on iOS

1. **Open in Xcode:**
   ```bash
   npm run mobile:ios
   ```

2. In Xcode:
   - Select a simulator or connected device
   - Click the "Run" button (▶️) or press `Cmd + R`
   - The app will build and launch

### Running on Android

1. **Open in Android Studio:**
   ```bash
   npm run mobile:android
   ```

2. In Android Studio:
   - Wait for Gradle sync to complete
   - Select an emulator or connected device
   - Click the "Run" button (▶️) or press `Shift + F10`
   - The app will build and launch

## Configuration

### API URL Configuration

**Important**: On mobile devices, `localhost` refers to the device itself, not your development machine. You need to use your computer's local IP address.

#### For Development (Local Server)

1. **Find your local IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or use this command to get just the IP
   ipconfig getifaddr en0  # macOS (WiFi)
   ipconfig getifaddr en1  # macOS (Ethernet)
   ```

   Example output: `192.168.1.100`

2. **Make sure your server is accessible on your network:**
   - Ensure your server is running and bound to `0.0.0.0` (not just `localhost`)
   - Check your firewall allows connections on port 3001
   - Both your computer and mobile device must be on the same network

3. **Build with your local IP:**
   ```bash
   VITE_API_URL=http://192.168.1.100:3001/api npm run build
   npm run mobile:sync
   ```

   Replace `192.168.1.100` with your actual local IP address.

4. **For iOS Simulator:**
   - iOS Simulator can use `localhost` since it runs on your Mac
   - You can use: `VITE_API_URL=http://localhost:3001/api npm run build`

#### For Production

Update `VITE_API_URL` to point to your production server:

```bash
VITE_API_URL=https://your-api-domain.com/api npm run build
npm run mobile:sync
```

#### Troubleshooting Network Issues

**"Network Error" in iOS app:**
1. Verify your server is running: `curl http://YOUR_IP:3001/health`
2. Check your local IP hasn't changed (it can change when reconnecting to WiFi)
3. Ensure both devices are on the same network
4. For iOS Simulator, try using `localhost` instead of IP address
5. Check that your server's CORS settings allow your mobile app's origin

**iOS App Transport Security:**
- The `Info.plist` has been configured to allow HTTP connections for development
- For production, use HTTPS and remove the `NSAllowsArbitraryLoads` setting

### App Icons and Splash Screens

1. **Generate icons and splash screens:**
   - Use [Capacitor Assets](https://capacitorjs.com/docs/guides/splash-screens-and-icons) or
   - Use [cordova-res](https://github.com/ionic-team/cordova-res): `npm install -g cordova-res && cordova-res`

2. **Place assets:**
   - iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Android: `android/app/src/main/res/`

### App Configuration

Edit `capacitor.config.ts` to customize:
- App ID (bundle identifier)
- App name
- Splash screen settings
- Status bar styling
- Server configuration

## Testing

### iOS Testing

1. **Simulator Testing:**
   - Open in Xcode and select a simulator
   - No Apple Developer account needed

2. **Device Testing:**
   - Connect your iPhone via USB
   - In Xcode, select your device
   - You'll need to sign the app (requires Apple Developer account for first-time setup)
   - Trust the developer certificate on your device: Settings → General → VPN & Device Management

### Android Testing

1. **Emulator Testing:**
   - Create an AVD (Android Virtual Device) in Android Studio
   - Select it when running the app

2. **Device Testing:**
   - Enable Developer Options on your Android device
   - Enable USB Debugging
   - Connect via USB
   - Accept the debugging prompt on your device

## Building for Production

### iOS App Store

1. **Archive the app:**
   ```bash
   npm run mobile:ios
   ```
   - In Xcode: Product → Archive
   - Wait for the archive to complete

2. **Distribute:**
   - Click "Distribute App"
   - Choose distribution method (App Store, Ad Hoc, Enterprise, or Development)
   - Follow the prompts to upload to App Store Connect

### Android Play Store

1. **Generate a signed APK/AAB:**
   ```bash
   npm run mobile:android
   ```
   - In Android Studio: Build → Generate Signed Bundle / APK
   - Follow the wizard to create a keystore (first time) or use existing
   - Choose "Android App Bundle" for Play Store or "APK" for direct distribution

2. **Upload to Play Console:**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create a new app or select existing
   - Upload the generated AAB file

## Troubleshooting

### Common Issues

1. **"Web assets not found" error:**
   - Run `npm run build` before syncing
   - Ensure `dist` folder exists and contains built files

2. **iOS build fails:**
   - Run `cd ios && pod install` to install CocoaPods dependencies
   - Clean build folder in Xcode: Product → Clean Build Folder

3. **Android build fails:**
   - Sync Gradle files in Android Studio
   - Check that Android SDK is properly installed
   - Verify `ANDROID_HOME` environment variable

4. **API connection issues:**
   - For iOS: Update `Info.plist` to allow HTTP connections (development only)
   - For Android: Update `AndroidManifest.xml` network security config
   - For production: Use HTTPS endpoints

5. **WebSocket connection issues:**
   - Ensure your server supports WebSocket connections
   - Update server URL in environment configuration
   - Check network security policies for mobile platforms

### Updating Capacitor

```bash
npm update @capacitor/core @capacitor/cli @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar
npx cap sync
```

## Native Features

The app includes these Capacitor plugins:

- **@capacitor/app**: App lifecycle and URL handling
- **@capacitor/haptics**: Haptic feedback for better UX
- **@capacitor/keyboard**: Keyboard management
- **@capacitor/status-bar**: Status bar styling

You can add more plugins as needed:
```bash
npm install @capacitor/camera
npx cap sync
```

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://capacitorjs.com/docs/ios)
- [Android Development Guide](https://capacitorjs.com/docs/android)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

## Next Steps

1. Customize app icons and splash screens
2. Configure app signing for distribution
3. Set up CI/CD for automated builds
4. Add push notifications (optional)
5. Implement deep linking (optional)
6. Add analytics (optional)

