# KalaVista (formerly Canvas Atlas)

## Product vision

KalaVista is an immersive digital gallery for an independent artist. Visitors can explore artwork, understand the story behind each piece, save favourites, buy available works, and send a commission request. The artist has a secure dashboard for managing the catalogue. A later `Ask the Curator` feature will help visitors discover artwork using only the gallery's own catalogue.

## The v1 audience

- **Visitor / collector:** browses the artwork, learns its story, saves works locally in the browser, buys available works, and sends a commission enquiry.
- **Artist / administrator:** signs in, creates and edits artworks and collections, controls availability, reviews enquiries, and manages orders and payments.

## What v1 must prove

1. A polished, accessible React experience that makes the artwork the focus.
2. A real Node.js API and PostgreSQL data model, not static JSON masquerading as a product.
3. Secure role-based access and a complete artwork-management flow.
4. Production-ready media handling, validation, error states, and deployment.
5. One useful, trustworthy AI capability: catalogue-grounded discovery and later the `Ask the Curator` assistant.

## MVP features

### Public experience

- Home page with a distinctive exhibition-style hero.
- Gallery with filters for collection, medium, availability, and tags.
- Artwork detail page: high-quality image, story, materials, dimensions, process, and availability.
- Browser-local favourites; visitor accounts are deliberately deferred from v1.
- Commission enquiry form with status confirmation and a private tracking page.
- Direct purchase of available works with Razorpay checkout and order tracking.
- Commission payments: an advance (or full payment) and a final payment, with email confirmations.

### Artist dashboard

- Authentication and `admin` role protection.
- Artwork and collection CRUD.
- Secure artwork image upload and optimized image delivery.
- Enquiry list with a status workflow, progress stages and quotes.
- Order list with courier and delivery tracking.

### AI, after the catalogue is real

- Natural-language artwork discovery, such as: “calm blue work for a small room.”
- `Ask the Curator`: answers from retrieved catalogue records and always links the referenced artwork.
- Honest fallback when no relevant artwork exists; never invent price, availability, or inspiration.

## Explicit v1 non-goals

- Multi-artist marketplace and payout system.
- Shopping cart and multi-item orders (one artwork per order in v1).
- AR room placement.
- Real-time chat.
- Generating new artwork with AI.
- Public registration and social features.

Those are worthwhile version-two ideas, but they would dilute the first recruiter-ready release.

## Product principles

- **Art first:** minimal interface, fast image loading, intentional motion.
- **Useful AI, not decorative AI:** every answer is grounded in catalogue data.
- **Accessible by default:** keyboard navigation, meaningful alt text, contrast, and responsive design.
- **One finished path at a time:** build and test the complete flow before adding the next feature.
