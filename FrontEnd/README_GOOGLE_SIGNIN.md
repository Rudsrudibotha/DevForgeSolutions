# Google Sign-In Setup Instructions

## 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API and Google Sign-In API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"

## 2. Android Configuration

1. Create OAuth client ID for Android:
   - Application type: Android
   - Package name: `com.devforge.solutions.school_management_app`
   - SHA-1 certificate fingerprint: Get from `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`

2. Create OAuth client ID for Web:
   - Application type: Web application
   - Copy the client ID

3. Update `android/app/src/main/res/values/strings.xml`:
   - Replace `YOUR_GOOGLE_OAUTH_CLIENT_ID` with your web client ID

## 3. iOS Configuration (if needed)

1. Create OAuth client ID for iOS:
   - Application type: iOS
   - Bundle ID: `com.devforge.solutions.schoolManagementApp`

2. Download `GoogleService-Info.plist` and add to `ios/Runner/`

## 4. Dependencies Added

- `google_sign_in: ^6.2.1` in pubspec.yaml

## 5. Files Created/Modified

- `lib/services/google_auth_service.dart` - Google Sign-In service
- `lib/features/auth/presentation/bloc/auth_bloc.dart` - Updated with Google Sign-In
- `lib/features/auth/presentation/pages/login_page.dart` - Added Google Sign-In button
- `android/app/src/main/res/values/strings.xml` - Android configuration

## 6. Usage

The login page now includes:
- Traditional email/password login
- Google Sign-In button
- Proper loading states and error handling

## 7. Backend Integration

The Google Sign-In returns user account information that should be sent to your backend for:
- User verification
- Account creation/linking
- JWT token generation
- School association