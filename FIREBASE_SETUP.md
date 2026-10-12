# Firebase setup

The portfolio uses Firebase project `ali-portfolio-4b12e`.

## Provisioned

- Firebase Web app `Ali Portfolio` is registered.
- Email/Password sign-in is enabled.
- The Standard `(default)` Firestore database is in Doha (`me-central1`).
- Firestore security rules and the project query index are deployed.
- `.firebaserc` selects `ali-portfolio-4b12e` by default.
- GitHub Actions repository secrets contain the six Firebase Web app config values. These are browser configuration values and are embedded in the public app at build time; never add a Firebase Admin SDK service account key.

## Remaining setup

1. Add `aliakashi101-tech.github.io` under Firebase Authentication → Settings → Authorized domains. `localhost` is also useful for local development.
2. Under Authentication → Users, create the owner account. In Firestore, create `adminUsers/{UID}` using that account's exact UID and add the Boolean field `enabled: true`. Do not enable public writes to `adminUsers`.
3. Cloud Storage for Firebase requires the Blaze pay-as-you-go plan. If you choose to link a billing account, create the default Storage bucket in the Firebase console, then deploy the included Storage rules with `firebase deploy --only storage`. Usage charges may apply; review current pricing and set budget alerts before enabling billing.
4. Run `npm run dev`, open `/#/admin`, sign in, and choose **Import starter projects** when the projects collection is empty. This publishes the two existing portfolio cards to Firestore.
5. Push changes to `main` to rebuild and deploy the public site. The six GitHub Actions secrets already match `.env.example`.

Project documents use `name_en`, `name_ar`, `description_en`, `description_ar`, `tags_en`, `tags_ar`, `image`, `photos`, `view_order`, `app_store`, `google_play`, `google_drive`, `website`, matching `*_visible` booleans, `app_installs`, localized collaboration label/description fields, `hidden`, and `legacy`.
