# Deploying Pesawise for free 🚀

> **Live now → https://pesawise-7owg.onrender.com/**

This hosts the whole app on **free tiers**: one **Render** web service (the API also
serves the web app) + a free **Neon** Postgres database. Pushes to `main`
auto-deploy a **preview**; the **production** deploy waits for **your approval**.

> Heads-up: free web services **sleep after ~15 min idle**, so the first request
> after a nap takes ~30–60s to wake. Perfect for a demo/portfolio.

---

## 1. Create the database (Neon — free, persistent)
1. Sign up at **https://neon.tech** (free, no card).
2. **Create a project** (name it `pesawise`, pick a region near you).
3. Copy the **connection string** — it looks like:
   `postgresql://user:pass@ep-xxx-123.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   Keep it handy — this is your `DATABASE_URL`.

*(Optional but recommended: create a second project/branch for the preview
service so preview data can't touch production.)*

## 2. Create the hosting (Render — free)
1. Sign up at **https://render.com** (free, no card) and **connect your GitHub**.
2. **New → Blueprint**, pick the `pesawise-finance-tracker` repo. Render reads
   [`render.yaml`](./render.yaml) and proposes two services: **pesawise**
   (production) and **pesawise-preview**.
3. Click **Apply**. When prompted for the **`DATABASE_URL`** on each service,
   paste your Neon string. (`JWT_SECRET` is generated automatically.)

*(Prefer clicking over blueprints? Instead do **New → Web Service** → your repo →
Runtime **Docker** → add env vars `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`,
`AUTO_SEED=true`. Repeat for a second service if you want a preview.)*

## 3. First deploy
- Render builds the Docker image (~3–5 min) and starts the service.
- On first boot the entrypoint **runs database migrations** (which own the
  schema), then **seeds the demo personas** once.
- Open the service URL (e.g. `https://pesawise.onrender.com`) and log in with any
  persona — e.g. **faith@pesawise.co.ke / pesa1234** (see the login screen).

That's it — your site is live. ✅

### Migrating a database that predates migrations
Fresh databases just work — the migrations create everything. But a database
that was **already created by the old `synchronize` mode** (e.g. the existing
live demo) already has the tables, so the first `InitialSchema` migration would
collide. Reconcile it **once**, either way:

- **Simplest (demo data is disposable):** in Neon, drop the tables (or reset the
  branch). The next deploy migrates from scratch and `AUTO_SEED` re-seeds.
- **Preserve the data (fake-apply the baseline):** run this against the DB once,
  so only the *new* migration executes on the next deploy:
  ```sql
  CREATE TABLE IF NOT EXISTS migrations
    (id SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, name varchar NOT NULL);
  INSERT INTO migrations("timestamp", name)
    VALUES (1783870148522, 'InitialSchema1783870148522');
  ```
  The entrypoint tolerates a failed migration run (it logs and still boots), so
  an un-reconciled service stays up — but its schema won't gain the new columns
  until you do one of the above.

> **First deploy of a new schema can briefly 500.** During a rollout the new web
> process may start serving *before* `migration:run` finishes creating the new
> tables/columns, so requests that touch them (e.g. login writing a refresh
> token) can return a short-lived 500. It clears on its own once migrations
> complete — wait ~30–60s and retry before assuming a real failure. If it
> *persists*, that database needs the reconcile above (its migrations never ran).

---

## 4. CI/CD: auto-preview + approve production
The preview service already **auto-deploys on every push** to `main`.
To gate **production** behind your approval:

1. **Render → `pesawise` (prod) → Settings → Deploy Hook** → copy the URL.
2. **GitHub → repo → Settings → Secrets and variables → Actions → New secret**
   → name `RENDER_DEPLOY_HOOK_PROD`, value = that URL.
3. **GitHub → Settings → Environments → New environment → `production`** →
   enable **Required reviewers** and add yourself.

> **The secret is required, and its absence is silent.** If
> `RENDER_DEPLOY_HOOK_PROD` isn't set, the `deploy-production` step logs
> `RENDER_DEPLOY_HOOK_PROD secret not set — skipping.` and **exits 0** — the job
> shows ✅ green but production is **never deployed**. If a merge to `main` doesn't
> show up in prod, check that this secret exists first. (To deploy without it,
> POST the hook URL manually: `curl -X POST "<hook-url>"`, or use Render →
> service → **Manual Deploy → Deploy latest commit**.)

Now the flow on every push to `main`:
- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) builds & type-checks both apps.
- **pesawise-preview** redeploys automatically → check it.
- The **deploy-production** job **pauses for your approval** in the Actions tab.
  Click **Review deployments → Approve** → it triggers the Render prod deploy hook
  → production goes live.

*(Want plain auto-deploy to prod instead? Set `autoDeploy: true` on the `pesawise`
service in `render.yaml`, or just flip it in the Render dashboard — then you can
ignore the approval steps.)*

---

## Notes
- **Keep it awake (optional):** free services sleep. A free uptime pinger
  (e.g. UptimeRobot hitting `/` every 10 min) avoids cold starts.
- **Secrets:** never commit real secrets — `DATABASE_URL` is set in the dashboard,
  `JWT_SECRET` is generated by Render. `.env` stays git-ignored.
- **Reset demo data:** in Neon, drop the tables (or reset the branch); the next
  boot re-seeds. `AUTO_SEED` only seeds when the users table is empty.
- **Custom domain:** Render → service → Settings → Custom Domains (free).
- **Local dev is unchanged:** `docker compose up --build` (http://localhost:8080)
  still uses the per-service Dockerfiles; this single-service `Dockerfile` +
  `render.yaml` are only for hosting.
