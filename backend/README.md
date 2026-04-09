# SakuPintar Backend (Express + MySQL)

## Local development

1) Install deps

```bash
npm install
```

2) Create `backend/.env` (copy from `.env.example`) and fill:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`

3) Start dev server

```bash
npm run dev
```

API will run at `http://localhost:5000`.

## Deploy to Railway (Backend + MySQL)

### 1) Create project + MySQL
- Create a new Railway project
- Add **MySQL** plugin
- Deploy this repository
- Set the **Root Directory** to `backend`

### 2) Environment variables (Railway)
Railway MySQL plugin usually provides one of these automatically:
- `DATABASE_URL` or `MYSQL_URL` (connection string), OR
- `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

Backend supports both.

You still need to set:
- `JWT_SECRET`: any long random string
- `NODE_ENV=production`
- `CORS_ORIGINS`: comma-separated frontend domains
  - Example: `https://your-frontend.vercel.app`

### 3) Schema initialization
On startup, the server will try to run `src/db/schema.sql` (uses `CREATE TABLE IF NOT EXISTS`).
If the database is reachable, tables will be created automatically.

### 4) Quick check
- `GET /` should return `{ "message": "Welcome to SakuPintar API" }`
- `GET /api/test-db` should return success once DB is connected

