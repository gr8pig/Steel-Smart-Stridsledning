FROM python:3.12-slim

# Set environment variables for better Python behavior
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Work from root so 'api' folder acts as a package
WORKDIR /

# Create a non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files from context into /api folder
COPY . /api/

# Ensure ownership
RUN chown -R appuser:appgroup /api

USER appuser

# Cloud Run sets PORT environment variable (default 8080)
EXPOSE 8080

# Run uvicorn pointing to the api package's main module
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
