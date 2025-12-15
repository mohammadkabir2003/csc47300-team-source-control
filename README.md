# CCNY Exchange

A campus marketplace application for CCNY students.

IMPORTANT: Place the required `.env` file inside the `backend/` folder before following the setup steps below. The servers will not run correctly without it.

## Quick Setup

**Prerequisite:** Node.js (includes `npm`) must be installed.

- Check your install:

```bash
node -v
npm -v
```

If not installed, install Node.js (recommended: use `nvm` or download from https://nodejs.org).

> Keep a copy of the required `.env` file inside the `backend/` folder before starting the servers.

## Run backend

Open a terminal and run:

```bash
cd backend
npm install
npm run dev
```

This starts the backend server (development mode).

## Run frontend (in a separate terminal)

Open a new terminal window/tab and run:

```bash
cd frontend
npm install
npm run dev
```

This starts the frontend dev server.

## About `start.sh`

There is a convenience script `./start.sh` in the repo root. Use it only if you are on a macOS machine and you want a single command to install and start both backend and frontend. Otherwise prefer the manual steps above.

## Access

Open your browser at `http://localhost:3000` once both servers are running.
