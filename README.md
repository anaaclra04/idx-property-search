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

## Week 6 — Filters UI & Introduction to Testing

Adding a `PropertyFilters` form wired into `ListingsPage`, plus the first unit tests for the frontend.

### API Contract (unchanged, now used from the UI)

### Debug Challenge — Stale Search Results Flashing

**Symptom:** Type a city, click Search, click Clear, type a different city, click Search — the first search's results briefly flash before the second search's results replace them.

**Cause:** Overlapping async requests. Once filters trigger refetches, nothing stops an earlier, slower request from resolving *after* a later one and overwriting its results.

**Fix:** A `useRef` counter (`latestRequestId`) tags each request as it's issued. When a response comes back, it's only committed to state if it's still the most recent request — otherwise it's silently discarded.

### Troubleshooting

**Filters don't seem to do anything on Search**
Check that `PropertyFilters` is calling `onSearch(stripEmpty(filters))` and that `ListingsPage`'s `useEffect` depends on `filters` — if the dependency array is empty, it'll only fetch once on mount.

**Old results flash briefly after a new search**
See the Debug Challenge above — verify the `latestRequestId` ref check is in place in `ListingsPage.jsx`.

**`npm test` fails with "fetch is not defined"**
Make sure `global.fetch = jest.fn()` is set in a `beforeEach` in `client.test.js` — CRA's test environment doesn't polyfill `fetch`.

### Note

`beds` and `baths` filters were changed from exact match (`=`) to "at least" (`>=`) — a 3-bed search now includes 3, 4, 5+ bed properties, matching how real estate search UIs typically behave. The dropdown labels reflect this (`3+`, not `3`).

## Week 7 — Pagination UI & Component Testing

Adding page-number pagination below the property grid, with ellipsis handling for large result sets.

### Debug Challenge — Duplicate Last Page Number

**Symptom:** Near the end of a large page list, the pagination bar renders the last page number twice (e.g. `1 ... 2 3 4 ... 1` instead of `1 ... 21 22 23 24`).

**Fix:** `getPageNumbers()` always derives `rightSiblingIndex` via `Math.min(currentPage + siblingCount, totalPages)`, decides whether to show dots by comparing that clamped value to `totalPages`, and always anchors the last page as the literal `totalPages` value rather than a derived constant. See `Pagination.test.js` for the regression tests that pin this down.

### Troubleshooting

**Pagination doesn't reset to page 1 after a new search**
Check that `handleSearch` and `handleClear` in `ListingsPage.jsx` both call `setCurrentPage(1)` alongside `setFilters(...)`.

**Page doesn't scroll to top when clicking a page number**
Verify `handlePageChange` calls `window.scrollTo(0, 0)` — this only runs on explicit page-change clicks, not on filter changes.

**Pagination controls show up even with only one page**
`Pagination` returns `null` when `totalPages <= 1` — confirm `totalPages` is computed as `Math.ceil(total / itemsPerPage)` and not defaulting to something ≥ 2.

## Week 8 — Property Detail Page End-to-End

Adding React Router, a full property detail page, a photo carousel and gallery with lightbox, a Google Maps embed, and an open house list.

### Step 1 — Install React Router

```bash
cd frontend
npm install react-router-dom
```

Wrap the app in `BrowserRouter` and define two routes in `App.js`: `/` for `ListingsPage`, `/property/:id` for `PropertyDetailPage`.

### Step 2 — Make property cards clickable

`PropertyCard` is now a `<Link to={`/property/${L_ListingID}`}>` instead of a plain `<div>`. Its photo is rendered by a new `PropertyImageCarousel` component (prev/next arrows, `X / Y` counter) instead of a single `<img>`.

> **Important:** Because the carousel lives inside a `<Link>`, every arrow button click must call both `e.preventDefault()` and `e.stopPropagation()` — otherwise clicking an arrow also navigates to the detail page.

### Step 3 — Build the photo components

Both `PropertyImageCarousel` (cards) and `PropertyImageGallery` (detail page) parse `L_Photos` via a shared `getAllPhotoUrls()` helper in `utils/parsePhotos.js`, which wraps `JSON.parse()` in a `try/catch` and falls back to `[]` on malformed or empty data.

`PropertyImageGallery` adds a main image, a scrollable thumbnail strip, and a full-screen lightbox that opens on main-image click.

### Step 4 — Set up the Google Maps Embed API

1. Go to https://console.cloud.google.com and sign in
2. Create a new project
3. Enable the **Maps Embed API** under APIs & Services > Library
4. Create an API key under APIs & Services > Credentials
5. Restrict the key to `localhost:3000` and the Maps Embed API only
6. Add the key to `frontend/.env`: REACT_APP_GOOGLE_MAPS_API_KEY=your_key

> **Hint:** React env variables must start with `REACT_APP_` to be accessible in the browser. Restart `npm start` after editing `.env`.

`PropertyMap` builds the embed URL as:
https://www.google.com/maps/embed/v1/place?key=KEY&q=LAT,LNG&zoom=15

It renders `null` when `lat` or `lng` is missing, so the map section is simply omitted rather than showing a broken iframe.

### Step 5 — Display open houses

`OpenHouseList` renders date, formatted start/end time, and remarks. Remarks come from the `OpenHouseRemarks` key inside the `all_data` JSON blob on `rets_openhouse` — see Debug Challenge below.

### Debug Challenge — Open House Remarks Never Appear

**Symptom:** After wiring up `OpenHouseList`, remarks never show up even for open houses known to have them, even though the backend's `/openhouses` endpoint returns `all_data` in every row.

**Cause:** `OpenHouseRemarks` isn't its own column — it's a key inside the `all_data` JSON blob. The component was reading `oh.OpenHouseRemarks` directly instead of parsing `all_data` first.

**Fix:** Parse `all_data` in the component (not the backend) and pull the key out of the parsed object

### Debug Challenge — Lightbox Doesn't Close on Escape

**Symptom:** The lightbox's `onKeyDown` handler is attached to its container `<div>`, but pressing Escape does nothing — the handler never fires.

**Cause:** A plain `<div>` can't receive keyboard events at all unless it's focusable, and nothing was moving focus onto it even if it were.

**Fix:** Add `tabIndex={-1}` to the lightbox `<div>` (focusable, but skipped in normal Tab order) and call `.focus()` on it via a `ref` in a `useEffect` that runs when the lightbox opens