[![Web App CI/CD](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/web-app-cicd.yml/badge.svg)](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/web-app-cicd.yml)
[![PR CI](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/ci.yml/badge.svg)](https://github.com/swe-students-fall2025/5-final-bytepilot/actions/workflows/ci.yml)

# Forum Generator

Forum Generator is a Flask + MongoDB web app that lets fans create original characters, draft forum-style dialogue threads, and publish them for others to browse. The UI handles authentication, character management, thread editing/publishing, and community discovery, while MongoDB stores user, character, and forum data.

## Subsystems
- **Web App (Flask + Gunicorn)**  
  - Container built from `web_app/Dockerfile` and served on port `5001`.  
  - Docker Hub image: [`forum-generator-web`](https://hub.docker.com/r/<dockerhub-username>/forum-generator-web) (pushed by the CI/CD pipeline).  
  - CI/CD workflows: `web-app-cicd.yml` (build/push/deploy) and `ci.yml` (PR test gate).
- **MongoDB**  
  - Stores users, characters, and forum threads.  
  - Use the provided MongoDB Atlas URI in `.env`, or run a local container (see setup below). Official image: [`mongo:7`](https://hub.docker.com/_/mongo).

## What you can do
- Register/login and manage a profile.
- Create, edit, and delete characters (names, nicknames, fandom, avatars).
- Compose multi-character forum threads, save drafts, and publish.
- Browse your own threads or the community feed of published forums.

## Prerequisites
- Python 3.11+
- Docker + Docker Compose plugin (for containerized runs)
- Access to a MongoDB instance (Atlas URI or a local Mongo container)

## Configuration (.env)
The app reads environment variables from the repository root via `python-dotenv` and `docker-compose`:

```
SECRET_KEY=change_me
MONGO_URI=mongodb://forum_user:forum_pass@localhost:27017/forum_db?authSource=admin
DB_NAME=forum_db
FLASK_ENV=development
```

- Start from `web_app/env.example`, copy it to `.env` in the repo root, and adjust values.  
- For container-to-container networking, set `MONGO_URI=mongodb://forum_user:forum_pass@mongo:27017/forum_db?authSource=admin`.  
- CI/CD expects a multi-line secret `WEB_APP_ENV_FILE` that contains the same key/value pairs used in `.env`.

## Run locally (Python)
```bash
git clone https://github.com/swe-students-fall2025/5-final-bytepilot.git
cd 5-final-bytepilot
python -m venv .venv && source .venv/bin/activate   # on Windows: .venv\Scripts\activate
python -m pip install -r web_app/requirements.txt
# Ensure MongoDB is reachable (Atlas URI in .env, or start a local container per below)
python web_app/app.py   # or: flask --app web_app.app run --port 5001
```
Open http://localhost:5001 and register your first user. Data is stored in the configured MongoDB database; no seed data is required.

### Optional: run MongoDB locally with Docker
```bash
docker run -d --name forum-mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=forum_user \
  -e MONGO_INITDB_ROOT_PASSWORD=forum_pass \
  -e MONGO_INITDB_DATABASE=forum_db \
  mongo:7.0 --auth
```
Use `MONGO_URI=mongodb://forum_user:forum_pass@localhost:27017/forum_db?authSource=admin` for local Python runs. If you connect from inside a Docker container, use `mongo` as the host when both containers share a network, or `host.docker.internal`/`172.17.0.1` when targeting the host port.

## Run with Docker / Compose
```bash
# 1) Build and start the web app container (uses .env for settings)
docker compose up --build

# 2) Provide MongoDB:
#    - Atlas: set MONGO_URI in .env to your cluster URI.
#    - Local container: start mongo as shown above and set MONGO_URI to point to it.
```
By default the web app is served on http://localhost:5001. The `docker-compose.yml` uses the `.env` file at the repo root for configuration.

## Tests and coverage
```bash
cd web_app
python -m pip install -r requirements.txt
export SECRET_KEY=test-secret-key-for-ci  # required for Flask-Login session
pytest --cov=app --cov-report=term-missing
```
The suite targets 80%+ coverage and mirrors what runs in CI.

## CI/CD and deployment
- **PR CI (`ci.yml`)**: runs tests on every pull request.  
- **Web App CI/CD (`web-app-cicd.yml`)**: on push to `main`/`master`, runs tests, builds/pushes the Docker image to Docker Hub, and deploys to a DigitalOcean droplet via SSH.  
- **Event logger (`event-logger.yml`)**: optional workflow that records repo events when `COMMIT_LOG_API` is configured.

Deployment secrets expected in GitHub Actions:
```
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
DO_DROPLET_HOST
DO_DROPLET_USER
DO_SSH_PRIVATE_KEY
WEB_APP_ENV_FILE   # contents of the .env used on the droplet
COMMIT_LOG_API     # optional, for event-logger workflow
```

## Team
- [May Zhou](https://github.com/zz4206)
- [Morin Zhou](https://github.com/Morinzzz)
- [Jasmine Zhu](https://github.com/jasminezjr)
- [Esther Feng](https://github.com/yf2685-beep)
- [Eason Huang](https://github.com/GILGAMESH605)
