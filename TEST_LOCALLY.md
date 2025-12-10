# Testing Locally Before CI/CD

## Run Tests Locally

```bash
cd web_app
python -m pip install -r requirements.txt
export SECRET_KEY=test-secret-key-for-ci
pytest --cov=app --cov-report=term-missing
```

## Test Docker Build Locally

```bash
cd web_app
docker build -t forum-generator-web:test .
docker run -p 5001:5001 forum-generator-web:test
```

## Common CI/CD Issues

1. **Tests failing**: Check if tests pass locally first
2. **Docker secrets missing**: 
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Ensure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are set
3. **Docker build failing**: Test the Dockerfile locally
