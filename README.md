# idx-property-search
A Zillow/Redfin-style property search experience backed by real MLS data. 
Browse, filter, and explore property listings with full detail pages, interactive maps, and open house schedules.

## MySQL Docker Local Environment

A guide to setting up and running a MySQL database inside a Docker container for local development.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose installed and running
- SQL schema/seed files (`.sql`) ready locally
- A '.env' file in the 'backend/'directory

---

## Environment Variables
 
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
 
---

## Quick Start

### 1. Starting the Container

```bash
docker compose up -d
```

### 2. Verify the container is running

```bash
docker ps
```

---

## Loading SQL Files

Only needed on first setup — after that, data persists across restarts automatically.
 
### Step 1 — Copy files into the container
 
```bash
docker cp /path/to/your/file.sql idx-mysql-local:/tmp/
```
 
### Step 2 — Exec into the container
 
```bash
docker exec -it idx-mysql-local bash
```
 
### Step 3 — Import
 
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

### Step 4 — Verify
 
```bash
mysql -u root -pYOUR_PASSWORD --socket=/tmp/mysql.sock YOUR_DB_NAME -e "SHOW TABLES;"
```
 
---

## Stopping the Container
 
```bash
# Stop without losing data (recommended)
docker compose down
 
# ⚠️ Stop AND delete all data (only use this to reset from scratch)
docker compose down -v
```
 
> `docker compose down` is safe — your data lives in the named volume `backend_db_data` and survives restarts. Only `-v` destroys it.
 
---


## Troubleshooting

**Container exits immediately**
Run `docker logs idx-mysql-local` to inspect the error. A missing `MYSQL_ROOT_PASSWORD` is the most common cause.

**Can't connect on port 3306**
Check if something else is already using that port: `lsof -i :3306`. Use a different host port if needed (e.g. `-p 3307:3306`).

**SQL file errors**
MySQL does not stop by default on the first error when running a script. To halt on error, add this to the top of your `.sql` file:
```sql
SET sql_mode = 'STRICT_ALL_TABLES';
```

### `ERROR 2002: Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock'`
 
The `compose.yml` redirects the socket to `/tmp/mysql.sock`. Always pass `--socket=/tmp/mysql.sock` to the `mysql` client:
 
```bash
mysql -u root -pYOUR_PASSWORD --socket=/tmp/mysql.sock YOUR_DB_NAME
```
 
To confirm the actual socket path from the logs:
 
```bash
docker logs idx-mysql-local | grep socket
```
 
You should see:
```
socket: '/tmp/mysql.sock'  port: 3306
```
 
### `ERROR 1045: Access denied for user 'root'@'localhost'`
 
This means the volume was initialized with a different password than what's in your `.env`. MySQL only reads `MYSQL_ROOT_PASSWORD` on the very first startup when the data directory is empty — subsequent restarts reuse whatever password the volume was initialized with, regardless of `.env` changes.
 
Fix: wipe the volume and reinitialize from scratch.
 
```bash
docker compose down -v
docker compose up -d
```
 
To confirm what password the running container was actually initialized with:
 
```bash
docker inspect idx-mysql-local | grep MYSQL_ROOT_PASSWORD
```
 
### `zsh: no matches found: /tmp/*.sql`
 
Shell globs like `/tmp/*.sql` expand on your Mac host, not inside the container. Always exec into the container first before running import commands:
 
```bash
docker exec -it idx-mysql-local bash
# then run mysql commands from here
```
 
### Database appears empty after restart
 
Before assuming data was lost, verify the tables are actually missing:
 
```bash
docker exec -it idx-mysql-local mysql -u root -pYOUR_PASSWORD --socket=/tmp/mysql.sock -e "SHOW DATABASES; USE YOUR_DB_NAME; SHOW TABLES;"
```
 
If tables are listed, the data is intact — the issue is likely a stale or misconfigured client connection. Reconnect using `127.0.0.1` instead of `localhost`.
 
If the database is genuinely empty, the volume may have been wiped with `docker compose down -v`. You'll need to re-import your `.sql` files.
