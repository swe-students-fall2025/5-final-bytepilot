[![Web App CI/CD](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/web-app-cicd.yml/badge.svg)](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/web-app-cicd.yml)
[![PR CI](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/ci.yml/badge.svg)](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/ci.yml)

# Forum Generator

Forum Generator is a Flask + MongoDB web app that lets fans create original characters, draft forum-style dialogue threads, and publish them for others to browse. The UI handles authentication, character management, thread editing/publishing, and community discovery, while MongoDB stores user, character, and forum data.
Forum Generator is a Flask + MongoDB web app for staging forum-style fanfiction with existing characters. Users authenticate, manage character profiles, compose multi-character threads, save drafts, publish, and browse the community feed. Everything is containerized and shipped via GitHub Actions to Docker Hub and a DigitalOcean droplet.

## System components
- **Web App (Flask + Gunicorn, port 5001)** — UI, auth, character management, thread creation/publishing. Containerized via `web_app/Dockerfile`; image target `docker.io/<DOCKERHUB_USERNAME>/forum-generator-web`.
- **MongoDB** — stores users, characters, and threads. Use MongoDB Atlas or a local `mongo:7` container; supply connectivity through `MONGO_URI`.
- **CI/CD** — GitHub Actions pipelines for pull-request testing and main-branch build/push/deploy.

## Tech stack
- Python 3.11, Flask, Flask-Login, PyMongo
- MongoDB (Atlas or local container)
- Docker / docker-compose, Gunicorn
- GitHub Actions, DigitalOcean droplet

## Repository map
- `web_app/` — Flask application, templates, static assets, tests, Dockerfile.
- `.github/workflows/` — CI/CD pipelines (`ci.yml`, `web-app-cicd.yml`, `event-logger.yml`).
- `docker-compose.yml` — starts the web app container (expects external MongoDB via `MONGO_URI`).
- `Procfile` — gunicorn entry for hosted environments.

## Configuration (.env)
This project uses a `.env` file for database and Azure configuration. An example file is provided as `web_app/env.example` with dummy values; the actual `.env` values will be sent to graders directly. Place `.env` at the repo root so Flask, docker-compose, and CI/CD can read it. Required keys mirror the example: `SECRET_KEY`, `MONGO_URI`, `DB_NAME`, and optionally `FLASK_ENV`/`PORT`.

<<<<<<< Updated upstream
```
SECRET_KEY=change_me
MONGO_URI=mongodb://forum_user:forum_pass@localhost:27017/forum_db?authSource=admin
DB_NAME=forum_db
FLASK_ENV=development
```

- Start from `web_app/env.example`, copy it to `.env` in the repo root, and adjust values.  
- For container-to-container networking, set `MONGO_URI=mongodb://forum_user:forum_pass@mongo:27017/forum_db?authSource=admin`.  
- CI/CD expects a multi-line secret `WEB_APP_ENV_FILE` that contains the same key/value pairs used in `.env`.
=======
## Prerequisites
- Python 3.11+, pip
- Access to MongoDB (Atlas URI or local container); ensure ports 27017 and 5001 are free
- Docker Engine + Compose plugin (for containerized runs)
>>>>>>> Stashed changes

## Run locally (Python)
```bash
git clone https://github.com/swe-students-fall2025/5-final-bytepilot.git
cd 5-final-bytepilot
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
python -m pip install -r web_app/requirements.txt
# Ensure .env is present at repo root and MongoDB is reachable (Atlas or local)
python web_app/app.py   # or: flask --app web_app.app run --port 5001
```
Open http://localhost:5001 after the server starts.

### Run MongoDB locally (optional)
```bash
docker run -d --name forum-mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=forum_user \
  -e MONGO_INITDB_ROOT_PASSWORD=forum_pass \
  -e MONGO_INITDB_DATABASE=forum_db \
  mongo:7.0 --auth
```
Set `MONGO_URI` to point at this instance. If the web app runs inside Docker on the same network, use `mongo` as the host; if running on the host, use `localhost` or `127.0.0.1`.

## Run with Docker / Compose
```bash
docker compose up --build
```
`docker-compose.yml` starts the web app container and reads `.env` from the repo root. You must provide a reachable MongoDB (Atlas or the local container above) via `MONGO_URI`.

## Testing and coverage
```bash
cd web_app
python -m pip install -r requirements.txt
export SECRET_KEY=test-secret-key-for-ci
pytest --cov=app --cov-report=term-missing
```
Targets ≥80% coverage; this is the same command used in CI.

## CI/CD and deployment
- **PR CI (`ci.yml`)** — runs tests on pull requests.  
- **Web App CI/CD (`web-app-cicd.yml`)** — on push to `main`/`master`: tests → build/push Docker image → deploy to DigitalOcean via SSH.  
- **Event logger (`event-logger.yml`)** — optional workflow logging repo activity when `COMMIT_LOG_API` is set.

GitHub Actions secrets expected:
```
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
DO_DROPLET_HOST
DO_DROPLET_USER
DO_SSH_PRIVATE_KEY
WEB_APP_ENV_FILE   # contents of the .env used on the droplet
COMMIT_LOG_API     # optional, for event-logger workflow
```

## Operations
- Default web port: 5001 (configurable via `.env`/`PORT`).
- Default Mongo port: 27017 (when using local container).
- Health: Flask app responds on `/` and static assets under `/static`; API endpoints under `/api/*` for thread and character data.

## Data and seeding
No starter data required. User, character, and thread documents are created during normal use.

## Team
- [May Zhou](https://github.com/zz4206)
- [Morin Zhou](https://github.com/Morinzzz)
- [Jasmine Zhu](https://github.com/jasminezjr)
- [Esther Feng](https://github.com/yf2685-beep)
- [Eason Huang](https://github.com/GILGAMESH605)
