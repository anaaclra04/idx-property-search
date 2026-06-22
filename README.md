# idx-property-search
A Zillow/Redfin-style property search experience backed by real MLS data. 
Browse, filter, and explore property listings with full detail pages, interactive maps, and open house schedules.

# MySQL Docker Local Environment

A guide to setting up and running a MySQL database inside a Docker container for local development.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- SQL schema/seed files (`.sql`) ready locally

---

## Quick Start

### 1. Pull the MySQL image

```bash
docker pull mysql:8.0
```

### 2. Run the MySQL container

```bash
docker run --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=yourdatabase \
  -e MYSQL_USER=youruser \
  -e MYSQL_PASSWORD=yourpassword \
  -p 3306:3306 \
  -d mysql:8.0
```

### 3. Verify the container is running

```bash
docker ps
```

---

## Loading SQL Files

### Copy files into the container

```bash
docker cp /path/to/local/files/. mysql-local:/tmp/
```

### Run a single SQL file

```bash
docker exec -i mysql-local mysql -u youruser -pyourpassword yourdatabase < /tmp/yourfile.sql
```

### Run all SQL files in a folder (batch load)

Shell into the container first:

```bash
docker exec -it mysql-local bash
```

Then run all `.sql` files at once:

```bash
for f in /tmp/*.sql; do
  echo "Loading $f..."
  mysql -u youruser -pyourpassword yourdatabase < "$f"
done
```

### Verify tables were created

```bash
docker exec -it mysql-local mysql -u youruser -pyourpassword yourdatabase -e "SHOW TABLES;"
```

---

## Connecting to the Database

### Via MySQL shell (inside the container)

```bash
docker exec -it mysql-local mysql -u youruser -pyourpassword yourdatabase
```

## Managing the Container

### Stop the container

```bash
docker stop mysql-local
```

### Start it again

```bash
docker start mysql-local
```

### Remove the container (data will be lost unless a volume is used)

```bash
docker rm -f mysql-local
```

### View container logs

```bash
docker logs mysql-local
```

---

## Auto-Loading SQL on Container Start

Place your `.sql` files in a local folder (e.g. `./init`) and mount it to `/docker-entrypoint-initdb.d/`. MySQL will automatically run all `.sql` files in that folder when the container is first created:

```bash
docker run --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=yourdatabase \
  -p 3306:3306 \
  -v $(pwd)/init:/docker-entrypoint-initdb.d \
  -d mysql:8.0
```
---

## Troubleshooting

**Container exits immediately**
Run `docker logs mysql-local` to inspect the error. A missing `MYSQL_ROOT_PASSWORD` is the most common cause.

**Can't connect on port 3306**
Check if something else is already using that port: `lsof -i :3306`. Use a different host port if needed (e.g. `-p 3307:3306`).

**SQL file errors**
MySQL does not stop by default on the first error when running a script. To halt on error, add this to the top of your `.sql` file:
```sql
SET sql_mode = 'STRICT_ALL_TABLES';
```
