# Setup Guide — Zero to Running (assume you know nothing about Docker/Node)

This guide assumes you've never used Node.js or Docker before. Follow it top to bottom. Every command is exact — copy-paste it, don't retype it.

---

## Part 1: Install the tools

You need three things installed on your computer: **Node.js**, **Docker Desktop**, and (optional but recommended) **VS Code** to look at the code. Do this once.

### 1a. Install Node.js

Node.js lets you run JavaScript outside a browser — it's what runs the backend server and lets you install packages.

- Go to **https://nodejs.org**
- Download the **LTS** version (the button that says "Recommended for most users")
- Run the installer, click Next through all the defaults
- **Verify it worked**: open a terminal (see below) and run:
  ```bash
  node --version
  npm --version
  ```
  You should see version numbers like `v20.11.0` and `10.2.4`. If you see "command not found," restart your computer and try again — the installer needs a fresh terminal session to update your PATH.

**What's a terminal?**
- **Windows**: press the Windows key, type "PowerShell", open it
- **Mac**: press Cmd+Space, type "Terminal", open it
- **Linux**: you know this already

### 1b. Install Docker Desktop

Docker lets you run MongoDB, Redis, and your backend as isolated little "containers" without installing MongoDB and Redis directly on your machine. This is the easiest way to run this project.

- Go to **https://www.docker.com/products/docker-desktop**
- Download for your OS (Windows/Mac/Linux)
- Run the installer, restart your computer if it asks you to
- Open Docker Desktop once after installing. It needs to be **running in the background** (you'll see a whale icon in your system tray/menu bar) any time you want to use it
- **Verify it worked**: in your terminal, run:
  ```bash
  docker --version
  docker compose version
  ```
  You should see version numbers, not an error.

> **Windows users specifically**: Docker Desktop will likely ask you to enable "WSL2" (Windows Subsystem for Linux). Let it — just click through the prompts it gives you and restart when asked. This is a one-time setup step.

### 1c. (Optional) Install VS Code

Not required to run the project, but makes it much easier to look at the code.
- Go to **https://code.visualstudio.com**, download, install.

---

## Part 2: Get the project onto your computer

1. Download the `smart-search-engine.zip` file I gave you.
2. Extract it somewhere easy to find, e.g. `Documents/smart-search`.
3. Open your terminal and navigate into the folder:
   ```bash
   cd Documents/smart-search
   ```
   (adjust the path to wherever you extracted it — on Windows this might be `cd C:\Users\YourName\Documents\smart-search`)
4. Confirm you're in the right place:
   ```bash
   ls
   ```
   (on Windows PowerShell, `dir` also works). You should see folders named `server`, `client`, `docs`, `infra`, and files like `docker-compose.yml` and `README.md`.

---

## Part 3: Run everything with Docker (the easy way)

This one command starts MongoDB, Redis, two backend servers, the load balancer, and the frontend, all at once.

```bash
docker compose up --build
```

**What happens**: Docker will download MongoDB, Redis, and Node.js base images (first time only — this can take 5-10 minutes depending on your internet), then build and start everything. You'll see a wall of colored log output from multiple services at once. That's normal.

**How do I know it worked?** Look for lines like:
```
node1_1   | [startup] Instance node-1 listening on port 4000
node2_1   | [startup] Instance node-2 listening on port 4001
```

**Now open your browser** and go to:
- **http://localhost:5173** — the search frontend
- **http://localhost:8080** — same thing, but routed through the Nginx load balancer (this is how you'd access it in a "real" multi-instance deployment)

You'll see an empty search page because the database has no products yet — see Part 4.

**To stop everything**: go back to the terminal and press `Ctrl+C`, then run:
```bash
docker compose down
```

---

## Part 4: Load sample data (seed the database)

The search page needs products to search. With Docker still running (Part 3), open a **second terminal window** (leave the first one running) and run:

```bash
cd Documents/smart-search/server
docker compose exec node1 npm run seed
```

This generates 20,000 fake-but-realistic products (phones, blenders, sneakers, etc.) and inserts them into MongoDB. You'll see a progress counter. Once it says `[seed] Done`, refresh your browser at http://localhost:5173 and try searching for something like "phone" or "chair."

---

## Part 5: Running without Docker (manual install)

Skip this if Docker worked for you in Part 3. This path is for understanding what's happening under the hood, or if Docker isn't an option on your machine.

You need MongoDB and Redis installed directly.

### Install MongoDB
- Go to **https://www.mongodb.com/try/download/community**, download the Community Server for your OS, install with defaults.
- Start it: on Windows/Mac it usually runs automatically as a background service after install. On Linux, `sudo systemctl start mongod`.
- Verify: run `mongosh` in your terminal — if it connects, you're good. Type `exit` to leave.

### Install Redis
- **Mac**: `brew install redis` then `brew services start redis`
- **Windows**: Redis doesn't officially support Windows — easiest path is to install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) and run `sudo apt install redis-server && redis-server` inside it, or just use Docker for Redis only (`docker run -d -p 6379:6379 redis`)
- **Linux**: `sudo apt install redis-server && sudo systemctl start redis`
- Verify: run `redis-cli ping` — it should reply `PONG`.

### Install and run the backend
```bash
cd Documents/smart-search/server
npm install
cp .env.example .env
npm run seed
npm run dev
```
Leave this terminal running. It starts one backend instance on port 4000.

### Install and run the frontend
Open a **new terminal**:
```bash
cd Documents/smart-search/client
npm install
npm run dev
```
It'll print a URL, usually **http://localhost:5173** — open that in your browser.

---

## Part 6: Running the tests and benchmarks yourself

These don't need MongoDB — only Redis (Docker or manual, see Part 5). If you used Docker for everything, Redis is already running as part of that; you can run these commands directly against it since Docker Compose exposes Redis on your normal `localhost:6379`.

```bash
cd Documents/smart-search/server
npm install          # if you haven't already

npm test                    # 56 unit tests, few seconds
npm run test:integration    # tests against the real API

npm run bench:trie          # Trie vs linear-scan autocomplete
npm run bench:lru           # custom LRU cache vs a plain unbounded cache
npm run bench:bloom         # Bloom filter false-positive rate
npm run bench:hashing       # consistent hashing vs modulo hashing
npm run bench:debounce      # typing simulation, debounce request reduction
npm run bench:async         # synchronous vs background-queued analytics writes

node benchmarks/rateLimiterLocalVsDistributed.js   # why per-instance rate limits break
node benchmarks/requestBatching.js                  # batched vs unbatched writes
node scripts/multiInstanceDemo.js                   # 2 real server processes sharing state
```

Each one prints real numbers to your terminal — read `docs/BENCHMARKS.md` for what to expect and why.

---

## Part 7: Why I built it this way (plain-language explanations)

You didn't just ask for working code — you asked *why* things scale, so here's the reasoning behind the big pieces, without jargon.

**Why a custom Trie instead of a plain array search for autocomplete?**
A Trie is a tree where each step down a branch is one letter. To find everything starting with "iph," you walk down i→p→h (3 steps) and then just read off everything below that point. A plain array has to check every single product title from scratch, every time. As your catalog grows, the Trie barely gets slower; the array search gets linearly slower. The benchmark numbers in `docs/BENCHMARKS.md` show this directly.

**Why build an LRU cache instead of just using a JavaScript `Map` to cache things?**
A `Map` never forgets — if 500,000 different searches happen over a week, it holds onto results for all 500,000, and your server eventually runs out of memory. An LRU (Least Recently Used) cache has a hard capacity limit: once it's full, it throws away whatever hasn't been touched in the longest time to make room for new stuff. It's the difference between a notebook that never gets a new page (fills your bag forever) and a whiteboard you keep wiping the oldest corner of.

**Why Redis on top of that, instead of just the LRU cache?**
The LRU cache lives inside one running Node.js process, in that process's memory. If you run two backend servers (which this project does, for scalability), each one has its *own separate* LRU cache — they don't know about each other. Redis is a separate, shared piece of software both servers can talk to, so a cached result from server 1 is instantly available to server 2 too.

**Why does the rate limiter need Redis too?**
Same reason. If each server counts "how many requests has this person made" in its own memory, a person hitting server 1 five times and server 2 five times has technically made 10 requests but each server only sees 5 — so your limit of "10 requests per minute" silently becomes 20. I proved this in `benchmarks/rateLimiterLocalVsDistributed.js`: the local version let a test client through *2x* its intended limit. Moving that counter into shared Redis fixes it.

**Why a circuit breaker?**
Imagine a broken vending machine that eats your money every time. You'd stop trying after a couple of failed attempts, not keep feeding it coins. A circuit breaker does that for a flaky dependency (a database, an external API): after enough failures in a row, it stops even trying for a while, so your app fails fast instead of hanging on every request waiting for something that's already known to be broken.

**Why background jobs (BullMQ) instead of just saving analytics directly?**
When someone searches, you want to answer them as fast as possible. Writing "this search happened" to a log is useful for you, but the *person searching* doesn't need to wait for that write to finish before seeing their results. So that write gets handed off to a background worker that does it a moment later, off to the side. Measured effect: an 18.7x reduction in how long the request handler is blocked (`docs/BENCHMARKS.md`, section 5).

**Why consistent hashing?**
This one matters when you have multiple servers or cache nodes and need to decide which one "owns" a given piece of data. The naive approach — `hash(key) % number_of_servers` — completely reshuffles almost everything the moment you add or remove one server, because the modulo (`%`) result changes for nearly every key. Consistent hashing arranges servers and keys on a circular "ring" so that removing one server only affects the small slice of keys it was responsible for — I measured this directly: modulo hashing reshuffled 80.7% of keys when removing 1 server out of 5, consistent hashing reshuffled only 18.7%.

**Why separate `app.js` and `server.js`?**
`app.js` builds the actual Express application (routes, middleware) but never starts listening on a network port. `server.js` is the only file that calls `.listen()`. This means tests can load `app.js`, send it fake requests, and check the responses — without ever opening a real network connection. Faster and more reliable tests.

---

## Part 8: What I could NOT verify myself, and what you need to check

I built and ran this inside a locked-down sandbox environment (basically a temporary, disposable Linux computer with a restricted internet connection). Two real gaps came out of that:

### 1. MongoDB never actually ran during development

My sandbox's network only allowed connections to a specific short list of websites (npm, GitHub, a few others) — MongoDB's own download servers weren't on that list, and Ubuntu's normal software repositories don't include MongoDB. Redis, by contrast, *is* in Ubuntu's normal repositories, so I could install and use it for real.

**What this means practically**: all the MongoDB-related code (the database schema in `src/models/Product.js`, the search queries in `src/services/searchService.js`, the seed script) is written correctly and I'm confident in it, but I never got to press "run" against a real MongoDB and watch it work. When you follow Part 3 or Part 5 above and it works, **that's the first time this code has actually touched a real MongoDB** — please tell me if anything breaks, and paste me the error.

**Specifically test these once you're running:**
```bash
# after seeding data, try a real search:
curl "http://localhost:4000/api/v1/search?q=phone&limit=5"

# check that indexes were actually created:
mongosh
use smart_search
db.products.getIndexes()
```
You should see the text index and compound indexes listed (`src/models/Product.js` defines them). If `db.products.getIndexes()` only shows the default `_id` index, something didn't apply correctly and I'd want to know.

### 2. Docker Compose / Nginx never ran end-to-end during development

No Docker was available in my sandbox at all. I wrote `docker-compose.yml` and `infra/nginx.conf` carefully and reviewed them, but **Part 3 above is the first time this configuration has ever actually been executed.** If `docker compose up --build` fails, it's most likely one of these common first-run issues, roughly in order of likelihood:

- **Port already in use** (something else on your machine is using 5173, 8080, 4000, 4001, 27017, or 6379). Fix: close whatever's using it, or edit the port numbers on the left side of the `ports:` lines in `docker-compose.yml` (e.g. change `"5173:5173"` to `"5174:5173"` and then visit that new port instead).
- **Docker Desktop not running** — check the whale icon is active before running the command.
- **Out of disk space for Docker images** — MongoDB + Redis + 2x Node images can take a few GB.

### 3. Load testing was never built

I said I'd flag this: I did not write a load-testing script (simulating 10, 50, 100+ concurrent users) in the delivered project at all — not a sandbox limitation, just genuinely not done. If you want it, ask and I'll build it using a tool called `autocannon`, which is a simple, popular Node.js load-testing package.

### What I'd suggest you actually do, in order

1. Run Part 3 (Docker). This is the real first-time test of the parts I couldn't verify.
2. If it works end to end (frontend loads, search returns real results, indexes show up in `mongosh`), you now have something I couldn't fully claim before: **confirmation that the whole stack works together**, not just its individual pieces.
3. If something breaks, copy the exact error message back to me — I'll fix the specific thing, not guess.
4. Once it's running, `docs/IMPLEMENTATION_STATUS.md` has a full requirement-by-requirement table if you want to see exactly what's been proven versus what still needs eyes on it.
