# GCP Stockholm Deployment Scaffold

This scaffold is for deploying the Angular SSR app to **Google Cloud Run in `europe-north2`**.
`europe-north2` is the Stockholm region, so the service stays on Swedish infrastructure.

## What This Deploys

- One container running the SSR Node server from this repo
- Same-origin `/api/*` and `/ws/theater` endpoints
- A single Cloud Run instance by default

## Why One Instance

The app keeps simulation state in memory and uses WebSockets.
That works best with:

- `min-instances=0` for the cheapest idle cost
- `max-instances=1` to keep the theater state on one node
- `concurrency=20` so chunk loads and route navigation do not trip 429s
- request-based billing, which keeps idle cost near zero

That keeps the service predictable, avoids multi-instance state drift, and removes most idle spend.

If you want a warm instance for lower cold-start latency, override `MIN_INSTANCES=1` at deploy time.

## Files

- [`Dockerfile`](../../Dockerfile)
- [`deploy.sh`](./deploy.sh)

## Prerequisites

- `gcloud` authenticated and pointing at the right project
- A billing-enabled GCP project
- Cloud Run and Artifact Registry access in the project

## Deploy

```bash
cd Steel-Smart-Stridsledning
chmod +x deploy/gcp/deploy.sh
PROJECT_ID=your-project-id deploy/gcp/deploy.sh
```

If `PROJECT_ID` is already set in your local `gcloud` config, you can omit it.

## Optional Runtime Secrets

The app can use `OPENROUTER_API_KEY` for live rationale generation and `RUNPOD_API_KEY` for lab inference.
For production, add those through Secret Manager or Cloud Run secret bindings rather than baking them into the image.

`RUNPOD_ENDPOINT_ID` is the Runpod serverless endpoint identifier. It is configuration, not a secret, but it still belongs in the deployed environment so `/api/lab/run` can reach the remote worker.

`OPENROUTER_MODEL` can be set to override the default rationale model if you want to swap providers without changing code.

The lock page uses `APP_LOCK_PASSWORD`. The server falls back to the built-in password in the app, but you can override it at deploy time by setting the environment variable explicitly.
`APP_LOCK_TOKEN_TTL_SECONDS` controls how long the lock cookie remains valid.

Local `.env` files are fine for development. For Cloud Run, prefer Secret Manager bindings for the keys and normal env vars for the non-secret config.

## Notes

- Cloud Run supports WebSockets.
- The service listens on `PORT=8080` in the container.
- If you later want a second backend service for `api/`, we can scaffold that separately.
