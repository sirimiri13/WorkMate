<p align="center">
  <img src="public/logo.svg" width="72" alt="WorkMate logo" />
</p>

<h1 align="center">WorkMate</h1>

<p align="center">
  An AI-assisted platform for HR and employee unions to run internal events end to end.<br />
  Bilingual: English / Tiếng Việt.
</p>

---

Union and HR teams usually juggle spreadsheets and chat threads to remember birthdays, plan celebrations, collect sign-ups, order food and track spending. WorkMate puts that whole flow in one place:

> **Import employees → Track occasions → Reminders → AI suggestions → Plan → Sign-up & check-in → Food orders → Wrap-up**

## Features

**For the union / HR (admin view)**

- **Employees** – Import from CSV (Vietnamese or English headers, row-level validation, upsert by employee code or email), search and filter by department.
- **Occasion tracking** – Birthdays, work anniversaries and custom special dates (e.g. Women's Day for female employees only) for the next 30 days.
- **Smart reminders** – Per-type rules: remind N days ahead, batch into one message or send one per occasion, choose channels.
- **AI activity planning** – Pick one or more occasions and get 3 distinct options based on headcount, budget, past activities (with ratings) and your vendor list. Each option comes with a cost estimate, vendors, a checklist with due dates and a ready-to-send announcement. Free-text notes (e.g. "3 vegetarians, after 5 PM") are treated as hard requirements.
- **Activity management** – Checklist, participant list with manual check-in, aggregated food orders ready to send to the vendor, expenses by fund source with invoice numbers, and a check-in QR code.
- **Vendors** – Restaurants, drinks, cakes and gifts, with menus, prices and whether they can issue VAT invoices.
- **Budget** – Quarterly budget with spending tracked across activities.

**For employees**

- See upcoming activities, sign up or decline.
- Pick food and drinks with notes (less ice, 50% sugar…).
- Check in by scanning the QR code at the event.
- Rate the activity afterwards.

## Tech stack

- [React 19](https://react.dev) + [Vite](https://vite.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Zustand](https://zustand.docs.pmnd.rs) for state, persisted to `localStorage`
- [i18next](https://www.i18next.com) / react-i18next for EN/VI
- [Zod](https://zod.dev) for validating AI input and output
- AI: [Gemini API](https://ai.google.dev) (default) or [Claude API](https://docs.anthropic.com), called from a serverless function so the key never reaches the browser
- Deploys to [Vercel](https://vercel.com) (static site + `/api` functions)

## Getting started

Requires Node.js 20+.

```bash
git clone https://github.com/sirimiri13/WorkMate.git
cd WorkMate
npm install
cp .env.example .env   # optional, see below
npm run dev
```

Open http://localhost:5173. The app ships with demo data generated relative to today's date, so there are always upcoming occasions to play with. Use **Settings → Reset demo data** to start over, and the date picker on the Overview page to simulate another day.

### AI configuration

Set one of these in `.env`:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Used first when set. |
| `GEMINI_MODEL` | Optional. Primary model, defaults to `gemini-3.8-flash`. |
| `GEMINI_FALLBACK_MODELS` | Optional. Comma-separated models tried in order when the previous one is overloaded or slow. Defaults to `gemini-3.6-flash,gemini-3.5-flash-lite`. |
| `ANTHROPIC_API_KEY` | Claude API key. Used when no Gemini key is set. |

With no key at all, `/api/recommend` returns built-in sample suggestions, so the whole app still works for demos.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (also serves the `/api` functions locally) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build (without `/api`) |
| `npm run typecheck` | Type-check only |

## Importing employees

Download the sample file from the Employees page (`public/sample-employees.csv`). Supported columns, in Vietnamese or English:

| Field | Accepted headers |
|---|---|
| Employee code | `code`, `employee_code`, `ma_nv` |
| Full name (required) | `full_name`, `name`, `ho_ten` |
| Email | `email` |
| Department | `department`, `phong_ban` |
| Position | `position`, `title`, `chuc_vu` |
| Birth date (required) | `birth_date`, `dob`, `ngay_sinh` |
| Join date (required) | `join_date`, `start_date`, `ngay_vao` |
| Gender | `gender`, `gioi_tinh` (`male`/`female`, `nam`/`nữ`) |
| Status | `status`, `trang_thai` |

Dates can be `yyyy-MM-dd`, `dd/MM/yyyy` or `dd-MM-yyyy`.

## Project structure

```
api/recommend.ts         Serverless function: calls Gemini/Claude, falls back to sample suggestions
shared/recommendation.ts Prompt, JSON schema and sample suggestions shared by client and server
src/
  components/            Layout and UI primitives
  i18n/                  i18next setup, vi.ts (source of truth) and en.ts
  lib/                   Store, occasion/reminder logic, CSV import, formatting, demo seed
  pages/admin/           Overview, Employees, Activities, Plan with AI, Vendors, Settings
  pages/me/              Employee view: my activities, check-in
```

Translation keys are type-checked: `en.ts` must contain every key in `vi.ts`, and a mistyped key in `t("...")` fails `tsc`.

## Deploying to Vercel

1. Import the repository in Vercel. The defaults for Vite work as is.
2. Add `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) under **Settings → Environment Variables**.
3. Deploy. `vercel.json` already routes client-side paths to `index.html` and leaves `/api/*` to the functions.

## Current limitations

This is an MVP built for demos:

- All data lives in the browser's `localStorage`, so it isn't shared between devices or users.
- There is no authentication; the role (union / employee) and the current employee are picked from the header.
- Email and Slack reminder channels are simulated; reminders appear in the app only and are triggered with a button.
- QR check-in does not block check-ins outside the event time.
