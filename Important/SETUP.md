# MAKERSIGNAL — Setup guide (for a new computer)

This guide takes you from nothing to the app running on your own computer, with a database full of realistic sample users. It takes about 20–30 minutes the first time (most of it is downloads).

You don't need any accounts or keys to run it locally. Everything runs on your machine.

---

## What you'll end up with

| What | Address |
|---|---|
| The MAKERSIGNAL app | http://localhost:3000 |
| Database admin (Supabase Studio) | http://127.0.0.1:54323 |
| Local test inbox (emails the app sends) | http://127.0.0.1:54324 |

---

## Step 1 — Install the tools (one time)

| Tool | Why | Get it |
|---|---|---|
| **Node.js 20.9 or newer** (version 22 or 24 recommended) | Runs the app | https://nodejs.org → download the **LTS** version and install |
| **Docker Desktop** | Runs the database on your computer | https://www.docker.com/products/docker-desktop → install, then **open it** and wait until it says it's running |
| **A code editor** (optional) | To view/edit files | e.g. VS Code: https://code.visualstudio.com |
| **Git** (optional) | Only if you receive the code as a Git repository | https://git-scm.com |

Check Node is installed — open a **Terminal** (macOS/Linux) or **PowerShell** (Windows) and run:

```bash
node -v      # should print v20.9 or higher
npm -v
docker -v
```

> **Windows users:** Docker Desktop needs WSL 2 enabled (the installer offers to set it up). Run the commands below in PowerShell or the VS Code terminal.

> **Docker memory:** give Docker at least 4 GB of RAM (Docker Desktop → Settings → Resources).

---

## Step 2 — Get the code

You'll receive the project as a folder (or zip) called `makersignal`, or as a Git repository.

- **Folder / zip:** unzip it somewhere easy, e.g. `Documents/makersignal`.
- **Git:** `git clone <repository-url> makersignal`

Then open a terminal **inside** that folder (the one that contains `package.json`):

```bash
cd path/to/makersignal
```

> If you were sent a copy that includes `node_modules`, `.next` or `.env.local` folders/files, delete them — they're machine-specific and will be recreated.

---

## Step 3 — Install the app's packages

```bash
npm install
```

This downloads everything listed in `package.json` (a few minutes the first time). Warnings are normal; errors are not — see Troubleshooting.

---

## Step 4 — Start the local database

Make sure **Docker Desktop is open and running**, then:

```bash
npm run db:start
```

The first run downloads the database images (several minutes). When it finishes it prints a block of settings. You can see them again any time with:

```bash
npx supabase status
```

Keep this output handy for the next step.

---

## Step 5 — Create the `.env.local` file

The app reads its settings from a file you create yourself, named exactly **`.env.local`**, in the **same folder as `package.json`**. A template is included as `.env.example`.

**Create it by copying the template:**

| System | Command |
|---|---|
| macOS / Linux | `cp .env.example .env.local` |
| Windows (PowerShell) | `Copy-Item .env.example .env.local` |

> The name must be exactly `.env.local` — starting with a dot, no `.txt` at the end. On Windows, if you create it in Notepad, choose "Save as type: All files".

---

## Step 6 — Fill in `.env.local`

Open `.env.local` in your editor. Only **two values must be changed** for local use; the rest can stay as they are.

### Must change

| Setting | What to put | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The long key starting `sb_publishable_…` | `PUBLISHABLE_KEY` in the output of `npx supabase status` |
| `SUPABASE_SECRET_KEY` | The long key starting `sb_secret_…` | `SECRET_KEY` in the output of `npx supabase status` |

Replace the whole `<PASTE …>` text including the `<` `>` brackets. Example of the finished lines:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AbC123…
SUPABASE_SECRET_KEY=sb_secret_XyZ789…
```

### Every setting explained

| Setting | Default | What it does | When to change it |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | The address of the app. Used inside sign-up and password-reset links. | Only when you deploy the app to a real web address (e.g. `https://makersignal.com`). |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` | Where the database/login service is. | Only when using a hosted Supabase project (then use its "Project URL"). Locally it's `API_URL` from `npx supabase status`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(paste)* | Public key the browser uses to talk to Supabase. Safe to expose — access is still limited by database security rules. | Always set it. |
| `SUPABASE_SECRET_KEY` | *(paste)* | Powerful **server-only** key, used for a few admin tasks (e.g. creating the on-screen sign-up codes). | Always set it. **Never share it or put it in public code.** |
| `DEV_SHOW_EMAIL_CODES` | `true` | **Temporary helper.** When `true`, the 6-digit sign-up and password-reset codes are shown on the screen, so you don't need email set up. | Set to `false` once real email sending is configured (production). |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` | Turns on the "Continue with Google" button. | Set to `true` only after Google sign-in keys are configured (see README §12). |
| `ANTHROPIC_API_KEY` | *(empty)* | Key for the AI features (brief simulator, AI summaries). Leave empty to run without AI — those buttons will say "unavailable" and everything else works. | Add your key from https://console.anthropic.com if you want AI features. |
| `AI_MODEL` | `claude-opus-5-5` | Which Claude model the AI features use. | Optional — e.g. `claude-sonnet-5-5` for lower cost. |
| `AI_EFFORT` | `medium` | How much the AI "thinks": `low`, `medium` or `high`. | Optional. |
| `AI_TIMEOUT_MS` | `60000` | How long (in milliseconds) to wait for an AI response before giving up. | Rarely. |
| `AI_DAILY_LIMIT_PER_USER` | `40` | Maximum AI actions per user per day (cost control). | Optional. |

Save the file.

> Whenever you change `.env.local`, stop the app (`Ctrl + C`) and start it again with `npm run dev`.

---

## Step 7 — Build the database and load the sample data

```bash
npm run db:reset
```

This builds every table from **`supabase/migrations/20261009000000_schema.sql`** (the single schema file) and then loads the sample users and activity from **`supabase/seed.sql`** (the single seed file).

You can run it again any time to get back to a clean sample-data state. **It erases all local data** (including accounts you created yourself).

---

## Step 8 — Start the app

```bash
npm run dev
```

Wait for `Ready`, then open **http://localhost:3000** in your browser.

To stop the app: press `Ctrl + C` in the terminal.

---

## Step 9 — Log in with a sample account

Go to **http://localhost:3000/auth/login**. All sample emails use `example.com` (reserved — it never receives mail) and are already confirmed. The password is always the first name + `@2026`.

### Creators

| Name | Email | Password | What's interesting about this account |
|---|---|---|---|
| **Aman** | `aman@example.com` | `Aman@2026` | Story-driven video creator (Mumbai). Has a **completed project** with Kapoor Organics, two 5★ reviews, agreed usage rights, and a proposal + invitation for the Northpeak trek film. |
| **Riya Sharma** | `riya.sharma@example.com` | `Riya@2026` | Fashion & lifestyle photographer (Delhi). Proposal **under review** at Northpeak Gear with an ongoing conversation. |
| **Arjun Mehta** | `arjun.mehta@example.com` | `Arjun@2026` | Tech explainer & motion creator (Bengaluru). Has a **pending invitation** from Lumen Skin. |
| **Zoya Khan** | `zoya.khan@example.com` | `Zoya@2026` | Food & UGC creator (Hyderabad). **Active project** with Bloom Beauty: version 2 waiting for review, milestones, usage rights awaiting her approval. |
| Maya Okafor | `maya.okafor@example.com` | `Maya@2026` | Skincare video creator (London). |
| Theo Laurent, Priya Raman, Jordan Reyes, Sana Malik | `theo.laurent@example.com`, `priya.raman@example.com`, `jordan.reyes@example.com`, `sana.malik@example.com` | `Theo@2026`, `Priya@2026`, `Jordan@2026`, `Sana@2026` | More creators for search and matching. |

### Brands

| Name | Email | Password | What's interesting about this account |
|---|---|---|---|
| **Neha Kapoor** — Kapoor Organics | `neha.kapoor@example.com` | `Neha@2026` | Juice campaign with a **completed project** (Aman). |
| **Vikram Rao** — Northpeak Gear | `vikram.rao@example.com` | `Vikram@2026` | Trek film campaign with a **Squad** (2 roles), invitations and 2 proposals to review. |
| **Sara Fernandes** — Bloom Beauty Co. | `sara.fernandes@example.com` | `Sara@2026` | **Blind Brief Room** campaign, active project with Zoya mid-revision. |
| Ava Chen — Lumen Skin | `ava.chen@example.com` | `Ava@2026` | Skincare brand with three campaigns (one draft). |

### Or create your own account

1. Click **Join MAKERSIGNAL** → fill in name, email (any address, e.g. `test1@example.com`), password (8+ characters with a letter and a number).
2. The next screen shows your **6-digit code** in a yellow "Temporary" box (because `DEV_SHOW_EMAIL_CODES=true`). Press **Verify and continue**.
3. Choose **Creator** or **Brand** and complete the short onboarding.

---

## Everyday commands

| Task | Command |
|---|---|
| Start the database (after a restart, Docker must be running) | `npm run db:start` |
| Start the app | `npm run dev` |
| Stop the app | `Ctrl + C` |
| Stop the database | `npm run db:stop` |
| Reset database to the sample data | `npm run db:reset` |
| See database addresses and keys | `npx supabase status` |
| Run the automated tests | `npm run test:unit`, `npm run test:db`, `npm run test:e2e` |

---

## Troubleshooting

| Problem | What to do |
|---|---|
| `Missing environment variable NEXT_PUBLIC_SUPABASE_URL…` | `.env.local` is missing, misnamed or in the wrong folder. It must be next to `package.json`, named exactly `.env.local`. Restart `npm run dev`. |
| `Cannot connect to the Docker daemon` / `db:start` fails | Open Docker Desktop and wait until it's running, then try again. |
| "port is already allocated" (54321–54324 or 3000) | Something else uses that port — often another Supabase project. Stop it with `npx supabase stop --project-id <other-project>` or close the other app. For port 3000 you can run `npm run dev -- -p 3001` and set `NEXT_PUBLIC_SITE_URL=http://localhost:3001`. |
| Login says "Email or password is incorrect" for sample users | Run `npm run db:reset` to reload the sample data, and check you typed the password exactly (capital first letter, `@2026`). |
| Pages show 404 / no data | The database isn't running or is empty: `npm run db:start` then `npm run db:reset`. |
| Logged out unexpectedly | Normal after `db:reset` — log in again. |
| No code shown after sign-up | Check `DEV_SHOW_EMAIL_CODES=true` in `.env.local` and restart `npm run dev`. |
| `npm install` fails | Check `node -v` is 20.9 or higher, delete the `node_modules` folder, and run `npm install` again. |
| Everything is very slow | See **Why is it slow?** below. |

---

## Why is it slow?

1. **Development mode compiles each page the first time you open it.** The first visit to a page can take a few seconds; later visits are much faster. For a fast, realistic experience use the production version:
   ```bash
   npm run build     # once, after code changes (takes a minute or two)
   npm start         # serves the optimised app at http://localhost:3000
   ```
   (Stop `npm run dev` first — both use port 3000.)
2. **Other Docker containers compete for the CPU.** Check with `docker stats`. Stop containers you aren't using (`docker stop <name>`) and give Docker at least 4 GB RAM and 4 CPUs (Docker Desktop → Settings → Resources).
3. **Low battery / power-saving mode** on laptops slows everything noticeably.

---

## Using a hosted (online) database instead

If you'd rather not run Docker, you can use a free Supabase cloud project:

1. Create a project at https://supabase.com.
2. In the project folder: `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>`, then `npx supabase db push` (this creates all tables; it does **not** load sample data).
3. In `.env.local` set `NEXT_PUBLIC_SUPABASE_URL` to the project's URL and the two keys from **Project Settings → API Keys**.
4. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/**` to the redirect URLs.

To load the sample data into a **non-production** hosted database, run the contents of `supabase/seed.sql` in the Supabase SQL editor. Never load sample data into production.

---

For how the product works (sign-up, login, features, security, going live), see **README.md** (in this same `Important` folder).
