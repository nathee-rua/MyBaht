### Hard constraints:
- Refactor UI layer only.
- Use Tailwind utility classes for styling/layout only.
- Do not change business logic.
- Do not change API calls, Supabase logic, i18n logic, calculations, event handlers, dialog behavior, or routing behavior.
- Do not rename functions, props, state variables, or exported component names.
- Do not add unnecessary dependencies.
- Avoid unsafe dynamic Tailwind classes like bg-${color}, text-${size}, mt-${n}.
- Keep the result compatible with Next.js + Vercel production builds.
- If a style cannot be safely converted to Tailwind, keep it inline.
- Output only reviewable UI changes and explain what was intentionally left untouched.

# layout.tsx
Refactor only the UI layer of `layout.tsx` using Tailwind utility classes.

Goal:
Create a cleaner mobile app shell for a premium personal finance app.

Improve:
- mobile viewport layout
- page background treatment
- spacing around content
- bottom safe area above the bottom navigation
- overall visual polish and consistency

Keep unchanged:
- exported component name
- children rendering
- BottomNav usage
- layout behavior and app structure

Important:
- do not change routing or layout logic
- do not add new state
- do not alter BottomNav behavior
- use Tailwind only for presentation

Return:
- updated file
- short UI-only summary

## 2. SummaryCards-5.tsx
Refactor only the UI layer of `SummaryCards-5.tsx` using Tailwind utility classes.

Component purpose:
Show 3 premium mobile summary cards for income, expense, and total balance.

Improve:
- stronger card framing
- consistent height and padding
- larger money hierarchy
- better readability for labels
- balanced icon sizing
- premium fintech look
- reduced visual clutter
- consistent spacing between cards

Design targets:
- card radius around 18px
- compact but premium card layout
- amounts visually dominant
- labels readable at 11–12px minimum
- semantic green/red colors only where meaningful
- total card should feel stable and trustworthy

Keep unchanged:
- component name
- props: income, expense, total
- formatting logic
- translation usage
- value calculation behavior

Important:
- do not touch logic
- do not rename props
- do not change output data
- Tailwind classes only for styling/layout

Return:
- updated component
- a short explanation of UI-only changes

## 3) TransactionItem-6.tsx
Refactor only the UI layer of `TransactionItem-6.tsx` using Tailwind utility classes.

Component purpose:
Render a single transaction row in a premium mobile finance app.

Improve:
- row spacing and density
- category icon framing
- hierarchy between title, note, payment method, merchant, and amount
- readability of secondary metadata
- cleaner action button styling
- more polished touch target sizing
- better visual separation without making the row heavy

Keep unchanged:
- component name
- props and prop names
- category icon mapping logic
- amount formatting logic
- onClick / onEdit / onDelete behavior
- transaction data usage

Important:
- do not change event behavior
- do not change data rendering logic
- do not alter translation keys
- use Tailwind only for presentation

Return:
- updated component
- concise summary of UI changes only

## 4) DateSelector-4.tsx
Refactor only the UI layer of `DateSelector-4.tsx` using Tailwind utility classes.

Component purpose:
Display a mobile date selector with previous/next controls and formatted date text.

Improve:
- button sizing and touch targets
- layout balance between arrows and center date display
- date chip / surface styling
- visual consistency with a premium fintech app
- typography readability
- calm, clean mobile-first look

Keep unchanged:
- component name
- props and prop names
- handlePrev logic
- handleNext logic
- getFormattedDate logic
- filter behavior

Important:
- do not change date logic
- do not change filter behavior
- use Tailwind only for styling and layout
- keep component compatibility with existing consumers

Return:
- updated component
- short explanation of UI-only changes

## 5) page-9.tsx — Stats page
Refactor only the UI layer of `page-9.tsx` using Tailwind utility classes.

Page purpose:
A mobile statistics dashboard for a personal finance app with tabs, mini calendar, KPI cards, donut chart, category breakdown, trend chart, and line chart.

Improve:
- top tab bar styling
- month header clarity
- mini calendar spacing and touch targets
- selected day state styling
- KPI card framing and hierarchy
- cleaner visual relationship between totals, donut chart, category share, and trend charts
- reduced clutter and tiny text
- more premium fintech look
- consistent card, border, shadow, and spacing system

Keep unchanged:
- component name
- activeTab logic
- currentDate / selectedDay state logic
- fetchTransactions logic
- chart data flow
- filtering logic
- AddTransactionDialog behavior
- all existing feature behavior

Important:
- do not modify calculations or useMemo logic
- do not alter chart props or chart data structure
- do not change event handlers
- avoid dynamic Tailwind classes
- use Tailwind only for UI/presentation changes

If needed:
- keep any non-safe dynamic styling inline
- explain why it remains inline

Return:
- updated file
- UI-only summary of changes
- list of intentionally untouched logic sections

## 6) page-7.tsx — Monthly overview / detail / AI summary
