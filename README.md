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
  "dev": "node --env-file=.env ./src/index.js",
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

## Week 3 — Property Search Endpoint with Filters & Indexing
 
Building a paginated, filterable `GET /api/properties` endpoint backed by proper database indexes.
 
### API Contract
 
```
GET /api/properties?city=Malibu&minPrice=300000&beds=3&limit=20&offset=0
```
 
Response shape:
 
```json
{ "total": 87, "limit": 20, "offset": 0, "results": [...] }
```
 
### Step 1 — Add database indexes
 
Connect to MySQL and run the following. Capture the `EXPLAIN` output **before** adding indexes for comparison.
 
```sql
-- Before: check query plan without indexes
EXPLAIN SELECT * FROM rets_property WHERE city_col = 'Malibu';
 
-- Create indexes on filtered columns
CREATE INDEX idx_city      ON rets_property (city_col);
CREATE INDEX idx_zip       ON rets_property (zip_col);
CREATE INDEX idx_price     ON rets_property (list_price_col);
CREATE INDEX idx_beds      ON rets_property (beds_col);
CREATE INDEX idx_baths     ON rets_property (baths_col);
 
-- Composite index for frequently combined filters (more efficient than two separate indexes)
CREATE INDEX idx_city_price ON rets_property (city_col, list_price_col);
 
-- After: verify indexes exist
SHOW INDEXES FROM rets_property;
 
-- After: confirm indexes are being used (key column should not be NULL)
EXPLAIN SELECT * FROM rets_property WHERE city_col = 'Malibu' AND list_price_col >= 300000;
```
 
### Debug Challenge — The `minPrice` + `beds` Bug
 
When `minPrice` and `beds` filters are applied together, the result count is wrong. The bug is in how the `values` array is built for parameterized queries: if a filter is pushed to `conditions` but its value is not pushed to `values` (or pushed in the wrong order), the placeholders `?` shift and bind to the wrong values.
 
**Test case that exposes the bug:**
 
```bash
# Filter by minPrice only — note the total
curl "http://localhost:5001/api/properties?minPrice=400000"
 
# Filter by beds only — note the total
curl "http://localhost:5001/api/properties?beds=3"
 
# Both together — total should reflect both filters applied;
# if it matches only one of them, the bug is present
curl "http://localhost:5001/api/properties?minPrice=400000&beds=3"
```
 
**Fix:** Ensure every `conditions.push(...)` is immediately followed by its corresponding `values.push(...)`. Never push to one array without pushing to the other.