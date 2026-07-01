# idx-property-search
A Zillow/Redfin-style property search experience backed by real MLS data.
Browse, filter, and explore property listings with full detail pages, interactive maps, and open house schedules.

This README is organized by week to track project progress as setup and tooling evolve.

---

## Week 1 — Docker Setup & Database Creation

A guide to setting up and running a MySQL database inside a Docker container for local development.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose installed and running
- SQL schema/seed files (`.sql`) ready locally
- A `.env` file in the `backend/` directory

### Environment Variables

Never commit real credentials. Create a `.env` file in the same folder as `compose.yml`:

```
MYSQL_ROOT_PASSWORD=your_password_here
MYSQL_DATABASE=your_db_name_here
```

A `.env.example` is committed to the repo as a reference template. Copy it and fill in your values:

```bash
cp .env.example .env
```

> **Important:** `.env` is in `.gitignore` and must never be committed.

### Quick Start

**1. Starting the Container**

```bash
docker compose up -d
```

**2. Verify the container is running**

```bash
docker ps
```

### Loading SQL Files

Only needed on first setup — after that, data persists across restarts automatically.

**Step 1 — Copy files into the container**

```bash
docker cp /path/to/your/file.sql idx-mysql-local:/tmp/
```

**Step 2 — Exec into the container**

```bash
docker exec -it idx-mysql-local bash
```

**Step 3 — Import**

```bash
mysql -u root -pYOUR_PASSWORD --socket=/tmp/mysql.sock YOUR_DB_NAME < /tmp/file.sql
```

To import multiple files:

```bash
for f in /tmp/*.sql; do
  echo "Loading $f..."
  mysql -u root -pYOUR_PASSWORD --socket=/tmp/mysql.sock YOUR_DB_NAME < "$f"
done
```

**Step 4 — Verify**

```bash
mysql -u root -pYOUR_PASSWORD --socket=/tmp/mysql.sock YOUR_DB_NAME -e "SHOW TABLES;"
```

### Stopping the Container

```bash
# Stop without losing data (recommended)
docker compose down

# ⚠️ Stop AND delete all data (only use this to reset from scratch)
docker compose down -v
```

> `docker compose down` is safe — your data lives in the named volume `backend_db_data` and survives restarts. Only `-v` destroys it.

---

## Week 2 — Node.js Project Setup & Database Connection Pool

Setting up the Express backend, connecting it to MySQL through a connection pool, and adding a health check endpoint.

### Step 1 — Initialize the Node.js project

```bash
cd backend
npm init -y
```

### Step 2 — Install dependencies

```bash
npm install express mysql2 dotenv cors
npm install --save-dev nodemon
```

### Step 3 — Environment variables

Add database credentials to the existing `.env` file in `backend/` (or create one if it doesn't exist yet): 
Check /backend/.env.example

> **Important:** Use `127.0.0.1` rather than `localhost` to avoid socket resolution issues. Confirm `.env` is listed in `.gitignore` before committing anything.


### Step 4 — Add the dev script

In `backend/package.json`, add a `dev` script that runs the server with `node` so it auto-restarts on file changes:

```json
"scripts": {
  "dev": "node --env-file=.env index.js",
}
```

### Running the server

```bash
npm run dev
```

Then verify the health endpoint:

```bash
curl http://localhost:5001/api/health
```
