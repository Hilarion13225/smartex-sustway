FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import httpx, os; httpx.get(f'http://localhost:{os.environ.get(\"PORT\", 8000)}/health').raise_for_status()"

# $PORT : certains hébergeurs (Render...) imposent leur propre port d'écoute
# via cette variable — repli sur 8000 (valeur docker-compose locale) si absente.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
