# Frontend build stage
FROM node:20-slim AS frontend-build
WORKDIR /app/ui
COPY src/ui/package*.json ./
RUN npm ci
COPY src/ui/ ./
RUN npm run build

# Backend + serve static frontend
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ /app/src/
COPY --from=frontend-build /app/ui/dist /app/src/ui/dist

ENV PYTHONPATH=/app/src
ENV PORT=8000

CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8000"]
