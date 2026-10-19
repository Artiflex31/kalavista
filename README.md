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

<img width="1917" height="950" alt="image" src="https://github.com/user-attachments/assets/e710084b-3f7b-4474-8977-3e26700ff8c7" />
<img width="1919" height="892" alt="image" src="https://github.com/user-attachments/assets/8b28b470-c984-425b-a55d-942e836e1e6e" />
<img width="1918" height="888" alt="image" src="https://github.com/user-attachments/assets/95156786-ca5f-48a3-8ba4-d827fa3a0cc0" />
<img width="1919" height="880" alt="image" src="https://github.com/user-attachments/assets/08b1b38f-5f9d-4c09-b75c-57c67f8b4e59" />




