# Firebase setup

The public portfolio works with the two bundled starter projects until Firebase is configured. The admin page requires a Firebase project that you own.

1. Create a Firebase project and register a Web app. Enable **Authentication → Email/Password**, create a Firestore database, and enable Storage. Add `aliakashi101-tech.github.io` and `localhost` under Authentication's authorized domains.
2. Copy `.env.example` to `.env.local` and fill in the Web app's six `VITE_FIREBASE_*` values. These are browser app configuration values; never put a Firebase Admin SDK service account key in this repository.
3. Install the Firebase CLI and deploy the included Firestore rules, project query index, and Storage rules: `firebase deploy --only firestore,storage`.
4. In Firebase Authentication, add the owner account with a strong password. Copy the account's UID. In Firestore, create `adminUsers/{UID}` with the Boolean field `enabled: true`. Do not enable public writes to `adminUsers`.
5. Start locally with `npm run dev`, open `/#/admin`, and sign in. If the projects collection is empty, choose **Import starter projects** to publish the two existing portfolio cards into Firestore.
6. GitHub confirmed the current private repository is not eligible for Pages on its connected plan. To publish at `aliakashi101-tech.github.io`, either use a GitHub plan that supports Pages for private repositories (keeps the source private) or make the repository public (exposes its source, history, and files). After resolving that, add the six values as GitHub Actions repository secrets with the same names as in `.env.example`, and set Pages to deploy from **GitHub Actions**. Each secret is embedded into the public browser bundle at build time; Firebase rules and Authentication provide access control, not secrecy of the web config.

The project records use `name_en`, `name_ar`, `description_en`, `description_ar`, `tags_en`, `tags_ar`, `image`, `photos`, `view_order`, `app_store`, `google_play`, `google_drive`, `website`, matching `*_visible` booleans, `app_installs`, localized collaboration label/description fields, `hidden`, and `legacy`.
