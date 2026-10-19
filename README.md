# KalaVista 🎨

An immersive digital gallery and management platform for an independent artist. Visitors can explore artworks, discover art using an AI assistant, save favourites, purchase original pieces, and request custom commissions.

## 🚀 Live Demo

- **Website:** [https://kalavista-ashy.vercel.app](https://kalavista-ashy.vercel.app)

## ✨ Key Features

- **AI Curator (RAG):** A custom AI assistant ("Ask Kala") that uses semantic vector search (pgvector + Gemini) to find artworks based on mood, colour, or story, and answers general customer queries.
- **E-Commerce & Payments:** Secure checkout with Razorpay integration, webhook handling, and partial/full refund logic.
- **Commission Workflow:** A complete system for clients to request custom art and for the artist to manage quotes, advance payments, and delivery progress.
- **Artist Studio (Admin):** A secure dashboard to manage artwork CRUD operations, categories, view orders, and generate AI-powered artwork descriptions.
- **Modern UI:** Fully responsive design with dynamic 3D animations (Three.js) on desktop and optimized static views on mobile.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, React Router, CSS Modules, Three.js
- **Backend:** Node.js, Express.js, Prisma ORM
- **Database:** PostgreSQL (Neon) with `pgvector` for AI embeddings
- **AI Integration:** Google Gemini API (Text-Embeddings & Flash model)
- **Storage & Payments:** Cloudinary (Images), Razorpay (Payments), Nodemailer (Emails)
- **Deployment:** Vercel (Frontend), Railway (Backend)

## 📸 Screenshots

_(Yahan apni 3-4 screenshots drag and drop karna GitHub edit karte waqt)_
