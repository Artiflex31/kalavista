# KalaVista

A digital gallery and commission platform for an independent artist. Visitors can explore artwork, read the story behind each piece, buy available works, and request a custom commission. The artist manages the catalogue, enquiries, payments and deliveries from a protected dashboard.

> Planning documents: [Project brief](docs/PROJECT_BRIEF.md) · [Roadmap](docs/ROADMAP.md)

## Features

**Public site**

- Exhibition-style home page with an interactive hero (Three.js and a water-ripple effect)
- Gallery and artwork detail pages with story, medium, dimensions and availability
- Commission enquiry form, with a private tracking page for each commission
- Direct purchase of available works with Razorpay checkout and order tracking
- Commission payments: an advance (or full payment) and a final payment

**Artist dashboard**

- Admin sign-in (JWT, `ADMIN` role)
- Artwork create / edit / delete with Cloudinary image upload
- Enquiry review: status, progress stages and quotes
- Order management with courier and delivery tracking
- Email notifications through Resend

## Tech stack

| Layer    | Tools                                                                |
| -------- | -------------------------------------------------------------------- |
| Web      | React 19, Vite, React Router 7, Motion, Three.js / react-three-fiber |
| API      | Node.js, Express 5, Zod validation, JWT, bcryptjs, Multer            |
| Database | PostgreSQL with Prisma 7 (`@prisma/adapter-pg`)                      |
| Services | Cloudinary (images), Razorpay (payments), Resend (email)             |
| Tooling  | ESLint, Prettier                                                     |

## Architecture

```
Browser (React + Vite, :5173)
        │  fetch  (VITE_API_URL)
        ▼
Express API (:5000)  ──►  PostgreSQL (Prisma)
   │   │   │
   │   │   └──►  Resend      (transactional email)
   │   └──────►  Cloudinary  (artwork images)
   └──────────►  Razorpay    (orders, payments)
                     │
                     └── webhook ──► POST /api/webhooks/razorpay
```

**Folder structure**

```
.
├── src/                  React app
│   ├── pages/            Routed pages (gallery, checkout, status, admin, ...)
│   ├── components/       Shared UI and admin components
│   └── data/             Local fallback artwork data
├── server/
│   ├── prisma/           schema.prisma, migrations, seed and admin scripts
│   └── src/
│       ├── routes/       artworks, auth, commission-*, orders, webhook
│       ├── lib/          prisma, cloudinary, razorpay, email helpers
│       └── middleware/   requireAdmin (JWT + role check)
└── docs/                 Project brief and roadmap
```

**API overview** (all under `/api`)

| Area                   | Access                      | Purpose                                            |
| ---------------------- | --------------------------- | -------------------------------------------------- |
| `artworks`             | public read, admin write    | List / view artworks; create, edit, delete, upload |
| `auth`                 | public login, admin `/me`   | Admin sign-in                                      |
| `commission-enquiries` | public create, admin manage | Enquiries, status, progress, quotes                |
| `commission-tracking`  | public (privacy-safe)       | Client-facing commission progress                  |
| `commission-payments`  | public by reference, admin  | Advance and final commission payments              |
| `orders`               | public by reference, admin  | Artwork orders, payment verification, delivery     |
| `webhooks/razorpay`    | Razorpay only (signed)      | Idempotent handling of `payment.captured`          |

## Getting started

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (local, Neon, Supabase, etc.)
- Accounts for Cloudinary, Razorpay (test mode is fine) and Resend

### 1. Install dependencies

```bash
npm install
cd server
npm install
cd ..
```

### 2. Configure environment variables

Create two files and fill them in using the tables in the next section:

- `.env` in the project root (web app)
- `server/.env` (API)

Never commit real keys.

### 3. Set up the database

Run these from the `server/` folder:

```bash
cd server
npx prisma migrate dev --config prisma7.config.ts   # creates tables
npm run db:seed             # loads sample artworks
node prisma/create-admin.js # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
cd ..
```

> `db:seed` upserts by slug, so re-running it overwrites changes made in the dashboard to the seeded artworks.

### 4. Run the app

The web app and the API run as two separate processes on separate ports. Open two terminals.

**Terminal 1: API (port 5000)**

```bash
cd server
npm run dev
```

**Terminal 2: Web (port 5173)**

```bash
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:5000

To use different ports, set `PORT` in `server/.env`, update `CLIENT_URL` (CORS) and `VITE_API_URL` to match, and start Vite with `npm run dev -- --port <port>`. Restart both after changing env files.

- Admin login: http://localhost:5173/admin/login (dashboard at `/admin`)

### Windows note (`npm` not recognised in PowerShell)

In VS Code's default PowerShell terminal, `npm` can fail with an error about scripts being disabled, while `npm.cmd` works. Pick one fix:

- **Use `npm.cmd`** in place of `npm` for every command in this README (for example `npm.cmd install`, `npm.cmd run dev`).
- **Allow scripts for your user** (one-time, recommended). Run this in PowerShell, then restart the terminal:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
- **Use another terminal** in VS Code, such as Command Prompt or Git Bash (the dropdown next to the `+` in the terminal panel).

`npx` can have the same problem, so use `npx.cmd` if needed.

### Testing payments locally

Use Razorpay **test** keys. Razorpay cannot reach `localhost`, so to test the webhook, expose the API with a tunnel (for example ngrok) and register `https://<your-tunnel>/api/webhooks/razorpay` for the `payment.captured` event in the Razorpay dashboard. Put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`.

## Environment variables

**Web (`.env`)**

| Variable       | Description                             | Example                 |
| -------------- | --------------------------------------- | ----------------------- |
| `VITE_API_URL` | Base URL of the API (no trailing slash) | `http://localhost:5000` |

**API (`server/.env`)**

| Variable                  | Required | Description                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------- |
| `PORT`                    | no       | API port, defaults to `5000`                                     |
| `CLIENT_URL`              | yes      | Web app origin, used for CORS and links in emails                |
| `DATABASE_URL`            | yes      | PostgreSQL connection string used by the API                     |
| `DIRECT_URL`              | yes      | Direct (non-pooled) connection string for migrations and seeding |
| `JWT_SECRET`              | yes      | Long random string used to sign admin tokens                     |
| `ADMIN_EMAIL`             | setup    | Email for the admin created by `create-admin.js`                 |
| `ADMIN_PASSWORD`          | setup    | Password for that admin                                          |
| `CLOUDINARY_CLOUD_NAME`   | yes      | Cloudinary cloud name                                            |
| `CLOUDINARY_API_KEY`      | yes      | Cloudinary API key                                               |
| `CLOUDINARY_API_SECRET`   | yes      | Cloudinary API secret                                            |
| `RAZORPAY_KEY_ID`         | yes      | Razorpay key id (use test keys in development)                   |
| `RAZORPAY_KEY_SECRET`     | yes      | Razorpay key secret                                              |
| `RAZORPAY_WEBHOOK_SECRET` | yes      | Secret used to verify webhook signatures                         |
| `RESEND_API_KEY`          | yes      | Resend API key                                                   |
| `EMAIL_FROM`              | yes      | Sender address, for example `KalaVista <hello@yourdomain.com>`   |

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Scripts

**Root (web app)**

| Command           | What it does                      |
| ----------------- | --------------------------------- |
| `npm run dev`     | Starts the Vite dev server        |
| `npm run build`   | Builds the web app for production |
| `npm run preview` | Serves the production build       |
| `npm run lint`    | Lints the web app                 |

**`server/` (API)**

| Command           | What it does                               |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Starts the API with nodemon (auto-restart) |
| `npm start`       | Starts the API with Node                   |
| `npm run db:seed` | Loads or updates the sample artworks       |

## Status and roadmap

Catalogue, admin dashboard, commissions and payments are built. Still planned: browser-local favourites, richer gallery filters, rate limiting and security headers, automated tests and CI, the `Ask the Curator` discovery feature, and deployment. See [docs/ROADMAP.md](docs/ROADMAP.md).
