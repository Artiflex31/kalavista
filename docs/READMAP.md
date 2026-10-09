# KalaVista Roadmap

This is the order we will follow. A milestone is complete only when its “done when” check is true; we will not pile new features on an unfinished base.

## Stack decisions

- **Web:** React, JavaScript, Vite, React Router, Motion, Three.js (plain CSS).
- **API:** Node.js, JavaScript (ES modules), Express 5, Zod validation, Prisma 7.
- **Data:** PostgreSQL. Add `pgvector` only when we begin semantic search.
- **Media:** Cloudinary.
- **Payments and email:** Razorpay (orders and commission payments), Resend (transactional email).
- **Quality:** ESLint, Prettier, Vitest, Playwright, GitHub Actions.
- **Deployment:** Vercel for the web app; Render, Railway, or Fly.io for the API and PostgreSQL.

## Milestone 0 — Product foundation

**Goal:** define a small, credible product that can be completed.

**Deliverables:** project brief, scope boundaries, roadmap, initial architecture decisions.

**Done when:** these documents are agreed and the working name is Canvas Atlas.

## Milestone 1 — Developer foundation and visual prototype

**Goal:** make a clean, runnable full-stack workspace.

**Build:**

- Git repository, README, `.gitignore`, and environment-file templates.
- React + TypeScript web application with routing, design tokens, and a gallery prototype using local seed data.
- Node + TypeScript API with a health endpoint.
- Linting, formatting, test commands, and a first CI workflow.

**Done when:** one command starts the web app and API, the health check passes, and the visual browse path already feels polished with local data.

## Milestone 2 — Full-stack catalogue

**Goal:** give Canvas Atlas real content and a strong visual identity.

**Build:**

- Prisma schema and migrations for the single admin profile, artworks, collections, tags, artwork images, and commission enquiries.
- Local PostgreSQL in Docker Compose and a Prisma seed script for 12–20 artworks (your real works when ready; tasteful placeholder content until then).
- Public home page, gallery grid, filter UI, and artwork detail route wired to the API.
- Responsive image handling plus loading, empty, and error states.

**Done when:** a visitor can browse, filter, and open an artwork from real API data on mobile and desktop.

## Milestone 3 — Authentication and artist dashboard

**Goal:** make the site a real creator product rather than a static showcase.

**Build:**

- Secure single-admin sign-in, sign-out, protected API routes, and `admin` role checks.
- Dashboard navigation.
- Artwork and collection create/edit/delete forms with validation.
- Secure media upload flow and optimized image URLs.

**Done when:** an admin can publish a new artwork and see it appear on the public gallery without editing code.

## Milestone 4 — Collector and commission workflow

**Goal:** demonstrate the full visitor-to-artist product flow.

**Build:**

- Browser-local favourites; public registration is intentionally deferred.
- Commission enquiry form with artwork reference, budget range, and message.
- Admin enquiry list, status changes, progress stages and quotes.
- Private commission tracking page for the client.
- Direct artwork purchase with Razorpay, order tracking and delivery updates.
- Commission advance and final payments, verified by signed webhook.
- Transactional email for quotes, payments and order updates.

**Done when:** a visitor can express interest, pay, and track progress, and the artist can manage requests, orders and payments in the dashboard.

**Status:** payments, tracking and emails are built. Browser-local favourites are still to do.

## Milestone 5 — Discovery and `Ask the Curator`

**Goal:** add a trustworthy AI feature that solves a real discovery problem.

**Build:**

- Start with grounded metadata retrieval over artwork titles, stories, tags, colours, and moods. Add embeddings and `pgvector` only after this path is working.
- Chat interface that retrieves relevant works before calling an LLM.
- Source artwork cards in every answer, refusal/fallback when evidence is missing, and rate limiting.
- Feedback capture and a small evaluation set of expected questions.

**Done when:** questions such as “show warm abstract work for a bedroom” return relevant, linked results without ungrounded claims.

## Milestone 6 — Recruiter-ready release

**Goal:** make the engineering quality as visible as the design.

**Build:**

- Unit, API, and key end-to-end tests.
- Performance, accessibility, security, and error-handling pass.
- Rate limiting, security headers, and handling for failed and refunded payments.
- Deployment, monitoring/error tracking, and production environment settings (live Razorpay keys and webhook URL).
- Architecture diagram, clean README, screenshots, and a 60-second demo video.

**Done when:** someone can open the live URL, try a demo account, understand the architecture in two minutes, and see a reliable end-to-end product.

## Build discipline

1. We will complete one vertical slice before starting the next milestone.
2. We will use real requirements, validation, and error states—not happy-path-only demos.
3. We will defer AR, multi-vendor features, shopping cart, and additional AI until v1 is deployed.
4. Every milestone ends with a short verification checklist and a useful Git commit.
