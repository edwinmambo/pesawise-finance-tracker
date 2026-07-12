# Pesawise 🇰🇪

**Money, wisely tracked.** A beautiful, mobile-friendly personal-finance tracker built for
the Kenyan market — income, expenses, loans, savings **and budgets**, all in KES.

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-pesawise-10a37f?style=for-the-badge)](https://pesawise-7owg.onrender.com/)

![Angular](https://img.shields.io/badge/Angular-21-dd0031) ![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3) ![NestJS](https://img.shields.io/badge/NestJS-11-e0234e) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Docker](https://img.shields.io/badge/Docker-one--command-2496ed)

> **▶ Try it live → https://pesawise-7owg.onrender.com/** — log in with any persona (e.g. `faith@pesawise.co.ke` / `pesa1234`). It runs on a free tier, so the first load after it's been idle can take **~30–60s** to wake up.

---

## 🚀 One command to run everything

You need **Docker Desktop** — nothing else. From the project root:

```bash
docker compose up --build
```

_(or `./run.ps1` on Windows / `./run.sh` on macOS/Linux)_

That single command builds and starts **three** containers:

| Service | What it is | URL |
|---------|------------|-----|
| `db` | PostgreSQL 16 | localhost:5433 |
| `backend` | NestJS API (auto-seeds demo data on first boot) | localhost:3000/api |
| `frontend` | Angular app served by nginx (proxies `/api`) | **http://localhost:8080** |

Open **http://localhost:8080** and tap any persona to log in instantly. The API seeds
the demo personas **once** on first boot and skips re-seeding on later restarts, so your
data survives `docker compose down` / `up` (the Postgres volume persists it).

To wipe everything and start fresh:

```bash
docker compose down -v && docker compose up --build
```

---

## ☁️ Host it for free

Want it online? **[DEPLOY.md](./DEPLOY.md)** walks through free-tier hosting on
**Render** (one service — the API also serves the web app) + a free **Neon**
Postgres, with GitHub CI that auto-deploys a preview and waits for your approval
before production. The single-service [`Dockerfile`](./Dockerfile) +
[`render.yaml`](./render.yaml) are included.

## 👥 Personas (preloaded, each with its own budget plan)

Every persona has realistic Kenyan accounts, ~6 months of transactions, loans, savings
goals and an applied budget. **Tap a card on the login screen** — or use these logins:

| Persona | Who they are | Budget plan | Login |
|---------|--------------|-------------|-------|
| 🎓 **Brian Otieno** | University student (comrade) | Comrade | `brian@pesawise.co.ke` / `pesa1234` |
| 💪 **Kevin Mwangi** | Casual / gig worker | Hustler | `kevin@pesawise.co.ke` / `pesa1234` |
| 💼 **Faith Njeri** | Salaried marketing manager | Corporate | `faith@pesawise.co.ke` / `pesa1234` |
| 🏍️ **Peter Kamau** | Boda boda rider | Hustler | `peter@pesawise.co.ke` / `pesa1234` |
| 🥬 **Susan Achieng** | Mama Mboga (market vendor) | Hustler | `susan@pesawise.co.ke` / `pesa1234` |
| ✈️ **James Kariuki** | Diaspora sender (Qatar) | Corporate | `james@pesawise.co.ke` / `pesa1234` |
| 🌿 **Wanjiku Kamau** | Classic demo (salaried) | Corporate | `demo@pesawise.co.ke` / `demo1234` |

---

## ✨ Features

- 📊 **Dashboard** — net worth, income vs expenses (6-month chart), spending by category, a **budget snapshot**, savings & loan summaries, recent activity
- 💳 **Transactions** — income/expense with **M-Pesa / Bank / Cash / SACCO** channels, M-Pesa references, Kenyan categories, filtering & search; **card layout on mobile**
- 🧮 **Budgets** — apply a ready-made **Comrade** (students), **Hustler** (casual/gig workers) or **Corporate** (salaried) plan, or **build your own** with per-category limits and live spend-vs-limit tracking; each budget is **themed by its own colour**
- 📅 **Calendar** — a month grid of daily income/spending (heat-tinted), with day drill-down and quick-add on any date
- 🏦 **Loans** — bank / mobile-app / SACCO loans with **flat & reducing-balance interest**, repayment progress & history; **themed in each lender's brand colour** (KCB, Equity, Absa…)
- 🎯 **Savings goals** — goal-based saving with progress rings and projected targets
- 📈 **Reports** — period analysis, top categories, spending by channel, savings rate
- 🎨 **Themes** — Light & softened-Dark modes × 4 accent palettes (Emerald, Ocean, Violet, Sunset), from a Google-style profile menu
- 💱 **Multi-currency display** — switch symbol & formatting (KES, USD, EUR, GBP, TZS, UGX, ZAR, NGN)
- 🙈 **Privacy** — balances hidden by default; tap the eye to reveal
- ⚙️ **Settings** — accounts, categories (with an emoji + colour picker), and profile
- 🔐 **Auth** — email + password with JWT, per-user data isolation
- 📱 **Mobile-first** — responsive Bootstrap 5 UI with an off-canvas menu and card layouts; looks great on phones & desktop, light or dark

---

## 🧱 Tech stack

| Layer | Tech |
|-------|------|
| Frontend | **Angular 21** (standalone, signals, zoneless) + **Bootstrap 5.3** + Bootstrap Icons + **Plus Jakarta Sans**, hand-built animated SVG charts |
| Backend | **NestJS 11** + TypeORM, JWT auth |
| Database | **PostgreSQL 16** |
| Orchestration | **Docker Compose** (one command, nginx-served frontend proxying the API) |

```
pesawise/
├── backend/           NestJS API (auth, accounts, transactions, budgets, loans, savings, dashboard)
│   ├── Dockerfile         multi-stage build → node runtime, auto-seed entrypoint
│   └── src/database/seed.ts  7 personas with tailored Kenyan data + budgets
├── frontend/          Angular + Bootstrap 5 app
│   ├── Dockerfile         build → nginx
│   └── nginx.conf         SPA + /api reverse proxy
├── docker-compose.yml one command runs db + backend + frontend
└── run.ps1 / run.sh   convenience wrappers
```

---

## 🛠️ Local development (without Docker)

Prefer live-reload while hacking? Run the pieces directly.

**1. Database** (Docker just for Postgres):
```bash
docker compose up -d db
```

**2. Backend** (terminal 1):
```bash
cd backend
npm install
npm run seed        # loads all 7 personas
npm run start:dev   # http://localhost:3000/api
```

**3. Frontend** (terminal 2):
```bash
cd frontend
npm install
npm start           # http://localhost:4200  (proxies /api → :3000)
```

Re-running `npm run seed` refreshes the demo data.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` to override defaults (Docker Compose reads it automatically).

| Var | Default | Notes |
|-----|---------|-------|
| `DB_HOST_PORT` | `5433` | Host port for the Dockerized Postgres |
| `WEB_HOST_PORT` | `8080` | Host port for the web app (8080 dodges Windows reserved ranges) |
| `API_HOST_PORT` | `3000` | Host port for the API |
| `JWT_SECRET` | `change-me-in-production` | **Change in production** |
| `AUTO_SEED` | `true` | Seed personas on first boot |

> **Dev note:** TypeORM `synchronize: true` auto-creates the schema. Switch to migrations before any production deployment.

---

Built with care for the Kenyan shilling. Karibu. 🌿
