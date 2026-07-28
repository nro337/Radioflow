FROM python:3.10-slim-bookworm

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		curl \
		libxcb1 \
		libgl1 \
		libglib2.0-0 \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --frozen --no-dev

COPY app/ ./app/
COPY ml/ ./ml/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=15s --retries=3 CMD curl -f http://localhost:8000/health || exit 1

CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]