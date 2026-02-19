# CLAUDE.md — VoiceTask SaaS Project

## Project Overview
Multi-tenant SaaS for freelancers and small agencies — project management, todo tracking, and timesheet logging with AI-powered voice-to-text capture as the core differentiator.

## Tech Stack
- **Framework:** Next.js 16.1.4 (App Router, Turbopack)
- **Database:** PostgreSQL 17 (local dev), Drizzle ORM 0.45.1
- **Auth:** NextAuth.js 4 (Credentials + JWT). OAuth (Google/GitHub) planned.
- **UI:** React 19, Radix UI + shadcn/ui, Tailwind CSS 4, Lucide icons
- **Forms:** React Hook Form + Zod 4
- **Charts:** Chart.js + react-chartjs-2
- **Drag & Drop:** @dnd-kit
- **Notifications:** Sonner (toast)
- **Voice:** Web Speech API (upgrading to AI-parsed voice via OpenAI)
- **Caching:** Upstash Redis (optional, graceful fallback)
- **Payments (planned):** Razorpay (INR) + Stripe (USD)
- **Email (planned):** Nodemailer + Gmail SMTP
- **Deployment:** Vercel (initial), then VPS/AWS EC2

## Architecture
```
app/                    → Next.js App Router pages + API routes
components/             → React client components
  ui/                   → shadcn/ui primitives
  dashboard/            → Stats, charts, activity feed
  layout/               → AppShell, Sidebar, Topbar
  todos/                → Todo list, project manager
  projects/             → Project CRUD
  timesheet/            → Timesheet entries
  workspace/            → Switcher, members, invites
  comments/             → Todo comments
  notifications/        → Bell + notification center
hooks/                  → useWorkspace() context provider
lib/
  api/                  → Server actions ("use server")
  api/loaders.ts        → Combined data loaders (1 call per page, parallel DB queries)
  auth/                 → NextAuth config + RBAC permissions
  db/                   → Drizzle schema (13 tables) + connection (globalThis pattern)
  cache.ts              → Redis cache-aside (inactive without env vars)
```

## Database
- **Connection:** `postgresql://postgres:postgres@localhost:5432/myapp`
- **ORM:** Drizzle with prepared statements enabled
- **Dev pattern:** `globalThis.db` to prevent connection pool leak on hot-reload
- **Schema:** `lib/db/schema.ts` — 13 tables (users, workspaces, workspace_members, workspace_invitations, todos, projects, timesheet_entries, comments, notifications, notification_preferences, etc.)
- **Migrations:** `npm run db:generate` then `npm run db:push`

## Commands
```bash
npm run dev             # Start dev server (Turbopack)
npm run build           # Production build
npm run lint            # ESLint
npm run test            # Run all tests (Vitest)
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:ui         # Open Vitest UI in browser
npm run db:generate     # Generate Drizzle migrations
npm run db:push         # Push schema to database
npm run db:studio       # Open Drizzle Studio
npm run db:seed         # Seed default plans
```

## SaaS Pricing Model
| Plan     | INR       | USD    | Limits                                       |
|----------|-----------|--------|----------------------------------------------|
| Solo     | ₹499/mo   | $9/mo  | 1 user, 3 projects, 1 workspace              |
| Team     | ₹999/mo   | $19/mo | 5 users, 10 projects, 3 workspaces           |
| Agency   | ₹1999/mo  | $35/mo | 15 users, unlimited projects, unlimited ws    |
| Trial    | Free      | Free   | 14 days, full Agency features                 |

## SaaS Roadmap — Sprint Board

### How to Use This Board
- Each phase has sprints (~2 weeks each) with user stories and tasks
- Status: `[ ]` = TODO, `[~]` = IN PROGRESS, `[x]` = DONE
- When starting a new session, check this board for current progress
- Update status here as tasks are completed so progress persists across sessions
- Use Claude Code's TaskCreate/TaskUpdate tools to mirror active sprint tasks during a session

---

### PHASE 1: Revenue Foundation (Weeks 1-4)

#### Sprint 1.1 — Database & Plan Infrastructure (Week 1-2)

**User Stories:**
- US-1.1: As a user, I get a 14-day free trial with full features when I sign up
- US-1.2: As a user, I see my current plan, trial days remaining, and usage limits in the app
- US-1.3: As an owner, I cannot exceed my plan's user/project/workspace limits

**Tasks:**
- [x] T-1.1.1: Add `plans` table to schema (id, name, slug, price_inr, price_usd, max_users, max_projects, max_workspaces, features JSON)
- [x] T-1.1.2: Add `subscriptions` table (id, workspace_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end, payment_provider, provider_subscription_id)
- [x] T-1.1.3: Add `payment_history` table (id, workspace_id, amount, currency, provider, provider_payment_id, status, created_at)
- [x] T-1.1.4: Seed default plans (Solo ₹499, Team ₹999, Agency ₹1999) in a seed script
- [x] T-1.1.5: Create `lib/api/subscriptions.ts` — getSubscription, createTrialSubscription, checkPlanLimits, isTrialExpired
- [x] T-1.1.6: Auto-create 14-day trial subscription on workspace creation (modify `lib/api/workspaces.ts`)
- [x] T-1.1.7: Create `lib/api/plan-enforcement.ts` — middleware to check limits before creating users/projects/workspaces
- [x] T-1.1.8: Add plan limit checks to `createProject`, `inviteMember`, `createWorkspace` server actions
- [x] T-1.1.9: Create `components/billing/plan-badge.tsx` — shows current plan + trial countdown in sidebar
- [x] T-1.1.10: Create `components/billing/usage-meter.tsx` — shows X/Y projects used, X/Y members
- [x] T-1.1.11: Create `components/billing/trial-banner.tsx` — top banner warning at day 10, 12, 13, 14
- [x] T-1.1.12: Create `app/billing/page.tsx` — billing dashboard showing plan, usage, payment history
- [x] T-1.1.13: Create `components/billing/upgrade-wall.tsx` — lock screen shown when trial expires or limits hit
- [x] T-1.1.14: Run `db:generate` and `db:push` for new schema
- [x] T-1.1.15: Set up Vitest + React Testing Library (install deps, create vitest.config.ts, test helpers)
- [x] T-1.1.16: Write unit tests for `lib/api/subscriptions.ts` (getSubscription, createTrialSubscription, isTrialExpired, getTrialDaysRemaining, getPlanLimits, isSubscriptionActive, getWorkspaceSubscriptionStatus)
- [x] T-1.1.17: Write unit tests for `lib/api/plan-enforcement.ts` (canAddMember, canAddProject, canCreateWorkspace — at limit, under limit, unlimited, expired sub)
- [x] T-1.1.18: Write component tests for billing components (PlanBadge, UsageMeter, TrialBanner, UpgradeWall — all visual states)
- [x] T-1.1.19: Run full test suite + coverage report, verify build passes

#### Sprint 1.2 — Razorpay Integration (Week 2-3)

**User Stories:**
- US-1.4: As an Indian user, I can subscribe to a plan using UPI/cards via Razorpay
- US-1.5: As a subscriber, I can upgrade/downgrade my plan
- US-1.6: As a subscriber, I can cancel my subscription and it stays active until period end

**Tasks:**
- [x] T-1.2.1: Install `razorpay` npm package, add env vars (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET)
- [x] T-1.2.2: Create `lib/payments/razorpay.ts` — Razorpay client init, plan creation, subscription helpers
- [x] T-1.2.3: Create `app/api/payments/razorpay/create-subscription/route.ts` — creates Razorpay subscription for a plan
- [x] T-1.2.4: Create `app/api/payments/razorpay/webhook/route.ts` — handles subscription.activated, payment.captured, subscription.cancelled events
- [x] T-1.2.5: Create `components/billing/razorpay-checkout.tsx` — client-side Razorpay checkout button (loads Razorpay script)
- [x] T-1.2.6: Create `components/billing/pricing-cards.tsx` — shows 3 plan cards with "Subscribe" CTA
- [x] T-1.2.7: Wire up plan upgrade/downgrade logic (proration handling)
- [x] T-1.2.8: Wire up cancellation flow — cancel at period end, reactivation option
- [x] T-1.2.9: Add Razorpay webhook signature verification for security
- [x] T-1.2.10: Write unit tests for Razorpay server actions (create subscription, webhook handler, signature verification)
- [x] T-1.2.11: Write component tests for RazorpayCheckout and PricingCards (render states, button interactions)
- [x] T-1.2.12: Test full flow: trial → checkout → payment → active subscription → renewal

#### Sprint 1.3 — Stripe Integration + Email (Week 3-4)

**User Stories:**
- US-1.7: As an international user, I can subscribe using Stripe (USD pricing)
- US-1.8: As a user, I receive email when invited to a workspace
- US-1.9: As a user, I receive email warnings before my trial expires

**Tasks:**
- [x] T-1.3.1: Install `stripe` npm package, add env vars (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)
- [x] T-1.3.2: Create `lib/payments/stripe.ts` — Stripe client, product/price creation, subscription helpers
- [x] T-1.3.3: Create `app/api/payments/stripe/create-checkout/route.ts` — Stripe Checkout Session
- [x] T-1.3.4: Create `app/api/payments/stripe/webhook/route.ts` — handles checkout.session.completed, invoice.paid, customer.subscription.deleted
- [x] T-1.3.5: Create `app/billing/success/page.tsx` and `app/billing/cancel/page.tsx` — post-checkout redirects
- [x] T-1.3.6: Add INR/USD currency toggle to pricing cards (auto-detect by locale, manual override)
- [x] T-1.3.7: Install `nodemailer`, add env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- [x] T-1.3.8: Create `lib/email/index.ts` — sendEmail() utility with Nodemailer + Gmail SMTP
- [x] T-1.3.9: Create `lib/email/templates/` — invite.ts, trial-expiry.ts, welcome.ts, payment-receipt.ts (HTML email templates)
- [x] T-1.3.10: Wire invite emails into `lib/api/invitations.ts` — send real email when inviting
- [x] T-1.3.11: Create cron/scheduled function for trial expiry warning emails (day 4, 2, 1, 0)
- [x] T-1.3.12: Write unit tests for Stripe server actions (create checkout, webhook handler, signature verification)
- [x] T-1.3.13: Write unit tests for email module (sendEmail, template rendering, invite email, trial expiry email)
- [x] T-1.3.14: Test full Stripe flow: checkout → webhook → subscription active → renewal

---

### PHASE 2: Auth & Trust (Weeks 5-6)

#### Sprint 2.1 — OAuth + Password Reset (Week 5-6)

**User Stories:**
- US-2.1: As a new user, I can sign up with Google or GitHub in one click
- US-2.2: As an existing user, if I sign in with Google using my registered email, it links to my account
- US-2.3: As a user, I can reset my password via email if I forget it
- US-2.4: As a new user, I must verify my email before accessing the app

**Tasks:**
- [ ] T-2.1.1: Add Google OAuth provider to NextAuth config (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] T-2.1.2: Add GitHub OAuth provider to NextAuth config (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
- [ ] T-2.1.3: Handle account linking — if OAuth email matches existing credentials user, link accounts
- [ ] T-2.1.4: Add `accounts` table to schema for NextAuth adapter (provider, providerAccountId, userId)
- [ ] T-2.1.5: Update login page UI — "Continue with Google" / "Continue with GitHub" buttons above email form
- [ ] T-2.1.6: Update register page — social signup option + divider "or sign up with email"
- [ ] T-2.1.7: Add `password_reset_tokens` table (id, user_id, token, expires_at, used)
- [ ] T-2.1.8: Create `app/forgot-password/page.tsx` — email input form
- [ ] T-2.1.9: Create `app/reset-password/[token]/page.tsx` — new password form
- [ ] T-2.1.10: Create `lib/api/password-reset.ts` — generateResetToken, validateToken, resetPassword
- [ ] T-2.1.11: Create `lib/email/templates/password-reset.ts` — reset link email template
- [ ] T-2.1.12: Add `email_verified` boolean + `email_verification_token` to users table
- [ ] T-2.1.13: Create `app/verify-email/[token]/page.tsx` — email verification page
- [ ] T-2.1.14: Send verification email on registration, block access until verified
- [ ] T-2.1.15: Add "Resend verification email" button on blocked screen
- [ ] T-2.1.16: Write unit tests for password reset flow (generateResetToken, validateToken, resetPassword)
- [ ] T-2.1.17: Write unit tests for OAuth account linking logic
- [ ] T-2.1.18: Write component tests for login/register pages (OAuth buttons, form validation, error states)
- [ ] T-2.1.19: Run full test suite + coverage, verify build passes

---

### PHASE 3: AI Differentiator (Weeks 7-8)

#### Sprint 3.1 — AI Voice Parsing (Week 7)

**User Stories:**
- US-3.1: As a user, I can speak "Worked 3 hours on Acme homepage redesign" and it auto-fills project, hours, and task
- US-3.2: As a user, I can speak "Call client about invoice by Friday high priority" and it creates a todo with due date and priority
- US-3.3: As a user, I see the AI-parsed fields before confirming, and can edit them

**Tasks:**
- [ ] T-3.1.1: Install `openai` npm package, add OPENAI_API_KEY env var
- [ ] T-3.1.2: Create `lib/ai/voice-parser.ts` — parseVoiceInput(text, context) using GPT-4o-mini
- [ ] T-3.1.3: Design prompt template for timesheet parsing: extract {project, task, hours, date, notes} from natural language
- [ ] T-3.1.4: Design prompt template for todo parsing: extract {title, description, project, priority, due_date} from natural language
- [ ] T-3.1.5: Pass workspace's project list as context so AI matches existing project names
- [ ] T-3.1.6: Create `app/api/ai/parse-voice/route.ts` — API endpoint for voice parsing (server-side OpenAI call)
- [ ] T-3.1.7: Update `components/quick-capture.tsx` — after speech-to-text, send to AI parser, show parsed fields in editable form
- [ ] T-3.1.8: Add "AI parsing..." loading state with skeleton preview of fields
- [ ] T-3.1.9: Add confirm/edit step — user reviews parsed fields before saving
- [ ] T-3.1.10: Handle AI parsing failures gracefully — fall back to manual entry with transcribed text pre-filled
- [ ] T-3.1.11: Add usage tracking — count AI parses per workspace for potential future metering
- [ ] T-3.1.12: Write unit tests for voice parser (mock OpenAI API, test timesheet parsing, todo parsing, fallback on failure)
- [ ] T-3.1.13: Write component tests for updated QuickCapture (AI parsing states: loading, parsed preview, edit, confirm, error)

#### Sprint 3.2 — Todo Priorities + Due Dates (Week 8)

**User Stories:**
- US-3.4: As a user, I can set priority (High/Medium/Low/None) on todos
- US-3.5: As a user, I can set due dates on todos and see overdue indicators
- US-3.6: As a user, I can filter and sort todos by priority and due date

**Tasks:**
- [ ] T-3.2.1: Add `priority` enum column (high, medium, low, none) to todos table
- [ ] T-3.2.2: Add `due_date` date column to todos table
- [ ] T-3.2.3: Run `db:generate` and `db:push` for schema changes
- [ ] T-3.2.4: Update `createTodo` and `updateTodo` server actions to handle priority + due_date
- [ ] T-3.2.5: Update `components/todos/todo-list.tsx` — priority badge (color-coded), due date display, overdue styling (red)
- [ ] T-3.2.6: Add priority selector dropdown to todo create/edit form
- [ ] T-3.2.7: Add date picker for due date in todo create/edit form
- [ ] T-3.2.8: Add filter bar — filter by priority, filter by due (overdue, today, this week, no date)
- [ ] T-3.2.9: Add sort options — by priority, by due date, by created date, by name
- [ ] T-3.2.10: Update dashboard stats — add "overdue todos" count, "due today" count
- [ ] T-3.2.11: Write unit tests for priority/due date in todo server actions (create, update, filter, sort)
- [ ] T-3.2.12: Write component tests for todo list (priority badges, due date display, overdue styling, filter bar)
- [ ] T-3.2.13: Run full test suite + coverage, verify build passes

---

### PHASE 4: Landing & Marketing (Weeks 9-10)

#### Sprint 4.1 — Landing Page (Week 9)

**User Stories:**
- US-4.1: As a visitor, I see a compelling landing page that explains what the product does
- US-4.2: As a visitor, I can see pricing with INR/USD toggle and compare plans
- US-4.3: As a visitor, I can see a demo/GIF of the voice capture feature

**Tasks:**
- [ ] T-4.1.1: Create `app/(marketing)/layout.tsx` — marketing layout (no sidebar, different nav)
- [ ] T-4.1.2: Create `app/(marketing)/page.tsx` — landing page (replaces current dashboard as root)
- [ ] T-4.1.3: Move current dashboard to `app/(app)/dashboard/page.tsx` (route group for authenticated app)
- [ ] T-4.1.4: Build hero section — headline, subheadline, CTA button, hero image/GIF of voice capture
- [ ] T-4.1.5: Build features grid — 6 feature cards (voice capture, timesheets, projects, team, dashboard, notifications)
- [ ] T-4.1.6: Build "How it works" section — 3-step flow (Speak → AI Parses → Auto-fills)
- [ ] T-4.1.7: Build social proof section — testimonials placeholder, "Used by X freelancers"
- [ ] T-4.1.8: Create `app/(marketing)/pricing/page.tsx` — dedicated pricing page
- [ ] T-4.1.9: Build pricing table component — INR/USD toggle, 3 plan cards, feature comparison matrix
- [ ] T-4.1.10: Build FAQ section — 8-10 common questions (accordion)
- [ ] T-4.1.11: Build footer — links, social, legal pages
- [ ] T-4.1.12: Build marketing navbar — logo, features, pricing, login, "Start Free Trial" CTA
- [ ] T-4.1.13: Write component tests for landing page sections (hero, features, pricing table, FAQ)
- [ ] T-4.1.14: Write component tests for INR/USD toggle and pricing card rendering

#### Sprint 4.2 — SEO + Legal (Week 10)

**User Stories:**
- US-4.4: As a search engine, I can index the landing page with proper meta tags
- US-4.5: As a visitor, I can read privacy policy and terms of service

**Tasks:**
- [ ] T-4.2.1: Add Open Graph meta tags to marketing pages (title, description, image)
- [ ] T-4.2.2: Add Twitter Card meta tags
- [ ] T-4.2.3: Create `app/sitemap.ts` — dynamic sitemap generation
- [ ] T-4.2.4: Create `app/robots.ts` — robots.txt generation
- [ ] T-4.2.5: Add structured data (JSON-LD) for SaaS product schema
- [ ] T-4.2.6: Create `app/(marketing)/privacy/page.tsx` — privacy policy
- [ ] T-4.2.7: Create `app/(marketing)/terms/page.tsx` — terms of service
- [ ] T-4.2.8: Create `app/(marketing)/refund/page.tsx` — refund policy (required for Razorpay)
- [ ] T-4.2.9: Optimize landing page — lazy load images, preload fonts, lighthouse score > 90
- [ ] T-4.2.10: Write tests for sitemap and robots generation, verify SEO meta tags render correctly
- [ ] T-4.2.11: Run full test suite + coverage, verify build passes

---

### PHASE 5: Export & Polish (Weeks 11-13)

#### Sprint 5.1 — Timesheet Export + File Attachments (Week 11-12)

**User Stories:**
- US-5.1: As a freelancer, I can export my timesheet as CSV or PDF to send to clients for invoicing
- US-5.2: As a user, I can attach files (screenshots, docs) to todos
- US-5.3: As a user, I can download or preview attached files

**Tasks:**
- [ ] T-5.1.1: Create `lib/api/export.ts` — generateTimesheetCSV(workspaceId, dateRange, filters)
- [ ] T-5.1.2: Create `lib/api/export-pdf.ts` — generateTimesheetPDF using @react-pdf/renderer or jspdf
- [ ] T-5.1.3: Create `app/api/export/timesheet/route.ts` — GET endpoint that streams CSV/PDF download
- [ ] T-5.1.4: Add "Export" button to timesheet page — dropdown with CSV/PDF options + date range picker
- [ ] T-5.1.5: Add company branding to PDF export — logo, workspace name, date range, summary totals
- [ ] T-5.1.6: Set up Cloudflare R2 bucket (or S3) for file storage, add env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET)
- [ ] T-5.1.7: Create `lib/storage/index.ts` — uploadFile, getSignedUrl, deleteFile helpers
- [ ] T-5.1.8: Add `attachments` table to schema (id, todo_id, user_id, file_name, file_key, file_size, mime_type, created_at)
- [ ] T-5.1.9: Create `app/api/upload/route.ts` — presigned URL generation or direct upload endpoint
- [ ] T-5.1.10: Create `components/todos/file-attachment.tsx` — upload button, file list, preview/download links
- [ ] T-5.1.11: Add file size limit enforcement based on plan (Solo: 100MB total, Team: 1GB, Agency: 10GB)
- [ ] T-5.1.12: Write unit tests for export functions (CSV generation, PDF generation, date range filtering)
- [ ] T-5.1.13: Write unit tests for file storage helpers (upload, signed URL, delete, size limit enforcement)
- [ ] T-5.1.14: Write component tests for export UI and file attachment component

#### Sprint 5.2 — Recurring Tasks + Data Export (Week 12-13)

**User Stories:**
- US-5.4: As a user, I can create recurring todos (daily, weekly, monthly)
- US-5.5: As a user, I can export all my data (GDPR compliance)
- US-5.6: As a user, I see onboarding hints on first login

**Tasks:**
- [ ] T-5.2.1: Add `recurrence_rule` column to todos (null, daily, weekly, monthly, custom)
- [ ] T-5.2.2: Add `recurrence_end_date` and `parent_todo_id` columns for recurrence tracking
- [ ] T-5.2.3: Create `lib/api/recurrence.ts` — generateNextOccurrence, processRecurringTodos
- [ ] T-5.2.4: Create cron/scheduled function to generate next occurrence when current one is completed
- [ ] T-5.2.5: Update todo create form — recurrence selector (None, Daily, Weekly, Monthly)
- [ ] T-5.2.6: Show recurrence icon + label on recurring todos in list
- [ ] T-5.2.7: Create `app/api/export/data/route.ts` — full data export endpoint (JSON/ZIP)
- [ ] T-5.2.8: Add "Export My Data" button in workspace settings
- [ ] T-5.2.9: Create onboarding checklist component — shown on first login (create project, add todo, try voice, invite member)
- [ ] T-5.2.10: Track onboarding completion in user metadata
- [ ] T-5.2.11: Write unit tests for recurrence logic (generateNextOccurrence, processRecurringTodos)
- [ ] T-5.2.12: Write unit tests for data export (full JSON export, GDPR compliance)
- [ ] T-5.2.13: Write component tests for onboarding checklist and recurring task UI
- [ ] T-5.2.14: Run full test suite + coverage, verify build passes

---

### PHASE 6: Production Hardening (Week 14+)

#### Sprint 6.1 — Infrastructure + Monitoring (Week 14-15)

**User Stories:**
- US-6.1: As a developer, I have error tracking and performance monitoring in production
- US-6.2: As a developer, I can see usage analytics and user behavior
- US-6.3: As an admin, I have an internal dashboard to manage tenants

**Tasks:**
- [ ] T-6.1.1: Migrate to managed PostgreSQL (Neon free tier) — update DATABASE_URL, test all queries
- [ ] T-6.1.2: Install and configure Sentry (`@sentry/nextjs`) — error tracking, performance monitoring
- [ ] T-6.1.3: Install PostHog or Plausible — page views, feature usage, funnel tracking
- [ ] T-6.1.4: Add rate limiting to API routes (`lib/api/rate-limit.ts`) — per-IP and per-user
- [ ] T-6.1.5: Add CSRF protection to sensitive endpoints
- [ ] T-6.1.6: Create `app/(admin)/admin/page.tsx` — internal admin dashboard (protected by admin email whitelist)
- [ ] T-6.1.7: Admin: list all workspaces with plan, member count, created date, last active
- [ ] T-6.1.8: Admin: view subscription status, manually extend trials, change plans
- [ ] T-6.1.9: Admin: global stats — total users, workspaces, MRR, churn rate
- [ ] T-6.1.10: Set up Vercel deployment — connect repo, env vars, preview deployments
- [ ] T-6.1.11: Configure custom domain + SSL
- [ ] T-6.1.12: Set up uptime monitoring (BetterStack or UptimeRobot)
- [ ] T-6.1.13: Write unit tests for rate limiting middleware
- [ ] T-6.1.14: Write tests for admin dashboard data queries (workspace list, subscription stats, MRR calculation)

#### Sprint 6.2 — Security + Final Polish (Week 15-16)

**User Stories:**
- US-6.4: As a user, my data is secure and the app follows security best practices
- US-6.5: As a user, I have a smooth, polished experience with no rough edges

**Tasks:**
- [ ] T-6.2.1: Security audit — check all server actions for proper auth/permission checks
- [ ] T-6.2.2: Add Content Security Policy headers
- [ ] T-6.2.3: Add rate limiting to login/register endpoints (brute force protection)
- [ ] T-6.2.4: Sanitize all user inputs — prevent XSS in comments, todo titles, project names
- [ ] T-6.2.5: Add request logging for audit trail (`lib/api/audit.ts`)
- [ ] T-6.2.6: Review and fix all TypeScript `any` casts — add proper types
- [ ] T-6.2.7: Performance audit — Lighthouse score > 90 on all pages
- [ ] T-6.2.8: Accessibility audit — keyboard navigation, screen reader support, ARIA labels
- [ ] T-6.2.9: Mobile responsiveness pass — test all pages on mobile viewport
- [ ] T-6.2.10: Write user-facing docs/help — getting started guide, FAQ
- [ ] T-6.2.11: Write integration tests for critical user flows (signup → trial → payment → daily use → export → cancel)
- [ ] T-6.2.12: Run full test suite + coverage report (target: 80%+ on server actions, 70%+ overall)
- [ ] T-6.2.13: Final QA — manual testing of all user flows end-to-end

---

### Progress Tracker

| Phase | Sprint | Status | Completed |
|-------|--------|--------|-----------|
| 1. Revenue | 1.1 DB & Plans + Tests | DONE | 19/19 |
| 1. Revenue | 1.2 Razorpay | DONE | 12/12 |
| 1. Revenue | 1.3 Stripe + Email | DONE | 14/14 |
| 2. Auth | 2.1 OAuth + Reset | TODO | 0/19 |
| 3. AI | 3.1 Voice Parsing | TODO | 0/13 |
| 3. AI | 3.2 Priorities + Dates | TODO | 0/13 |
| 4. Marketing | 4.1 Landing Page | TODO | 0/14 |
| 4. Marketing | 4.2 SEO + Legal | TODO | 0/11 |
| 5. Export | 5.1 Export + Files | TODO | 0/14 |
| 5. Export | 5.2 Recurring + GDPR | TODO | 0/14 |
| 6. Production | 6.1 Infra + Monitoring | TODO | 0/14 |
| 6. Production | 6.2 Security + Polish | TODO | 0/13 |
| **TOTAL** | **12 sprints** | **IN PROGRESS** | **45/170** |

---

### Session Resume Instructions
When resuming development in a new session:
1. Check the Progress Tracker above to see which sprint is current
2. Look for `[~]` (in progress) tasks — those were mid-flight when last session ended
3. Use `TaskCreate` to load the current sprint's remaining `[ ]` tasks into the session
4. Use `/superpowers:writing-plans` if starting a new sprint
5. Use `/superpowers:verification-before-completion` before marking any task `[x]`
6. Update this file's checkboxes when tasks are confirmed complete

## Key Patterns & Conventions

### Server Actions
- All data mutations live in `lib/api/*.ts` with `"use server"` directive
- Every action checks permissions via `lib/auth/permissions.ts` before operating
- Loaders in `lib/api/loaders.ts` — one loader per page, parallel DB queries via `Promise.all()`

### RBAC Roles
- `owner` — full control (delete workspace, transfer ownership)
- `admin` — manage members, projects, todos
- `member` — CRUD own items only

### Component Patterns
- Client components in `components/` with `"use client"`
- Server components in `app/` pages — fetch data and pass as props
- `useWorkspace()` hook for current workspace context (localStorage + cookie)
- `SessionProvider` with `refetchOnWindowFocus={false}`

### Naming Conventions
- Files: kebab-case (`todo-list.tsx`, `auth-options.ts`)
- Components: PascalCase (`TodoList`, `ProjectManager`)
- Server actions: camelCase functions (`createTodo`, `loadDashboardData`)
- DB tables: snake_case (`timesheet_entries`, `workspace_members`)
- DB columns: snake_case (`created_at`, `user_id`)

### TypeScript
- NextAuth `useSession()` doesn't include `id` — cast: `(session?.user as any)?.id`
- Web Speech API needs custom TypeScript interfaces (no built-in types)
- Zod 4 for runtime validation in forms

## Development Workflow

### Before ANY creative work (features, components, behavior changes):
Use `/superpowers:brainstorm` to explore intent, requirements, and design before writing code.

### Before writing implementation code:
Use `/superpowers:writing-plans` to create a step-by-step plan.

### When executing a plan:
Use `/superpowers:executing-plans` for structured execution with review checkpoints.

### For parallel independent tasks:
Use `/superpowers:dispatching-parallel-agents` to work on 2+ independent tasks simultaneously.

### When hitting bugs or test failures:
Use `/superpowers:systematic-debugging` before proposing fixes. Diagnose first, fix second.

### Before claiming work is done:
Use `/superpowers:verification-before-completion` — run `npm run test` AND `npm run build` and confirm both pass before making success claims.

### After completing a major feature:
Use `/superpowers:requesting-code-review` to verify work meets requirements.

### When receiving code review feedback:
Use `/superpowers:receiving-code-review` — verify feedback technically before blindly implementing.

### When implementation is done and ready to merge:
Use `/superpowers:finishing-a-development-branch` for structured completion.

## UI Component Guidelines

### Use existing shadcn/ui components from `components/ui/`:
- `button`, `card`, `input`, `label`, `textarea`, `select`, `checkbox`
- `dialog`, `alert-dialog`, `sheet` (mobile sidebar), `dropdown-menu`
- `form` (React Hook Form integration), `date-picker`
- `tooltip`, `popover`, `scroll-area`, `table`
- `sonner` for toast notifications, `voice-input` for speech

### Adding new shadcn/ui components:
```bash
npx shadcn@latest add [component-name]
```

### Styling:
- Tailwind CSS 4 utility classes only — no custom CSS files
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Dark mode via `next-themes` — use `dark:` variants
- Responsive: mobile-first approach, `md:` and `lg:` breakpoints

## Testing Strategy

### Framework: Vitest + React Testing Library
- **Vitest** — fast, Vite-native test runner with ESM support (works with Next.js)
- **React Testing Library** — component testing (user-centric, not implementation-centric)
- **msw (Mock Service Worker)** — mock server actions and API routes in tests

### Test Directory Structure
```
__tests__/
  lib/
    api/               → Server action unit tests
      subscriptions.test.ts
      plan-enforcement.test.ts
      projects.test.ts
    db/
      schema.test.ts   → Schema validation tests
  components/
    billing/           → Component tests
      plan-badge.test.tsx
      usage-meter.test.tsx
      trial-banner.test.tsx
      upgrade-wall.test.tsx
      billing-page.test.tsx
  utils/
    test-helpers.ts    → Shared mocks, factories, setup
```

### What to Test (Priority Order)
1. **Server Actions (Critical)** — business logic, permission checks, plan enforcement, data mutations
2. **Pure Functions** — isTrialExpired, getTrialDaysRemaining, getPlanLimits, isSubscriptionActive
3. **Components** — render states, user interactions, conditional displays
4. **API Routes** — webhook handlers, payment flows

### Test Patterns

**Server Action Tests:**
```typescript
// Mock the DB and test business logic
import { describe, it, expect, vi } from 'vitest';

describe('canAddProject', () => {
  it('allows when under limit', async () => { ... });
  it('blocks when at limit', async () => { ... });
  it('allows unlimited (-1) plans', async () => { ... });
  it('blocks when subscription expired', async () => { ... });
});
```

**Component Tests:**
```typescript
// Test render states and user interactions
import { render, screen } from '@testing-library/react';

describe('PlanBadge', () => {
  it('shows trial badge with days remaining', () => { ... });
  it('shows expired badge when trial ended', () => { ... });
  it('shows plan name when active subscription', () => { ... });
});
```

### Testing Rules for Every Sprint
1. **Every new server action MUST have unit tests** covering happy path + error cases
2. **Every new component MUST have render tests** for all visual states
3. **Plan enforcement functions MUST have boundary tests** (at limit, over limit, unlimited)
4. **Webhook handlers MUST have signature verification tests**
5. **Run `npm run test` before marking any task as complete**
6. **Run `npm run build` as final check — tests + build must both pass**

### Testing Workflow (Per Task)
- Write tests FIRST when implementing pure logic (TDD for server actions)
- Write tests AFTER for UI components (verify render states)
- Use `/superpowers:test-driven-development` skill for complex logic
- Use `/superpowers:verification-before-completion` which now MUST include `npm run test`

### Sprint Testing Checklist
Every sprint MUST end with a testing task that:
- [ ] Runs full test suite (`npm run test`)
- [ ] Checks coverage report (`npm run test:coverage`)
- [ ] Verifies build passes (`npm run build`)
- [ ] Minimum 80% coverage on new server action code
- [ ] All component states tested (loading, error, empty, populated)

## Key Gotchas
- Supabase free tier and Upstash free tier both have ~8.9s cold start latency — avoid for production
- Always check ALL remote services in the request chain when debugging latency
- `lib/db/index.ts` uses globalThis pattern — required to prevent connection pool leak in dev
- Redis cache is currently inactive (no env vars set) — `lib/cache.ts` gracefully skips
- NextAuth session type quirk: user.id not in type, cast with `(session?.user as any)?.id`
