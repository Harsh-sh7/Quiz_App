---
description: Setup Firebase for Android Push Notifications in Expo
---

# Setting up Firebase Cloud Messaging (FCM) for Android Builds

To receive physical push notifications on your Android APK/AAB build, you **must** configure Firebase.

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the setup steps.

## Step 2: Add an Android App
1. In your Firebase project overview, click the **Android icon** to add an app.
2. **Android package name**: Enter `com.harshit.quizie` (matches your `app.json`).
3. Click **Register app**.
4. **Download config file**: Download `google-services.json`.
5. **Move the file**: Place `google-services.json` inside your `app` folder (same level as `app.json`).

## Step 3: Update app.json
Ensure your `app.json` links to the file:
```json
"android": {
  "package": "com.harshit.quizie",
  "googleServicesFile": "./google-services.json"
}
```

## Step 4: Upload Server Key to Expo
1. In Firebase Console, go to **Project settings** > **Cloud Messaging**.
2. Copy the **Server key** (if you don't see one, enable "Cloud Messaging API (Legacy)" in Google Cloud Console).
3. Run this command in your terminal:
   ```bash
   eas credentials
   ```
4. Select **Android** > **Push Notifications: Setup/Update**.
5. Paste your **FCM Server Key**.

## Step 5: Rebuild
Rebuild your app to include the configuration:
```bash
eas build --platform android --profile preview
```

Once installed, your physical notifications will work!
