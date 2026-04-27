FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps for scikit-learn / numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full api package so the worker can import from api.ml.*
COPY . /app/api/

# Pre-train the RF models at build time so cold start is fast
RUN python -c "from api.ml.random_forest_model import train_or_load; train_or_load()"

# RunPod serverless entrypoint
CMD ["python", "/app/api/ml/worker/handler.py"]
