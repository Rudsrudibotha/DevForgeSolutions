# Android Application Plan

## Scope
- Android app for school dashboard users, teachers, and parents.
- Use the same API contracts as the web app and planned iOS app.
- Prioritize messaging, attendance, child profile, invoices, consent, and notifications.

## Recommended Build
- React Native or Expo with shared screens where practical.
- Role-based navigation for school, teacher, and parent users.
- Push notifications through Firebase Cloud Messaging.
- Secure token storage with Android Keystore.

## First Release
- Login with existing OAuth/password flows where supported.
- Parent dashboard: children, invoices, attendance, consent, messaging.
- Teacher dashboard: assigned classes, attendance capture, messaging.
- School dashboard: operational summary, parent messages, approvals.

## Production Requirements
- Play Store privacy declarations.
- Crash and performance monitoring.
- Mobile session timeout and remote logout.
- Attachment upload rules aligned with the web app.
