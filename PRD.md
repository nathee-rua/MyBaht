# Product Requirements Document (PRD)
## Product: MyBaht / เงินฉัน — Smart Expense & Income Tracker
**Owner:** Product Team
**Status:** Draft v1.0
**Last updated:** 2026-07-11
---
## 1. Overview
MyBaht (เงินฉัน) is a lightweight, privacy-first personal finance tracker for Thai and English users. It lets people log daily expenses and income, visualize spending by category and time window, and auto-fill entries from photos or PDF receipts using their own AI provider (OpenAI, OpenRouter, Google Gemini, Grok, etc.).
All data —  is stored in suprabase. (including AI API keys, or other best choice.)
## 2. Goals & Non-Goals
**Goals**
- Make logging an expense or income take under 5 seconds.
- Provide instant visibility into today / week / month / year cash flow.
- Turn a phone photo or PDF slip into a categorized entry via AI.
- Support Thai (default) and English users with THB formatting.
- Keep user data in suprabase.
- Connect with telegrame for read receipt/slips picture 
- Use UI/UX design as picture 
- Multi-device sync or cloud accounts.
- Budgeting, goals, recurring bills, credie card or bank imports.
**Non-Goals (v1)**
- Multi-currency support.
- Sharing / collaboration.
## 3. Target Users
- Thai consumers who track daily expenses (street food, transit, bills) on mobile.
- Bilingual freelancers who need a quick monthly income vs. expense view.
- Users comfortable bringing their own AI API key in exchange for OCR/slip parsing and receipt/slips from telegrame bot .
## 4. User Stories
1. As a user, I can add an **expense** or **income** with amount, category, note, and date in one dialog.
2. As a user, I can **edit, delete, and sort** existing entries directly from the list.
3. As a user, I can see **Today, 7-day, This Month, This Year, and Net** totals at a glance.
4. As a user, I can see **spending broken down by category**.
5. As a user, I can **scan a receipt** — camera photo, gallery image, or PDF — and have the amount, category, merchant, type of payment, and date pre-filled.
6. As a user, I can **configure my AI provider** (OpenAI / OpenRouter / Google / Grok / ect.), paste an API key, and pick a **vision-capable model** fetched live from the provider.
7. As a user, I can **test the AI connection** before relying on it.
8. As a user, I can **switch between Thai and English** and between **light and dark** themes.
## 5. Functional Requirements
### 5.1 Entry Management
- Create, read, update, delete for both `expense` and `income` entries.
- Fields: `id`, `amount`, `category`, `note`, `date` (ISO), `kind` (`expense` | `income`).
- Sort by date (new→old, old→new) and by amount (high→low, low→high).
- Categories:
  - Expense: food, transport, shopping, bills, entertainment, health, education, other.
  - Income: salary, bonus, investment, gift, otherIncome.
- Persist to `localStorage` under key `expense-tracker-v1`.
### 5.2 Summary & Analytics
- Summary cards: Today spent, 7-day spent, This-Month spent, This-Year spent, Month income, Year income, Net (income − expense).
- Category breakdown (expenses only) with per-category totals and share of spend.
- All amounts formatted as THB via `Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" })`.
### 5.3 AI Slip Scanning
- **Inputs:** Camera capture (mobile), image upload (JPEG/PNG/WebP), and PDF upload.
- **PDF handling:** Convert up to the first 5 pages to JPEG via `pdfjs-dist`, send all frames to the vision model in one request.
- **Providers:** OpenAI, OpenRouter, Google Gemini, xAI Grok.
- **Model discovery:** On API-key entry (debounced) fetch the provider's model list, cache in `localStorage`, prefer vision-capable models, and auto-select the first vision model if the saved one is missing.
- **Key hygiene:** Strip `Bearer ` prefix and whitespace; block OpenAI keys pasted into OpenRouter and vice versa (`keyIssue()`).
- **Output contract:** `{ amount: number, category: CategoryId, merchant?: string, note?: string, date: YYYY-MM-DD }` — prefilled into the Add-Expense dialog for user confirmation before saving.
- **Test connection** button validates the key + model combo before real use.
### 5.4 Internationalization & Theming
- Languages: Thai (default), English. Persisted under `lang`.
- Themes: Light / Dark, respects `prefers-color-scheme` on first load, persisted under `theme`.
### 5.5 Privacy
- No backend. No analytics beacon for user data.
- API keys stored only in `localStorage`; a visible notice states so.
- Slip images/PDFs are sent **directly from the browser** to the user's chosen AI provider.
## 6. Non-Functional Requirements
- **Performance:** First render < 2 s on mid-range mobile; sub-100 ms interactions after hydration.
- **Responsive:** Mobile-first layout; floating action bar at the bottom on all screens.
- **Accessibility:** All actions reachable by keyboard; semantic labels on icons; sufficient color contrast in both themes.
- **Reliability:** LocalStorage writes debounced and guarded to avoid data loss on hydration.
- **SEO:** Route-level `<title>` and meta description set in `__root.tsx`.
## 7. Tech Stack
- **Framework:** TanStack Start (React 19, Vite 7) with file-based routing.
- **Styling:** Tailwind CSS v4 + shadcn/ui components.
- **State:** Local React state + `localStorage`; no server DB.
- **PDF:** `pdfjs-dist` for page-to-image rendering.
- **Toasts:** `sonner`.
- **Runtime target:** Static/edge (Cloudflare Workers via TanStack Start).
## 8. Key Screens / Components
| Area | Component |
| --- | --- |
| App shell | `src/routes/__root.tsx`, `src/routes/index.tsx` |
| Header (theme, language, AI settings) | `Header.tsx`, `AISettingsDialog.tsx` |
| Totals | `SummaryCards.tsx` |
| Category chart | `CategoryBreakdown.tsx` |
| List + edit/delete/sort | `ExpenseList.tsx` |
| Add / edit entry | `AddExpenseDialog.tsx` |
| Slip scanner | `ScanSlipDialog.tsx` |
| Domain logic | `lib/expenses.ts`, `lib/ai-providers.ts`, `lib/pdf-to-images.ts`, `lib/i18n.tsx`, `lib/theme.tsx` |
## 9. Success Metrics
- ≥ 70% of new users log a second entry within 24 hours.
- ≥ 30% of active users configure an AI provider and successfully scan at least one slip.
- < 2% error rate on `analyzeSlip` calls after model auto-selection.
- Median time from "open Add dialog" to "entry saved" under 8 seconds.
## 10. Release Milestones
- **M1 — Core tracker (shipped):** entries CRUD, categories, summary cards, i18n, theme.
- **M2 — AI slip scanning (shipped):** multi-provider config, image + PDF, dynamic model list.
- **M3 — Income tracking (shipped):** income entries, net balance, monthly/yearly income cards.
- **M4 — Reliability polish (shipped):** key normalization, provider-specific validation, connection test.
- **M5 — Next:** CSV export/import, recurring entries, budget targets, PWA install.
## 11. Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| User pastes wrong key type into provider | `keyIssue()` validates prefix before request |
| Provider changes model IDs | Live `fetchModels()` + cache + refresh button |
| Large PDFs slow analysis | Cap at 5 pages, downscale to JPEG before upload |
| LocalStorage cleared → data loss | Add CSV export in M5 |
| Vision model returns bad JSON | Prefill dialog lets user correct before save |
## 12. Open Questions
- Should we add optional Lovable Cloud sync for users who want multi-device?
- Do we ship a hosted AI gateway option so users don't need their own key?
- Which additional locales (JA, ID, VI) are highest priority after TH/EN?
