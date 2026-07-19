# POSKO Jasa — Frontend UI/UX Audit

Reviewed against `DESIGN_GUIDELINES.md` and `globals.css`. Scope: `web/src/app` + shared layout/components. Two problem classes: **[C]** consistency, **[F]** feature/UX.

> [!NOTE]
> **Status 2026-07-19:** Semua temuan konsistensi **[C]** di bawah sudah diselesaikan (lihat CHANGELOG). Yang tersisa di dokumen ini adalah backlog **[F]** (feature/UX) — belum dikerjakan. Ringkasan penyelesaian ada di bagian [Resolved](#resolved-2026-07-19).

---

## Systemic findings (fix once, benefits all pages)

**[C1] Two sub-page header patterns coexist.** The standard is a sticky sub-header (`sticky top-16`, `ArrowLeft` back button, `max-w-lg`) — used by BookingClient, PartnerProfileClient, ChatConversation, cart, search, etc. But `profile/favorites` and `profile/notifications` skip it entirely: no back button, no sticky header, just a bare `<h1>`. Users on mobile have no way back except the OS gesture.

**[C2] Off-standard container widths.** Standard is `max-w-lg` (62 uses). `favorites` uses `max-w-[900px]`, `notifications` uses `max-w-[700px]` — arbitrary hardcoded widths. Pick a token.

**[C3] Hardcoded border-radius in Service Detail.** `services/ServiceDetailClient.tsx` uses `rounded-[4px]` ~20 times — a direct violation of the "never hardcode radius, use `rounded-md`" rule. This is the single largest theme violation; every other page uses tokens.

**[C4] Status badges are duplicated and diverge.** A shared `StatusBadge` component exists (used by orders + mitra), but `profile/page.tsx` reimplements its own status→color map with a *different vocabulary* (`in_progress`, `on_the_way`) vs the component's (`IN_PROGRESS`, no `on_the_way`). Two sources of truth. Also: neither uses the brand semantic tokens (`brand-success #38A169`, `brand-warning`) defined in `globals.css` — both use generic Tailwind `green-100/yellow-100`. The semantic palette is effectively dead code.

**[C5] Duplicate links in Profile settings.** Three menu rows point to the same `/profile/security` — likely placeholder/mislabeled destinations.

**[F0] No global toast/empty/skeleton standard.** Loading states vary ("Memuat…" text vs spinner vs skeleton). Standardize skeleton + toast + empty-state components for uniform feedback.

---

## Page-by-page

### Auth
- **login / register / forgot-password** — [C] Consistent (own layout, back button present on register/forgot). [F] Add password-strength meter + show/hide toggle on register; add social/Google login; rate-limit feedback on forgot-password.

### Home & discovery
- **/ (Home)** — Hero carousel + Category/TopPartners/Featured/Products sections. [F] Add "recently viewed" and "near you" (location already captured via `useUserLocation`); personalized re-order rows.
- **/search** — [C] Back button ✓, breadcrumbs, filter panel, pagination present — good. [F] Recent-search chips, save-search/alert, map view toggle.
- **/categories** — [C] Back ✓. [F] Search-within-categories, popular badges.
- **/services + ServiceDetailClient** — [C3] radius violations (fix). [F] Sticky "add to cart" ✓ exists; add related-services, share button, Q&A section, availability preview.
- **/[username] (Partner profile)** — [C] Back ✓, sticky header ✓. [F] "Chat before order" CTA, response-time badge, share profile.
- **/promos, /about, /help, /privacy, /terms** — [C] Back ✓. [F] Help: searchable FAQ + contact-support entry; Promos: filter/expiry countdown + one-tap copy code.

### Cart & booking
- **/cart** — [C] Back ✓. [F] Per-item schedule/notes, save-for-later, applied-promo line, empty-state CTA.
- **/book/[username]** — [C] 2-step flow, back handles step-back ✓. [F] Progress indicator (step 1/2), address quick-add ✓, price breakdown before confirm, slot-availability check.

### Orders
- **/orders** — Tab filters (Semua/Menunggu/Berlangsung/Selesai/Dibatalkan) + counts. [F] Search by order ID/mitra, reorder button, filter persistence.
- **/orders/[id]** — [C] Back ✓, uses StatusBadge ✓. [F] Live status timeline, mitra location/ETA map, one-tap chat/call, receipt download.
- **/orders/[id]/dispute, /review, /additional-fee** — [C] Back ✓. [F] Review: photo upload + tag chips; Dispute: attach evidence, status tracker.

### Payment
- **/payment/[order_id] + /status** — [C] Back ✓. [F] Countdown to expiry (component exists), saved payment methods, auto-refresh status polling, clear success/failure illustration.

### Chat & notifications
- **/chat (list)** — [F] Search conversations, unread badge, archive/pin.
- **/chat/[room_id]** — [C] Back via ChatConversation ✓, full-screen ✓. [F] Typing indicator, image preview ✓, quick-reply templates for mitra, order-context card in header.
- **/notifications** — [C] Back ✓. [F] Group by type, mark-all-read, deep-link to source, filter tabs.

### Profile
- **/profile** — [C4] inline status map (use StatusBadge); [C5] duplicate `/profile/security` links. [F] Profile completeness meter, avatar upload inline.
- **/profile/favorites** — **[C1] no back button, [C2] `max-w-[900px]`.** [F] Tab split (services vs partners), sort, empty-state CTA (partly present).
- **/profile/notifications** — **[C1] no back button, [C2] `max-w-[700px]`.** Otherwise clean push/email grid.
- **/profile/security** — [C] Back ✓. [F] 2FA, active-session list, login-history.
- **/profile/addresses (+new)** — [C] Back ✓, MapPicker. [F] Set-default, label icons (home/office), reorder.
- **/profile/wallet (+withdraw)** — [C] Back ✓ (mitra/wallet re-exports these — good reuse). [F] Transaction filters, export, balance-trend chart.

### Mitra (partner) area
- **/mitra/dashboard** — Custom red header (`sticky top-0`, rounded-b) — intentional, uses StatusBadge ✓. [F] Earnings chart, today's schedule widget, accept/reject queue.
- **/mitra/orders (+[id], additional-fee)** — [C] Back ✓, StatusBadge ✓. [F] Bulk actions, filter by status, print work order.
- **/mitra/services (+new, +[id]/edit)** — [C] Back ✓. [F] Duplicate-service, active/inactive toggle, drag-reorder, preview-as-customer.
- **/mitra/schedule** — [C] Back ✓. [F] Calendar/week view, block-out dates, recurring availability.
- **/mitra/wallet (+withdraw), /bank-account** — [C] Back ✓. [F] Payout schedule, multiple bank accounts, withdrawal history.
- **/mitra/portfolio, /basecamp, /profile** — [C] Back ✓ (profile tab, no back — correct). [F] Portfolio: reorder + captions; Basecamp: map confirm + service-radius.
- **/mitra/register, /verification-status, /re-verify** — [C] Back ✓. [F] Multi-step progress bar, doc-upload status per item, ETA for review.

---

## Resolved (2026-07-19)

Consistency pass shipped — see CHANGELOG `[2026-07-19]`.

- **[C1]** ✅ Back-header standardized. `MobilePageHeader` (now with a `right` action slot) adopted by all 8 pages that hand-rolled it; `favorites`/`notifications` back-buttons restored.
- **[C2]** ✅ Off-standard widths (`max-w-[900px]`/`[700px]`) normalized to `max-w-lg`. Home/Search keep an intentional, *consistent* `max-w-[1200px]`.
- **[C3]** ✅ All `rounded-[4px]` → `rounded-xs` (exact 4px token); `[12px]`→`xl`, `[10px]`→`lg`.
- **[C4]** ✅ `profile` status goes through shared `StatusBadge`; badge wired to brand semantic tokens (`bg-brand-*-light`).
- **[F0]** ✅ Global `<Toaster/>`/`useToast()`, `<EmptyState/>`, `<Skeleton/>`, `<Stepper/>` created; 12 local toasts migrated; text loaders standardized.
- **+ Auth:** `login` back-button (mobile); `register` visual `Stepper` + brand recolor.
- **+ Infra:** `app/loading.tsx`, `app/not-found.tsx` added.

**Deferred (decisions, not misses):** dark-mode `.dark` block is dead code — kept pending a call to implement vs remove (app hardcodes hex, so real dark mode is a large refactor).

## Remaining backlog
The **[F]** feature/UX items in the page-by-page section above are the open work — none are shipped yet.
