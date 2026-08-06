# DoonMeet Dashboard

Admin control center for [DoonMeet](https://doonmeet.in) — a standalone Next.js app (frontend + backend together) that connects directly to the same MongoDB database as the main platform. It has its own, completely separate authentication system from the user-facing app.

## Modules

| Module | What it does |
|---|---|
| Users | Search/filter accounts, view activity, ban/unban, force-verify, manage sessions, delete |
| Communities | Create/edit/deactivate, manage members, moderate posts, set announcements |
| Events | Create/edit/cancel, manage attendees, moderate comments |
| Places | Add/edit local spots, moderate reviews |
| Chat | View & moderate DM conversations (view access is audit-logged) and public room chat |
| Locations | Monitor live map check-ins, hide/remove |
| Audit log | Read-only trail of every admin action |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values, see below
npm run create-admin -- --name "Your Name" --email you@doonmeet.in --password "a-strong-password"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the admin account you just created.

## Environment variables

See `.env.example`. You'll need:

- `MONGODB_URI` — the **same** connection string doonmeet (the main app) uses. This dashboard reads and writes the same collections directly.
- `ADMIN_ACCESS_TOKEN_SECRET` / `ADMIN_REFRESH_TOKEN_SECRET` — generate each with `openssl rand -base64 48`. These **must** be different from any secrets used by the main doonmeet app — admin sessions are completely isolated from user sessions.

## Creating admin accounts

There is no sign-up route anywhere in this app. The only way to create or update an admin account is the CLI script:

```bash
npm run create-admin -- --name "Name" --email admin@doonmeet.in --password "..."
```

Running it again with an existing email updates that admin's name/password and re-activates the account.

## Notes

- Place images are added via URL for now — there's no upload widget yet.
- 2FA is intentionally not implemented at this stage.
- Every mutating action (and every private-conversation view) is recorded in the audit log, visible at `/audit-log`.
