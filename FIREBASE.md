# Firebase setup — HIRA course registration

This app now runs on Firebase (Authentication, Cloud Firestore, Storage, Hosting).
The old PHP + MySQL backend is no longer used by the frontend.

## 1. One-time Firebase Console setup

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Authentication** → Users → **Add user**: create the office account
   (e.g. `admin@yourschool.com`) with a strong password.
4. **Firestore Database** → Create database (Production mode).
5. **Storage** → Get started (Production mode).
6. Project settings → **Your apps** → add a **Web app**, copy the config object.

## 2. Fill in the three placeholders

| File | Replace |
|------|---------|
| `assets/js/firebase-config.js` | the `FIREBASE_CONFIG` object + `ADMIN_EMAIL` |
| `firestore.rules` | `ADMIN_EMAIL_PLACEHOLDER` → the admin e-mail |
| `storage.rules` | `ADMIN_EMAIL_PLACEHOLDER` → the admin e-mail |
| `.firebaserc` | `YOUR_PROJECT_ID` → your project id |

`ADMIN_EMAIL` and the two rules e-mails must be identical, and must match the
account you created in step 3. The dashboard login still uses the username
`admin` — it is mapped to `ADMIN_EMAIL` behind the scenes.

The Firebase `apiKey` is **not** a secret; it is meant to live in the browser.
No password or private key is stored in any frontend file.

## 3. Run locally

```bash
npm install -g firebase-tools     # one time
firebase login                    # one time
firebase use YOUR_PROJECT_ID
firebase emulators:start          # Auth + Firestore + Storage + Hosting locally
# open the printed Hosting URL (usually http://localhost:5000)
```

Or just open `index.html` through any static server once the config is filled in.

## 4. Deploy

```bash
firebase deploy --only firestore:rules,storage:rules   # push security rules first
firebase deploy --only hosting                         # publish the site
# or everything at once:
firebase deploy
```

## 5. Old PHP files (safe to delete once Firebase is verified)

Kept for reference; **not** used by the frontend anymore and **not** deployed
(they are in `firebase.json` → `hosting.ignore`):

```
api/            bin/            database/       storage/photos/
*.php           .env            .env.example    .htaccess
```

## Data model

`applications/{autoId}`:
`applicationNo, fullName, fatherName, dob, gender, mobile, whatsapp, email,
address, qualification, course, knowledge, message, photoPath, status, note,
createdAt, updatedAt`. Photos: `applications/{autoId}/photo.jpg` in Storage.
