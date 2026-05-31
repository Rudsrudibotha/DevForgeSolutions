# iOS Application Plan

## Scope
- iOS app for school dashboard users, teachers, and parents.
- Use the existing API and authentication model.
- Prioritize messaging, attendance, child profile, invoices, consent, and notifications.

## Recommended Build
- React Native or Expo with role-based navigation.
- Shared API client for school, teacher, and parent workflows.
- Push notifications through Apple Push Notification service.
- Secure token storage with iOS Keychain.

## First Release
- Login with existing OAuth/password flows where supported.
- Parent dashboard: children, invoices, attendance, consent, messaging.
- Teacher dashboard: assigned classes, attendance capture, messaging.
- School dashboard: operational summary, parent messages, approvals.

## Production Requirements
- App Store privacy labels.
- Crash and performance monitoring.
- Mobile session timeout and remote logout.
- Attachment upload rules aligned with the web app.
