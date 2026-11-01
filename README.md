# IZEX — Animal Hospital Management System

A professional, animated web application for managing an animal hospital:
clients, patients, appointments, medical records, prescriptions (with a
weight-based dosing calculator), inventory, billing, and reports.

## Run it

**Option A — just open it:** double-click `index.html` (or drag it into Chrome/Edge).

**Option B — local server (optional):** any static server works, e.g. VS Code "Live Server".

No installation, no build step, no dependencies. The app starts **empty** — no
clients, patients or records — and everything you enter is stored in your
browser's localStorage. Use **Load sample data** at the bottom of the sidebar to
explore a realistic demo dataset, and **Clear all data** to wipe everything and
start fresh.

## What's inside

| Module | Highlights |
|---|---|
| Dashboard | Animated KPI cards, revenue chart, species mix, today's schedule, alerts |
| Appointments | Interactive week calendar, drag-free booking, check-in flow, list view |
| Clients | Searchable table, slide-over profile with pets, balance, contact log |
| Patients | Species filter, patient cards, weight-history chart, vaccination tracker |
| Records | SOAP note editor with draft/sign workflow and timeline |
| Prescriptions | Dose calculator (weight x formulary rule), allergy warnings, statuses |
| Inventory | Stock levels with animated meters, lot/expiry tracking, receive stock |
| Billing | Invoices, split payments, aging, live totals, print-ready bill (PKR) |
| Reports | Revenue, productivity, no-shows, CSV export |

## Design & animation notes

- Design system: custom CSS variables, light + dark theme (toggle in the top bar).
- Animations: route progress bar, page transitions, staggered entrances, animated
  SVG charts (line-draw, growing bars, donut sweep), count-up KPIs, sliding drawers,
  scale-in modals, toasts, button ripples, shimmer skeletons, live "now" indicator
  on the calendar.
- Respects `prefers-reduced-motion`.

## Files

```
index.html          Shell + splash screen
css/styles.css      Design system, layout, all animations
js/icons.js         Inline SVG icon set
js/data.js          Reference config, empty + sample data, formatting helpers
js/store.js         State, localStorage persistence, queries
js/ui.js            Toasts, modals, drawers, chips, count-up, ripple
js/charts.js        Animated SVG charts (area, bars, donut, hbar)
js/actions.js       Shared dialogs (appointment, client, patient, invoice, payment)
js/views/*.js       One file per module
js/router.js        Hash router with animated transitions
js/app.js           Bootstrap: sidebar, top bar, search, theme, notifications
```

> Note: this is a self-contained front-end app. It opens with an empty practice;
> sample data is optional (sidebar → Load sample data). Currency (PKR / Rs), tax
> rate, and services are configurable in `js/data.js` (`Data.currency`,
> `Data.taxRate`, `Data.services`). The practice runs with a single veterinarian
> (`Seed.staff`).
