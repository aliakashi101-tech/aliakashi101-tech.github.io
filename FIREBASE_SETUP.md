# Firebase setup

The portfolio uses Firebase project `ali-portfolio-4b12e`.

## Provisioned

- Firebase Web app `Ali Portfolio` is registered.
- Email/Password sign-in is enabled.
- The Standard `(default)` Firestore database is in Doha (`me-central1`).
- Firestore security rules and indexes for editable sections, products, and visitor analytics are deployed.
- The owner admin account is enabled in `adminUsers`.
- `.firebaserc` selects `ali-portfolio-4b12e` by default.
- GitHub Actions repository secrets contain the six Firebase Web app config values. These are browser configuration values and are embedded in the public app at build time; never add a Firebase Admin SDK service account key.

## Remaining setup

1. Cloud Storage for Firebase requires the Blaze pay-as-you-go plan. In Firebase Console → Build → Storage, click **Get started**, choose the bucket location, then deploy `storage.rules` with `firebase deploy --only storage`. Linking billing can incur charges; review pricing and set budget alerts first. [Firebase Storage setup guide](https://firebase.google.com/docs/storage/web/start)
2. Run `npm run dev`, open `/#/admin`, and sign in. The Projects section offers **Import current projects** to add Ali’s two existing project cards to Firestore.
3. Push changes to `main` to rebuild and deploy the public site. The six GitHub Actions secrets already match `.env.example`.

The admin workspace includes profile, about, experience, products, projects, skills, contact, settings, visitor analytics, and CV generation. Editable public content is stored in `site_content`; experience and product entries are stored in their own collections. Analytics events include a 90-day expiry timestamp; configure a Firestore TTL policy on `analytics_events.expiresAt` if you want Firestore to delete expired records automatically.

Project documents use `name_en`, `name_ar`, `description_en`, `description_ar`, `tags_en`, `tags_ar`, `image`, `photos`, `view_order`, `app_store`, `google_play`, `google_drive`, `website`, matching `*_visible` booleans, `app_installs`, localized collaboration label/description fields, `hidden`, and `legacy`.
