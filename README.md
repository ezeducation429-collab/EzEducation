# EzEducation

EzEducation is a full-stack educational web application designed for students and educators. It includes an interactive Python interpreter, structured coding lessons, student quizzes, semester-wise study material & PDF notes library, Razorpay payments for premium materials, Firebase student authentication, and a full-featured educator admin dashboard.

The application is built on **Next.js 16 (App Router)** and **React 19**, styled with **Tailwind CSS v4** and **shadcn/ui**, and powered by a universal database layer supporting both **Node.js SQLite** and **Cloudflare D1** via **Drizzle ORM**.

---

## ✨ Features

- 🐍 **Interactive Python Interpreter**: In-browser client-side Python execution for live coding exercises.
- 📚 **Python Lessons**: Step-by-step programming curriculum with syntax highlighting and interactive code playgrounds.
- 📝 **Student Quizzes & Assessment**: Timed MCQ tests, automated grading, review explanations, and student score tracking.
- 📖 **Semester-Wise Study Library**: Categorized notes, question papers, syllabi, and study materials for B.Pharm and D.Pharm.
- 💳 **Secure PDF Downloads & Razorpay Payments**: Free or paid PDF delivery with verified payment webhooks and student account binding.
- 🔐 **Firebase Student Authentication**: Secure student sign-up, sign-in, and password resets powered by Google Identity Toolkit.
- 🛠️ **Educator Admin Panel**: Secure portal (`/admin` and `/admin/quizzes`) protected by your private `ADMIN_KEY` to upload PDFs, manage study materials, create quizzes, and export performance reports to CSV.

---

## 🛠️ Tech Stack & Compatibility

- **Framework**: Next.js 16 (App Router with Turbopack)
- **UI & Components**: React 19, Tailwind CSS v4, Lucide React, Radix UI / Base UI
- **Package Manager**: **npm** (100% npm compatible, no pnpm needed)
- **Database**:
  - **Local Development / Self-Hosted**: Built-in Node.js SQLite (`node:sqlite`)
  - **Vercel / Cloudflare Serverless**: Cloudflare D1 (via D1 REST API or Worker binding)
- **Authentication**: Firebase Authentication (Google Identity Toolkit)
- **Payments**: Razorpay API

---

## 📋 Prerequisites

- **Node.js**: `>=20.0.0` (Node 22 LTS recommended)
- **npm**: `>=10.0.0`

---

## ⚡ Quick Start Guide (Local Development)

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Educator Admin Access Key (protects /admin and /admin/quizzes)
ADMIN_KEY=your_secret_admin_key

# Razorpay Credentials (optional for local testing; required for paid PDF checkouts)
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

*(See [`.env.example`](file:///.env.example) for a complete template).*

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🚀 Deploying to Vercel

Deploying EzEducation to Vercel takes less than 2 minutes:

### Step 1: Push Code to GitHub / GitLab / Bitbucket
Ensure your repository is pushed to your Git provider.

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** → **Project**.
3. Select your `EzEducation` repository.
4. Keep the default settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `next build` (or `npm run build`)
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 3: Configure Environment Variables in Vercel
In the **Environment Variables** section on Vercel, add:

| Key | Description | Required |
|---|---|---|
| `ADMIN_KEY` | Private password for educator dashboard access (`/admin`) | **Yes** |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (starts with `rzp_live_` or `rzp_test_`) | Yes (for payments) |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | Yes (for payments) |
| `CLOUDFLARE_D1_DATABASE_ID` | Your Cloudflare D1 Database UUID | Optional (for cloud D1) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | Optional (for cloud D1) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token with D1 Edit permissions | Optional (for cloud D1) |

> **Note on Database Storage on Vercel**:
> - If `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` are set, the app connects directly to Cloudflare D1 via Cloudflare's secure REST API.
> - If running on a persistent server (e.g., VPS, Docker, Railway), the app automatically uses local SQLite (`data.sqlite`).

### Step 4: Click Deploy!
Vercel will build and deploy the Next.js application automatically.

---

## 🌐 Deploying to Other Platforms (Render, Railway, VPS, Docker)

Because EzEducation is a standard Next.js application, you can deploy it anywhere Node.js 20+ runs:

```bash
# Build the production bundle
npm run build

# Start the server (default port 3000)
npm run start
```

---

## 🔑 Accessing the Admin Dashboard

- Navigate to `/admin` or `/admin/quizzes`.
- Enter your configured `ADMIN_KEY` to unlock the dashboard.
- From here, you can:
  - Add study materials, syllabus, and question papers.
  - Upload notes and set prices in ₹ (INR) for paid downloads.
  - Create and publish student quizzes.
  - Monitor student scores, submissions, and download CSV reports.

---

## 📂 Project Structure

```text
EzEducation/
├── app/                  # Next.js App Router (pages & API routes)
│   ├── admin/            # Educator dashboard (/admin & /admin/quizzes)
│   ├── api/              # REST API endpoints (notes, quizzes, payments, auth)
│   ├── python-interpreter/ # Interactive client-side Python sandbox
│   ├── python-lessons/   # Structured coding curriculum
│   ├── quizzes/          # Student quiz runner and results
│   ├── study/            # Semester-wise notes library
│   └── layout.tsx        # Global shell and metadata
├── components/           # UI components (shadcn/ui, buttons, dialogs)
├── content/              # Python lesson markdown modules
├── db/                   # Drizzle ORM schema definitions
├── drizzle/              # SQL schema migration files
├── lib/                  # Universal storage, Firebase auth, Razorpay payments
├── public/               # Static assets & icons
├── .env.example          # Environment variables template
├── next.config.ts        # Next.js configuration
├── package.json          # Standard npm scripts and dependencies
└── tsconfig.json         # TypeScript configuration
```

---

## 📄 License

Proprietary / Private educational platform. All rights reserved.
