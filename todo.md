# 霸王養精蓄力丹 - Project TODO

## Phase 2: Images & Assets
- [x] Download all original images from komoreco.shop
- [x] Upload images to S3 CDN via manus-upload-file --webdev
- [x] Store CDN URLs for use in landing page

## Phase 3: Database & Backend API
- [x] Add `submissions` table (id, name, phone, ip, createdAt) with phone unique index
- [x] Add `page_content` table (key, value, type, updatedAt) for editable content
- [x] Add `page_images` table (key, url, label, updatedAt) for editable images
- [x] Run drizzle migration
- [x] Add submission tRPC procedures (submit, list, search, deduplicate by phone)
- [x] Add content tRPC procedures (getAll, update)
- [x] Add image tRPC procedures (getAll, upload/replace via S3)
- [x] Add owner notification on new submission

## Phase 4: Landing Page (Frontend)
- [x] Clone exact HTML structure from komoreco.shop
- [x] Implement countdown timer animation
- [x] Implement fake order pop-up notifications
- [x] Implement bouncing/pulsing button animations
- [x] Implement floating CTA button
- [x] Form with name + phone fields, auto-capture IP
- [x] Deduplicate by phone (show message if already submitted)
- [x] Load images from S3 CDN (editable via admin)
- [x] Load text content from DB (editable via admin)
- [x] Responsive design (mobile-first)

## Phase 5: Admin Panel (Frontend)
- [x] Admin login page at /admin (protected, admin role only)
- [x] Submissions list with search/filter by name, phone, IP, date
- [x] Content editor: edit all landing page text fields
- [x] Image manager: upload/replace landing page images
- [x] Responsive admin layout

## Phase 6: Tests & Delivery
- [x] Write vitest tests for submission deduplication logic
- [x] Write vitest tests for content/image update procedures
- [x] Save checkpoint
- [x] Deliver to user

## Phase 7: Password Authentication & Deployment
- [x] Replace OAuth with simple password authentication for /admin
- [x] Initialize admin password to 123456
- [x] Test password login functionality (all 14 tests passing)
- [x] Create deployment guide for international servers (AWS/Vercel/Railway/Render)
- [x] Save checkpoint with password auth

## Phase 8: Delete Submission Feature
- [x] Add deleteSubmission function to db.ts
- [x] Add deleteSubmission tRPC procedure to admin router
- [x] Add delete button to submissions table UI
- [x] Add confirmation dialog before deletion
- [x] Test delete functionality (all 14 tests passing)
- [x] Save checkpoint with delete feature

## Phase 9: Vercel Deployment Configuration
- [x] Add vercel.json configuration file
- [x] Add .vercelignore file
- [x] Verify package.json build scripts are Vercel-compatible
- [x] Add README-VERCEL.md with complete deployment guide
- [x] Test build process with pnpm build (successful)
- [x] Verify TypeScript compilation
- [x] Save checkpoint with Vercel configuration
