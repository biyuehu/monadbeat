# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    GHC_BINARY=ghc

# Install GHC and system dependencies for Haskell typechecking and healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghc \
    libgmp-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv from official binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Create a non-root user for executing untrusted GHC checks safely
RUN useradd -m -u 1000 monadbeat

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source and scripts
COPY app ./app
COPY scripts ./scripts

# Final sync to install project package
RUN uv sync --frozen --no-dev

# Give monadbeat user ownership of /app
RUN chown -R monadbeat:monadbeat /app

USER monadbeat

# Add virtualenv to PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
