# FamPass Website — Developer Handoff

## GitHub Repository
- **Repo:** https://github.com/justinlin15/ParentGuide
- The website files are in the `/website` directory
- Clone: `git clone https://github.com/justinlin15/ParentGuide.git`

## Firebase Project
- **Project ID:** fampass-3bb49
- **Console:** https://console.firebase.google.com/project/fampass-3bb49
- **Hosting URLs:**
  - https://fampass.io (custom domain)
  - https://fampass-3bb49.web.app (default)
  - https://fampass-3bb49.firebaseapp.com (default)

## Firebase Config (already in code)
```
apiKey: AIzaSyB7WTKmWkppW-yXYn5ScCf0rIoF4VHKvw4
authDomain: fampass-3bb49.firebaseapp.com
projectId: fampass-3bb49
storageBucket: fampass-3bb49.firebasestorage.app
messagingSenderId: 219668843017
appId: 1:219668843017:web:23c0b193cec3c62e91c6d8
measurementId: G-CV57P29T7D
```

## Admin Login (Firebase Auth)
- **URL:** https://fampass.io/admin/
- **Email:** dev@fampass.io
- **Password:** (shared separately)

## Domain Registrar
- **GoDaddy:** https://dcc.godaddy.com/control/dnsmanagement?domainName=fampass.io
- DNS is pointed to Firebase Hosting:
  - A record → 199.36.158.100
  - TXT record → hosting-site=fampass-3bb49

## Local Development & Deployment
```bash
# 1. Clone the repo
git clone https://github.com/justinlin15/ParentGuide.git
cd ParentGuide/website

# 2. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 3. Log in to Firebase (needs project access)
firebase login

# 4. Deploy
firebase deploy --only hosting
```

## Project Structure
```
website/
├── index.html            — Homepage
├── about.html            — About page
├── support.html          — Support page
├── privacy-policy.html   — Privacy Policy
├── terms-of-service.html — Terms of Service
├── admin/index.html      — Admin dashboard (blog, feedback)
├── blog/index.html       — Blog listing & posts
├── resources/index.html  — Resources page
├── css/style.css         — All styles (CSS variables at top)
├── js/
│   ├── nav.js            — Shared header/footer
│   ├── firebase-config.js — Firebase initialization
│   ├── blog.js           — Blog functionality
│   └── admin.js          — Admin panel logic
├── assets/images/        — Logo, screenshots
├── firebase.json         — Hosting config
└── .firebaserc           — Project binding
```

## Services Used
| Service | Provider | Plan |
|---------|----------|------|
| Hosting | Firebase Hosting | Spark (free) |
| Database | Cloud Firestore | Spark (free) |
| Auth | Firebase Email/Password | Spark (free) |
| Domain | GoDaddy | fampass.io |
| Analytics | Google Analytics | G-CV57P29T7D |

## Color Scheme (CSS Variables)
```css
--color-primary: #D4727E     /* coral pink */
--color-primary-dark: #C25E6A
--color-primary-light: #E8A0A8
--color-bg-light: #FDF0F0    /* light pink background */
--color-text: #2D3436        /* dark neutral */
--color-footer-bg: #3D2A2E   /* dark warm footer */
```

## Notes
- The website is pure HTML/CSS/JS — no build step required
- Header and footer are injected via `js/nav.js` (shared across all pages)
- Blog posts and feedback are stored in Firestore
- The iOS app is in the `/ParentGuide` directory (Xcode project, separate from the website)
