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

---
 
## Week 4 — Property Detail & Open House Endpoints
 
Adding two new endpoints: a property detail lookup by ID and an open house schedule lookup by property ID, plus request logging middleware.
 
### Step 1 — Add request logging middleware
 
Add to `backend/server.js` **before** any route definitions:
 
### Step 2 — Add the detail and open houses routes
 
In `backend/routes/properties.js`, add these routes **before** the `module.exports` line, and make sure `/:id/openhouses` is registered **before** `/:id`.
 
> **Column names:** Replace `oh_date` and `oh_start_time` with the actual date/time column names in `rets_openhouse`. Verify with `DESCRIBE rets_openhouse;`.
 
### Debug Challenge — Crash on a Specific Listing ID
 
The open houses endpoint works for most properties but throws an unhandled promise rejection for one specific listing ID. The cause is a malformed or `NULL` `all_data` column in `rets_openhouse` — a longtext/JSON blob that is empty or unparseable for that particular row.
 
**How to find it:**
 
```sql
-- Find rows with null or empty all_data in rets_openhouse
SELECT L_ListingID, all_data
FROM rets_openhouse
WHERE all_data IS NULL OR all_data = '';
```
 
**Fix:** The `try/catch` block in the handler already prevents a full crash — make sure it is in place. If you are attempting to parse `all_data` as JSON in the backend, wrap it defensively:
 
Alternatively, return `all_data` as a raw string and let the frontend parse it — you do not need to parse it in the backend at all.
 
### Troubleshooting
 
**`/openhouses` endpoint always returns 404 or treats the whole path as an ID**
Route order issue — move `/:id/openhouses` above `/:id` in `properties.js`. Express matches routes top-to-bottom; the first match wins.
 
**Open houses endpoint returns an empty array for every property**
Verify the join key. The `rets_openhouse` table links to `rets_property` via `L_ListingID` — confirm this column exists and contains matching values with:
```sql
SELECT oh.L_ListingID
FROM rets_openhouse oh
JOIN rets_property p ON oh.L_ListingID = p.L_ListingID
LIMIT 5;
```
 
**Crash / unhandled promise rejection on one listing ID**
A `NULL` or malformed `all_data` value in `rets_openhouse` is the likely cause. See the Debug Challenge section above. Ensure every async route handler has a `try/catch` and never attempts `JSON.parse()` without a null check and error guard.
 
**Logging middleware not printing output**
Confirm the middleware is added to `server.js` before any `app.use('/api/...')` route mounts. Middleware registered after a route will not run for that route.
 
 ## Week 5 — React Setup & Listings Page

Building a React frontend that fetches and displays a grid of property cards from the Express API.

### Step 1 — Scaffold the React app

```bash
npx create-react-app frontend
cd frontend
```

### Step 2 — Configure the dev proxy

Add a top-level `proxy` key to `frontend/package.json` so `/api/*` calls are forwarded to Express in development:

```json
"proxy": "http://localhost:5001"
```

> **Important:** This is only read once, at dev-server startup. Restart `npm start` after adding it.

### Debug Challenge — Broken Images on Some (Not All) Properties

After wiring up `PropertyCard`, every card showed "NO PHOTO AVAILABLE" even though `L_Photos` contained valid JSON arrays with real, working URLs (confirmed by pasting a URL directly into a browser tab).

**Note:** `L_Photos` still needs defensive parsing regardless of the hotlinking issue — not all rows have valid JSON (some are `null` or empty), so `JSON.parse()` must be wrapped in `try/catch` with a placeholder fallback for missing, malformed, or empty-array cases.