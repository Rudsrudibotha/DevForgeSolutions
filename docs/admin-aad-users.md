# Admin dashboard users through Microsoft Entra ID

DevForge / Kinder Care Hub admin dashboard users are not created with local passwords.

## How an admin user is added

1. Add or invite the person in Microsoft Entra ID.
2. Assign the person to the Azure AD application used by the admin dashboard.
3. Add the user's email to the Azure App Service setting:

   ```text
   AZURE_AD_ADMIN_EMAILS=user1@example.com,user2@example.com
   ```

   Or add Microsoft Entra object IDs:

   ```text
   AZURE_AD_ADMIN_OBJECT_IDS=<object-id-1>,<object-id-2>
   ```

4. The user signs in through **Sign in with AAD**.
5. If the AAD token is valid and the email/object ID is allowed, the app automatically provisions the local admin row.

## Notes

- The local admin row is only a session/profile record for the app.
- Password login is not available for the admin dashboard.
- Existing provisioned admins can still be marked inactive inside the admin dashboard to block access without changing database records manually.

