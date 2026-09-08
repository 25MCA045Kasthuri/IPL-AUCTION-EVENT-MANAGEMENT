# IPL Auction Event Management Platform

A real-time IPL mega-auction management website with three interfaces:

- **Admin** – import players from Excel, manage the live auction (sell / undo / move players), configure scoring weights, view transaction history, export backup, and reset the auction.
- **Public Live Auction** – a wall/display page that updates in real time over Socket.IO, showing all teams and their squads, purses, and sold players.
- **Results** – computes and ranks teams by scoring, flags invalid squads, and shows the leaderboard.

Two user roles (JWT-authenticated):

- `ADMIN` – full control (Manage, Live Auction, Results).
- `CONDUCTOR` – Live Auction + Results (view only for auction actions).

---

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS, `react-router-dom`, `socket.io-client`
- **Backend:** Node + Express + TypeScript, `mongoose`, `socket.io`, `jsonwebtoken`, `multer`/`xlsx` (Excel import)
- **Database:** MongoDB (runs as a single-node replica set for transactions)
- **Tooling:** npm workspaces, `concurrently`, `vitest`, `eslint`, `typescript`

---

## Requirements

- Node.js 20+ (developed on v22)
- MongoDB 7+ (installed locally, running as a **replica set** because auction transactions require it)

---

## Installation

```bash
# 1. Install dependencies (hoisted to root node_modules)
npm install

# 2. Configure environment
cp .env.example .env
# edit .env — DB URI, JWT secret, admin/conductor credentials

# 3. Ensure MongoDB is running as a single-node replica set (see below)

# 4. Seed admin + conductor users
npm run seed
```

### .env

```ini
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ipl_auction
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Event Admin
CONDUCTOR_EMAIL=conductor@example.com
CONDUCTOR_PASSWORD=Conductor@123
CONDUCTOR_NAME=Event Conductor
```

> The database name is derived from the `MONGODB_URI` path (e.g. `ipl_auction`). Tests use a separate database (`ipl_auction_test`).

### Starting MongoDB as a replica set (Ubuntu)

The app needs a replica set for atomic transactions. One-time setup:

```bash
# use a dedicated data dir
mkdir -p .mongodb/data

# start mongod as a single-node replica set named rs0
mongod --dbpath .mongodb/data --replSet rs0 --port 27017 --bind_ip 127.0.0.1 --fork --logpath .mongodb/mongod.log

# initialize the replica set once
mongosh --port 27017 --eval 'rs.initiate()'
```

Verify with:

```bash
mongosh --port 27017 --eval 'db.runCommand({ ping: 1 }).ok'
```

> If your system `mongod` service is already running standalone, stop it first, or use a different port/data dir.

---

## Running the app

```bash
# starts backend (port 5000) + frontend (port 5173) together
npm run dev
```

Open http://localhost:5173 and log in with the seeded credentials.

| Role       | Login                 | Access                                          |
|------------|-----------------------|-------------------------------------------------|
| Admin      | `admin@example.com`   | Manage, Live Auction, Results                   |
| Conductor  | `conductor@example.com`| Live Auction, Results                           |

### Individual commands

```bash
npm run dev          # run backend + frontend together
npm run seed         # create/upsert admin + conductor users
npm run test         # run backend vitest suite (28 tests)
npm run build        # production build (frontend + backend)
npm run lint         # eslint (backend + frontend)
npm run start        # serve built backend (npm run start -w backend)
```

---

## Excel Import

Example file: `data/IPL_Player_Stats_with_Ranking_and_Base_Price.xlsx` (sheet `Player Stats`).

Expected headers (variants are tolerated / normalized):

```
Player, Role, Nationality, Matches, Runs, Batting Average, Strike Rate,
Wickets, Economy, IPL Ranking, Base Price (₹ Crore)
```

- **Role** values are mapped: `Batter → Batsman`, `Bowler → Bowler`, `All-rounder → All-Rounder`, `Wicketkeeper-Batter → Wicketkeeper`.
- **Overseas** = `Nationality !== "India"`.
- **Base Price** is read as a number in ₹ Crore.

In Admin → Import, upload the file, review the preview, then confirm. Re-importing is idempotent: existing players are updated (by name) and already-sold players are never clobbered.

---

## Auction Business Rules

- Purse starts at **₹90 Cr** per team. Prices are stored numerically in ₹ Crore.
- Squad size: min **16**, max **25** players.
- Per-team composition minimums: **4 batsmen, 4 bowlers, 2 all-rounders, 2 wicketkeepers, 4 overseas**.
- Selling a player transfers price from the buyer's purse and marks the player sold.
- Undo restores the previous state; moving a player between teams restores the old team's purse and deducts from the new team (net-delta logic).
- All sell/undo/move operations are **atomic** (Mongoose transactions) to keep purses and squads consistent.
- Overspending or selling an already-sold player is rejected.
- Live updates are pushed to all connected clients via Socket.IO (`auction:updated`, `team:updated`, `player:updated`, `results:updated`).

## Results / Scoring

Scoring is configurable and must total 100%:

- **70% ranking weight** (base price × correctness of ranking)
- **30% purse weight** (balance between winning purse and player values)

Every team is validated against the composition minimums; teams that don't meet them are marked **invalid** with a list of missing requirements and excluded from scoring. The leaderboard is computed and available to ADMIN and CONDUCTOR on the Results page, and exposed over Socket.IO.

---

## Project Structure

```
├── data/                     # Excel source file, used for testing imports
├── backend/
│   ├── src/
│   │   ├── app.ts            # Express app + middleware + routes
│   │   ├── server.ts         # bootstrap: DB connect, seed teams, sockets
│   │   ├── config/           # env config + mongoose connection
│   │   ├── models/           # Player, Team, User, AuctionTransaction, Settings, Result, enums
│   │   ├── middleware/       # auth, error handler, async wrapper
│   │   ├── controllers/      # route handlers
│   │   ├── routes/           # REST endpoints (incl. /admin, /public, /results)
│   │   ├── services/         # auction, import, results, public data, team data
│   │   ├── sockets/          # Socket.IO wiring + event naming
│   │   ├── scripts/seed.ts   # create default users from env
│   │   └── validators/       # zod schemas
│   └── tests/                # vitest suite (28 tests)
├── frontend/src/
│   ├── pages/                # Login, Home, Admin, LiveAuction, Results
│   ├── components/           # TeamCard, SellModal, ImportWizard, WeightConfig, ResetPanel, ...
│   ├── hooks/                # useAuth, useLiveSnapshot, useAdminData, useConnectionStatus
│   ├── services/             # api client + socket client
│   ├── types/                # shared TS types
│   └── utils/                # currency/percent formatting
├── .env / .env.example
└── package.json              # workspaces + root scripts
```

---

## API Overview

| Method | Route                      | Auth            | Purpose                             |
|--------|----------------------------|-----------------|-------------------------------------|
| POST   | `/api/auth/login`          | —               | Login → JWT                         |
| POST   | `/api/auth/me`             | any auth        | Current user                        |
| GET    | `/api/public/live`         | —               | Public live snapshot                |
| GET    | `/api/public/teams`        | —               | Public team list                    |
| POST   | `/api/import/preview`      | ADMIN           | Upload Excel → parsed rows          |
| POST   | `/api/import/confirm`      | ADMIN           | Commit imported players             |
| GET    | `/api/players`             | ADMIN           | List players                        |
| GET/PUT| `/api/settings`            | ADMIN           | Scoring weights                     |
| POST   | `/api/auction/sell`        | ADMIN           | Sell player to team                 |
| POST   | `/api/auction/undo`        | ADMIN           | Undo last sale of player            |
| POST   | `/api/auction/edit`        | ADMIN           | Change price / move player          |
| GET    | `/api/teams`               | ADMIN           | Team list with purses/squads        |
| GET    | `/api/teams/:id/composition`| ADMIN          | Squad composition vs requirements   |
| GET    | `/api/transactions`        | ADMIN           | Transaction history                 |
| GET    | `/api/results`             | ADMIN, CONDUCTOR| Latest leaderboard                  |
| POST   | `/api/results/calculate`   | ADMIN, CONDUCTOR| Compute results                     |
| GET    | `/api/admin/export`        | ADMIN           | Download JSON backup                |
| POST   | `/api/admin/reset`         | ADMIN           | Reset auction (`{confirmation:"RESET AUCTION"}`) |

---

## Testing

The backend uses `vitest` and connects to a database at `TEST_MONGODB_URI`
(default `mongodb://127.0.0.1:27017/ipl_auction_test`). The local replica-set
`mongod` must be running.

```bash
npm run test        # runs the full suite (28 tests)
```

Coverage areas: authentication & role-based access, atomic sell/undo/move
(including same-team price edits and cross-team moves), overspend/duplicate
rejections, Excel import normalization/idempotency, and eligibility/scoring.

---

## Troubleshooting

- **`MONGODB_URI is not set`** – the `.env` must exist at the project root. The
  backend always loads `<repo root>/.env` regardless of the working directory.
- **Mongo transactions error / "Transaction numbers are only allowed on a
  replica set"** – the server must be running as a replica set (`--replSet rs0`
  and `rs.initiate()`), not standalone.
- **Ports already in use** – change `PORT`/`CLIENT_URL` in `.env` and the Vite
  `server.port` in `frontend/vite.config.ts`.
- **Tests hang on a fresh machine** – vitest spins up `mongodb-memory-server`;
  if its binary download to `~/.cache/mongodb-binaries/` stalls, use the local
  replica-set `mongod` instead (the config already points there).
